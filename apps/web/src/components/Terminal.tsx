/** @jsxImportSource preact */
import { useReducer, useEffect, useRef, useCallback } from "preact/hooks";
import type { Line, TokyoColor, SkillsData } from "../lib/commands/types.js";
import { commandRegistry } from "../lib/commands/index.js";
import { parseCommand } from "../lib/parser.js";
import { seedFs } from "../lib/fs/seed.js";
import type { FsNode } from "../lib/fs/index.js";
import { formatPath, resolvePath, getNode, HOME_SEGMENTS } from "../lib/fs/index.js";

// ---------------------------------------------------------------------------
// State & reducer
// ---------------------------------------------------------------------------

interface TerminalState {
  output: Line[];
  cwd: string[];
  prevCwd: string[] | null;  // null = no OLDPWD yet (fix 7)
  history: string[];
  historyIndex: number; // -1 = not navigating history
  input: string;
  fs: Record<string, FsNode>;
  skillsData?: SkillsData;
}

type Action =
  | { type: "SET_INPUT"; value: string }
  | { type: "EXECUTE"; input: string }
  | { type: "HISTORY_UP" }
  | { type: "HISTORY_DOWN" }
  | { type: "CLEAR" }
  | { type: "CTRL_C" }
  | { type: "APPEND_LINES"; lines: Line[] };

const INITIAL_CWD = [...HOME_SEGMENTS];

const WELCOME_LINES: Line[] = [
  {
    kind: "plain",
    segments: [{ text: "╔════════════════════════════════════════════════════════════╗", color: "tn-blue" }],
  },
  {
    kind: "plain",
    segments: [{ text: "║  Bienvenido. Escribe `help` si no sabes qué hacer.         ║", color: "tn-blue" }],
  },
  {
    kind: "plain",
    segments: [{ text: "║  Welcome. Type `help` if you don't know what to do.        ║", color: "tn-blue" }],
  },
  {
    kind: "plain",
    segments: [{ text: "╚════════════════════════════════════════════════════════════╝", color: "tn-blue" }],
  },
  { kind: "plain", segments: [{ text: "" }] },
];

interface InitialProps {
  fs: Record<string, FsNode>;
  skillsData?: SkillsData;
}

function makeInitialState({ fs, skillsData }: InitialProps): TerminalState {
  return {
    output: WELCOME_LINES,
    cwd: INITIAL_CWD,
    prevCwd: null,  // no OLDPWD until first successful cd (fix 7)
    history: [],
    historyIndex: -1,
    input: "",
    fs,
    skillsData,
  };
}

function buildPromptLine(cwd: string[], userInput: string): Line {
  const cwdDisplay = formatPath(cwd);
  return {
    kind: "prompt",
    segments: [
      { text: "notpelos@cv", color: "tn-blue" },
      { text: ":", color: "tn-text" },
      { text: cwdDisplay, color: "tn-magenta" },
      { text: "$ ", color: "tn-text" },
      { text: userInput, color: "tn-green" },
    ],
  };
}

function reducer(state: TerminalState, action: Action): TerminalState {
  switch (action.type) {
    case "SET_INPUT":
      return { ...state, input: action.value, historyIndex: -1 };

    case "HISTORY_UP": {
      if (state.history.length === 0) return state;
      const newIndex =
        state.historyIndex === -1
          ? state.history.length - 1
          : Math.max(0, state.historyIndex - 1);
      return {
        ...state,
        historyIndex: newIndex,
        // newIndex is a clamped integer, not user-controlled input
        // eslint-disable-next-line security/detect-object-injection
        input: state.history[newIndex] ?? "",
      };
    }

    case "HISTORY_DOWN": {
      if (state.historyIndex === -1) return state;
      const newIndex = state.historyIndex + 1;
      if (newIndex >= state.history.length) {
        return { ...state, historyIndex: -1, input: "" };
      }
      return {
        ...state,
        historyIndex: newIndex,
        // newIndex is a clamped integer, not user-controlled input
        // eslint-disable-next-line security/detect-object-injection
        input: state.history[newIndex] ?? "",
      };
    }

    case "CTRL_C": {
      const promptLine = buildPromptLine(state.cwd, state.input);
      const cancelLine: Line = {
        kind: "plain",
        segments: [{ text: "^C", color: "tn-text-dim" }],
      };
      return {
        ...state,
        output: [...state.output, promptLine, cancelLine],
        input: "",
        historyIndex: -1,
      };
    }

    case "CLEAR":
      return { ...state, output: [] };

    case "APPEND_LINES":
      return { ...state, output: [...state.output, ...action.lines] };

    case "EXECUTE": {
      const raw = action.input.trim();
      const promptLine = buildPromptLine(state.cwd, raw);

      if (raw === "") {
        return {
          ...state,
          output: [...state.output, promptLine],
          input: "",
          historyIndex: -1,
        };
      }

      // Append to history (skip consecutive duplicates)
      const lastEntry = state.history[state.history.length - 1];
      const newHistory =
        lastEntry === raw ? state.history : [...state.history, raw];

      // Parse — handle unterminated quotes (fix 6)
      const parsed = parseCommand(raw);
      if (!parsed.ok) {
        const syntaxErrLine: Line = {
          kind: "error",
          segments: [{ text: `syntax error: ${parsed.error}`, color: "tn-red" }],
        };
        return {
          ...state,
          output: [...state.output, promptLine, syntaxErrLine],
          history: newHistory,
          input: "",
          historyIndex: -1,
        };
      }

      const { cmd, args } = parsed;
      const command = commandRegistry.get(cmd);

      if (!command) {
        const notFoundLine: Line = {
          kind: "error",
          segments: [
            { text: `${cmd}: comando no encontrado. Escribe `, color: "tn-red" },
            { text: "help", color: "tn-yellow" },
            { text: " para ver los disponibles.", color: "tn-red" },
          ],
        };
        return {
          ...state,
          output: [...state.output, promptLine, notFoundLine],
          history: newHistory,
          input: "",
          historyIndex: -1,
        };
      }

      const ctx = {
        cwd: state.cwd,
        prevCwd: state.prevCwd,
        history: newHistory,
        fs: state.fs,
        skillsData: state.skillsData,
      };

      const result = command.run(args, ctx);

      // effect: 'clear' replaces sentinel \x00CLEAR (fix 3)
      if (result.effect === "clear") {
        return {
          ...state,
          output: [],
          cwd: result.newCwd ?? state.cwd,
          prevCwd: result.newPrevCwd ?? state.prevCwd,
          history: newHistory,
          input: "",
          historyIndex: -1,
        };
      }

      return {
        ...state,
        output: [...state.output, promptLine, ...result.lines],
        cwd: result.newCwd ?? state.cwd,
        prevCwd: result.newPrevCwd ?? state.prevCwd,
        history: newHistory,
        input: "",
        historyIndex: -1,
      };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Tab completion
// ---------------------------------------------------------------------------

function getCompletions(input: string, cwd: string[], fs: Record<string, FsNode>): string[] {
  const trimmed = input.trimStart();
  const parts = trimmed.split(/\s+/);

  if (parts.length <= 1) {
    const prefix = parts[0] ?? "";
    return Array.from(commandRegistry.keys()).filter((k) =>
      k.startsWith(prefix)
    );
  }

  const partial = parts[parts.length - 1] ?? "";
  const lastSlash = partial.lastIndexOf("/");
  const dirPart = lastSlash >= 0 ? partial.slice(0, lastSlash + 1) : "";
  const filePart = lastSlash >= 0 ? partial.slice(lastSlash + 1) : partial;

  const dirSegments = dirPart
    ? resolvePath(dirPart.endsWith("/") ? dirPart : dirPart + "/", cwd)
    : [...cwd];

  if (!dirSegments) return [];

  const node = getNode(dirSegments, fs);
  if (!node || node.type !== "directory") return [];

  return Object.values(node.children)
    .filter(
      (child) => !child.name.startsWith(".") && child.name.startsWith(filePart)
    )
    .map(
      (child) =>
        dirPart + child.name + (child.type === "directory" ? "/" : "")
    );
}

// ---------------------------------------------------------------------------
// Color → Tailwind class mapping
// ---------------------------------------------------------------------------

const COLOR_CLASS: Record<TokyoColor, string> = {
  "tn-text": "text-tn-text",
  "tn-text-mute": "text-tn-text-mute",
  "tn-text-dim": "text-tn-text-dim",
  "tn-blue": "text-tn-blue",
  "tn-green": "text-tn-green",
  "tn-red": "text-tn-red",
  "tn-yellow": "text-tn-yellow",
  "tn-magenta": "text-tn-magenta",
  "tn-cyan": "text-tn-cyan",
  "tn-border": "text-tn-border",
};

function segmentClass(color: TokyoColor | undefined): string {
  if (!color) return "text-tn-text";
  // color is typed as TokyoColor (closed literal union), not user-controlled input
  // eslint-disable-next-line security/detect-object-injection
  return COLOR_CLASS[color] ?? "text-tn-text";
}

// ---------------------------------------------------------------------------
// Main Terminal component
// ---------------------------------------------------------------------------

interface TerminalProps {
  initialFs?: Record<string, FsNode>;
  skillsData?: SkillsData;
}

export default function Terminal({ initialFs, skillsData }: TerminalProps = {}) {
  const [state, dispatch] = useReducer(
    reducer,
    { fs: initialFs ?? seedFs, skillsData },
    makeInitialState
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // fix 9: first scroll uses "instant" to avoid jarring animation on mount
  const isFirstScrollRef = useRef<boolean>(true);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const behavior = isFirstScrollRef.current ? "auto" : "smooth";
    isFirstScrollRef.current = false;
    bottomRef.current?.scrollIntoView({ behavior });
  }, [state.output]);

  const handleContainerClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // fix 5: modifier guards — require exact ctrl combo (no shift/alt/meta)
      if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        dispatch({ type: "CLEAR" });
        return;
      }

      if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && e.key.toLowerCase() === "c") {
        // fix 4: allow native copy when user has text selected
        if ((window.getSelection()?.toString().length ?? 0) > 0) return;
        e.preventDefault();
        dispatch({ type: "CTRL_C" });
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        dispatch({ type: "HISTORY_UP" });
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        dispatch({ type: "HISTORY_DOWN" });
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        const completions = getCompletions(state.input, state.cwd, state.fs);
        if (completions.length === 1) {
          const parts = state.input.trimStart().split(/\s+/);
          if (parts.length <= 1) {
            // fix 8: completing a command (first word) → add trailing space
            const completed = (completions[0] ?? "") + " ";
            dispatch({ type: "SET_INPUT", value: completed });
          } else {
            const completion = completions[0] ?? "";
            parts[parts.length - 1] = completion;
            // fix 8: completing a file (not a dir) → add trailing space
            const completed = parts.join(" ") + (completion.endsWith("/") ? "" : " ");
            dispatch({ type: "SET_INPUT", value: completed });
          }
        } else if (completions.length > 1) {
          const listLine: Line = {
            kind: "plain",
            segments: [{ text: completions.join("  "), color: "tn-text-mute" }],
          };
          dispatch({ type: "APPEND_LINES", lines: [listLine] });
        }
        return;
      }

      if (e.key === "Enter") {
        dispatch({ type: "EXECUTE", input: state.input });
        return;
      }
    },
    [state.input, state.cwd]
  );

  const handleInputChange = useCallback((e: Event) => {
    const target = e.currentTarget as HTMLInputElement;
    dispatch({ type: "SET_INPUT", value: target.value });
  }, []);

  const cwdDisplay = formatPath(state.cwd);

  return (
    <div
      ref={containerRef}
      class="relative w-full min-h-screen bg-tn-bg font-mono text-[15px] leading-relaxed cursor-text select-text p-4 md:p-6"
      onClick={handleContainerClick}
    >
      {/* Output history */}
      <div class="pb-2">
        {state.output.map((line, i) => (
          <div key={i} class="leading-relaxed whitespace-pre-wrap break-words">
            {line.segments.map((seg, j) => (
              <span key={j} class={segmentClass(seg.color)}>
                {seg.text}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Current prompt line with blinking cursor */}
      <div class="flex items-baseline flex-wrap">
        <span class="text-tn-blue">notpelos@cv</span>
        <span class="text-tn-text">:</span>
        <span class="text-tn-magenta">{cwdDisplay}</span>
        <span class="text-tn-text">{"$ "}</span>
        <span class="text-tn-green whitespace-pre">{state.input}</span>
        <span class="text-tn-text animate-blink">{"█"}</span>
      </div>

      {/* Hidden input — real keyboard target, invisible */}
      <input
        ref={inputRef}
        type="text"
        value={state.input}
        onInput={handleInputChange}
        onKeyDown={handleKeyDown}
        class="absolute opacity-0 pointer-events-none w-px h-px"
        aria-label="Terminal input"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck={false}
      />

      {/* Scroll anchor */}
      <div ref={bottomRef} />
    </div>
  );
}
