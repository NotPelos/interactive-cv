/** @jsxImportSource preact */
import { useReducer, useEffect, useRef, useCallback } from "preact/hooks";
import type { Line, TokyoColor, SkillsData, Lang, Endpoints } from "../lib/commands/types.js";
import { commandRegistry } from "../lib/commands/index.js";
import { parseCommand } from "../lib/parser.js";
import { seedFs } from "../lib/fs/seed.js";
import type { FsNode } from "../lib/fs/index.js";
import { formatPath, resolvePath, getNode, HOME_SEGMENTS } from "../lib/fs/index.js";
import { makeT } from "../lib/i18n/t.js";
import { detectLang, LANG_STORAGE_KEY } from "../lib/i18n/detect.js";

// ---------------------------------------------------------------------------
// Validated repo shape from Worker response
// ---------------------------------------------------------------------------

interface RepoItem {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  topics: string[];
}

function isRepoItem(v: unknown): v is RepoItem {
  if (!v || typeof v !== "object") return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r["name"] === "string" &&
    (r["description"] === null || typeof r["description"] === "string") &&
    typeof r["html_url"] === "string" &&
    (r["language"] === null || typeof r["language"] === "string") &&
    typeof r["stargazers_count"] === "number" &&
    typeof r["forks_count"] === "number" &&
    typeof r["updated_at"] === "string" &&
    Array.isArray(r["topics"])
  );
}

function parseRepos(raw: unknown): RepoItem[] | null {
  if (!Array.isArray(raw)) return null;
  if (!raw.every(isRepoItem)) return null;
  return raw as RepoItem[];
}

// ---------------------------------------------------------------------------
// State & reducer
// ---------------------------------------------------------------------------

interface TerminalState {
  output: Line[];
  cwd: string[];
  prevCwd: string[] | null;
  history: string[];
  historyIndex: number;
  input: string;
  lang: Lang;
  fs: Record<string, FsNode>;
  // Pending navigation URL set by the reducer; consumed by a useEffect.
  // Keeps the reducer pure (no setTimeout inside).
  pendingNavigation: string | null;
  // Pending fetch — blocks input while a fetch is in progress.
  pendingFetch: "pdf" | "repos" | null;
  // Pending fetch payload consumed by useEffect — cleared after consumption.
  pendingFetchPayload:
    | { kind: "pdf"; url: string; fallbackUrl: string; filename: string }
    | { kind: "repos"; url: string }
    | null;
}

type Action =
  | { type: "SET_INPUT"; value: string }
  | { type: "EXECUTE"; input: string; fsByLang: Record<Lang, Record<string, FsNode>>; skillsData?: SkillsData; endpoints: Endpoints }
  | { type: "HISTORY_UP" }
  | { type: "HISTORY_DOWN" }
  | { type: "CLEAR" }
  | { type: "CTRL_C" }
  | { type: "APPEND_LINES"; lines: Line[] }
  | { type: "SET_LANG"; lang: Lang }
  | { type: "FETCH_DONE" }
  | { type: "INJECT_FS_NODE"; path: string[]; name: string; content: () => string };

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
  defaultLang: Lang;
  initialFs: Record<string, FsNode>;
}

function makeInitialState({ defaultLang, initialFs }: InitialProps): TerminalState {
  return {
    output: WELCOME_LINES,
    cwd: INITIAL_CWD,
    prevCwd: null,
    history: [],
    historyIndex: -1,
    input: "",
    lang: defaultLang,
    fs: initialFs,
    pendingNavigation: null,
    pendingFetch: null,
    pendingFetchPayload: null,
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

// Deep-clone only the path to the target directory in the FS tree (immutable update).
function injectFsNode(
  root: Record<string, FsNode>,
  pathSegments: string[],
  name: string,
  content: () => string
): Record<string, FsNode> {
  // Clone the root one level at a time along the path.
  function cloneDir(
    children: Record<string, FsNode>,
    remaining: string[]
  ): Record<string, FsNode> {
    if (remaining.length === 0) {
      // Inject file here
      return {
        ...children,
        [name]: { type: "file", name, content } as FsNode,
      };
    }
    const seg = remaining[0]!;
    const rest = remaining.slice(1);
    // eslint-disable-next-line security/detect-object-injection
    const existing = children[seg];
    if (existing && existing.type === "directory") {
      return {
        ...children,
        [seg]: { ...existing, children: cloneDir(existing.children, rest) },
      };
    }
    // Directory doesn't exist — create it on-the-fly
    return {
      ...children,
      [seg]: {
        type: "directory",
        name: seg,
        children: cloneDir({}, rest),
      } as FsNode,
    };
  }

  return cloneDir(root, pathSegments);
}

function reducer(
  state: TerminalState,
  action: Action
): TerminalState {
  switch (action.type) {
    case "SET_INPUT":
      return { ...state, input: action.value, historyIndex: -1, pendingNavigation: null };

    case "SET_LANG":
      return { ...state, lang: action.lang };

    case "FETCH_DONE":
      return { ...state, pendingFetch: null, pendingFetchPayload: null };

    case "INJECT_FS_NODE": {
      const newFs = injectFsNode(state.fs, action.path, action.name, action.content);
      return { ...state, fs: newFs };
    }

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
        pendingFetch: null,
        pendingFetchPayload: null,
      };
    }

    case "CLEAR":
      return { ...state, output: [] };

    case "APPEND_LINES":
      return { ...state, output: [...state.output, ...action.lines] };

    case "EXECUTE": {
      const raw = action.input.trim();
      const promptLine = buildPromptLine(state.cwd, raw);
      // Use the mutable fs from state (may have injected nodes from fetchRepos)
      const activeFs = state.fs;

      if (raw === "") {
        return {
          ...state,
          output: [...state.output, promptLine],
          input: "",
          historyIndex: -1,
        };
      }

      const lastEntry = state.history[state.history.length - 1];
      const newHistory =
        lastEntry === raw ? state.history : [...state.history, raw];

      const parsed = parseCommand(raw);
      if (!parsed.ok) {
        const tFn = makeT(state.lang);
        const syntaxErrLine: Line = {
          kind: "error",
          segments: [
            {
              text: tFn("syntaxError", { detail: parsed.error }),
              color: "tn-red",
            },
          ],
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
        const tFn = makeT(state.lang);
        const notFoundLines: Line[] = [
          {
            kind: "error",
            segments: [
              { text: tFn("cmdNotFound", { cmd }), color: "tn-red" },
              { text: "help", color: "tn-yellow" },
              { text: tFn("cmdNotFoundHint"), color: "tn-red" },
            ],
          },
        ];
        return {
          ...state,
          output: [...state.output, promptLine, ...notFoundLines],
          history: newHistory,
          input: "",
          historyIndex: -1,
        };
      }

      const tFn = makeT(state.lang);
      const ctx = {
        cwd: state.cwd,
        prevCwd: state.prevCwd,
        history: newHistory,
        fs: activeFs,
        skillsData: action.skillsData,
        lang: state.lang,
        t: tFn,
        endpoints: action.endpoints,
      };

      const result = command.run(args, ctx);

      if (result.effect === "clear") {
        return {
          ...state,
          output: [],
          cwd: result.newCwd ?? state.cwd,
          prevCwd: result.newPrevCwd ?? state.prevCwd,
          history: newHistory,
          input: "",
          historyIndex: -1,
          pendingNavigation: null,
        };
      }

      if (result.effect === "navigate") {
        const { url } = result;
        return {
          ...state,
          output: [...state.output, promptLine, ...result.lines],
          history: newHistory,
          input: "",
          historyIndex: -1,
          pendingNavigation: url,
        };
      }

      if (result.effect === "setLang") {
        return {
          ...state,
          output: [...state.output, promptLine, ...result.lines],
          lang: result.lang,
          history: newHistory,
          input: "",
          historyIndex: -1,
          pendingNavigation: null,
        };
      }

      if (result.effect === "downloadPdf") {
        return {
          ...state,
          output: [...state.output, promptLine, ...result.lines],
          history: newHistory,
          input: "",
          historyIndex: -1,
          pendingNavigation: null,
          pendingFetch: "pdf",
          pendingFetchPayload: {
            kind: "pdf",
            url: result.url,
            fallbackUrl: result.fallbackUrl,
            filename: result.filename,
          },
        };
      }

      if (result.effect === "fetchRepos") {
        return {
          ...state,
          output: [...state.output, promptLine, ...result.lines],
          history: newHistory,
          input: "",
          historyIndex: -1,
          pendingNavigation: null,
          pendingFetch: "repos",
          pendingFetchPayload: {
            kind: "repos",
            url: result.url,
          },
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
        pendingNavigation: null,
      };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Tab completion
// ---------------------------------------------------------------------------

function getCompletions(
  input: string,
  cwd: string[],
  fs: Record<string, FsNode>
): string[] {
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
// Helpers for async effects
// ---------------------------------------------------------------------------

// Trigger a file download from a Blob without innerHTML.
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  // Cleanup after browser has queued the download
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

// ---------------------------------------------------------------------------
// Main Terminal component
// ---------------------------------------------------------------------------

interface TerminalProps {
  initialFsByLang?: Record<Lang, Record<string, FsNode>>;
  skillsData?: SkillsData;
  defaultLang?: Lang;
  // External service endpoints. Empty strings = degraded mode (use fallbacks).
  endpoints?: Endpoints;
}

// Module-scoped fallback — avoids recreating the object on every render
const FALLBACK_FS_BY_LANG: Record<Lang, Record<string, FsNode>> = {
  es: seedFs,
  en: seedFs,
};

const FALLBACK_ENDPOINTS: Endpoints = { api: "", worker: "" };

export default function Terminal({
  initialFsByLang,
  skillsData,
  defaultLang = "es",
  endpoints = FALLBACK_ENDPOINTS,
}: TerminalProps = {}) {
  const fsByLang = initialFsByLang ?? FALLBACK_FS_BY_LANG;

  // Use the lang-specific FS as initial state so that fs in state stays mutable
  // (INJECT_FS_NODE will clone and update it without touching fsByLang).
  const [state, dispatch] = useReducer(
    reducer,
    // defaultLang is typed as Lang ("es"|"en"), not user-controlled input
    // eslint-disable-next-line security/detect-object-injection
    { defaultLang, initialFs: fsByLang[defaultLang] },
    makeInitialState
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstScrollRef = useRef<boolean>(true);

  const isInitialMount = useRef(true);

  // Combina detección inicial y persistencia.
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      const detected = detectLang(defaultLang);
      if (detected !== state.lang) dispatch({ type: "SET_LANG", lang: detected });
      document.documentElement.lang = detected;
      return;
    }
    localStorage.setItem(LANG_STORAGE_KEY, state.lang);
    document.documentElement.lang = state.lang;
  }, [state.lang]); // defaultLang is stable — no need in deps

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const behavior = isFirstScrollRef.current ? "auto" : "smooth";
    isFirstScrollRef.current = false;
    bottomRef.current?.scrollIntoView({ behavior });
  }, [state.output]);

  // Consumes pendingNavigation — keeps the reducer pure.
  useEffect(() => {
    const url = state.pendingNavigation;
    if (!url) return;
    if (!url.startsWith("/")) return;

    const timer = setTimeout(() => {
      window.location.href = url;
    }, 400);

    return () => clearTimeout(timer);
  }, [state.pendingNavigation]);

  // Handles downloadPdf effect — fetch from API, fall back to static PDF.
  useEffect(() => {
    const payload = state.pendingFetchPayload;
    if (!payload || payload.kind !== "pdf") return;

    const { url, fallbackUrl, filename } = payload;

    const controller = new AbortController();
    // Wire AbortController to a 5s timeout. The controller's signal is passed to
    // fetch() so cleanup() actually cancels the in-flight request on unmount.
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    async function run(): Promise<void> {
      // Degraded mode: URL missing or not parseable — go straight to fallback.
      // URL.canParse is the standards-compliant way to validate a URL; the old
      // !url.startsWith("http") heuristic was fragile (e.g. https vs http).
      if (!url || !URL.canParse(url)) {
        dispatch({
          type: "APPEND_LINES",
          lines: [
            {
              kind: "plain",
              segments: [
                { text: "→ API not configured — opening static PDF…", color: "tn-yellow" },
              ],
            },
          ],
        });
        window.open(fallbackUrl, "_blank");
        dispatch({ type: "FETCH_DONE" });
        return;
      }

      try {
        const response = await fetch(url, { signal: controller.signal });
        if (
          response.ok &&
          response.headers.get("Content-Type")?.includes("application/pdf")
        ) {
          const blob = await response.blob();
          triggerDownload(blob, filename);
        } else {
          throw new Error("non-pdf response");
        }
      } catch {
        dispatch({
          type: "APPEND_LINES",
          lines: [
            {
              kind: "plain",
              segments: [
                {
                  text:
                    state.lang === "en"
                      ? "→ API not responding, falling back to static PDF…"
                      : "→ API sin respuesta, usando PDF estático…",
                  color: "tn-yellow",
                },
              ],
            },
          ],
        });
        window.open(fallbackUrl, "_blank");
      } finally {
        clearTimeout(timeoutId);
        dispatch({ type: "FETCH_DONE" });
      }
    }

    void run();
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [state.pendingFetchPayload]); // state.lang captured via closure at effect run time — intentional

  // Handles fetchRepos effect — fetch from Worker, format and inject into FS.
  useEffect(() => {
    const payload = state.pendingFetchPayload;
    if (!payload || payload.kind !== "repos") return;

    const { url } = payload;
    const lang = state.lang;

    const controller = new AbortController();
    // Wire AbortController to a 5s timeout so cleanup() cancels the in-flight
    // request on unmount and does not dispatch to a dead component.
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    async function run(): Promise<void> {
      // Degraded mode: URL missing or not parseable — report and bail out.
      // URL.canParse is the standards-compliant validator; replaces the fragile
      // !url.startsWith("http") heuristic.
      if (!url || !URL.canParse(url)) {
        dispatch({
          type: "APPEND_LINES",
          lines: [
            {
              kind: "plain",
              segments: [
                {
                  text:
                    lang === "en"
                      ? "repos: worker unreachable (degraded mode)"
                      : "repos: worker no disponible (modo degradado)",
                  color: "tn-red",
                },
              ],
            },
          ],
        });
        dispatch({ type: "FETCH_DONE" });
        return;
      }

      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const raw: unknown = await response.json();
        const repos = parseRepos(raw);

        if (!repos) throw new Error("unexpected shape");

        const repoLines: Line[] = repos.map((repo) => ({
          kind: "plain" as const,
          segments: [
            { text: repo.name, color: "tn-blue" as const },
            { text: " ★" + String(repo.stargazers_count), color: "tn-yellow" as const },
            { text: " · ", color: "tn-text-dim" as const },
            { text: repo.language ?? "—", color: "tn-cyan" as const },
            { text: " · ", color: "tn-text-dim" as const },
            { text: repo.description ?? "", color: "tn-text" as const },
          ],
        }));

        dispatch({ type: "APPEND_LINES", lines: repoLines });

        // Inject fetched data into /var/log/github/repos.json
        const jsonContent = JSON.stringify(repos, null, 2);
        dispatch({
          type: "INJECT_FS_NODE",
          path: ["var", "log", "github"],
          name: "repos.json",
          content: () => jsonContent,
        });
      } catch {
        dispatch({
          type: "APPEND_LINES",
          lines: [
            {
              kind: "plain",
              segments: [
                {
                  text:
                    lang === "en"
                      ? "repos: worker unreachable (degraded mode)"
                      : "repos: worker no disponible (modo degradado)",
                  color: "tn-red",
                },
              ],
            },
          ],
        });
      } finally {
        clearTimeout(timeoutId);
        dispatch({ type: "FETCH_DONE" });
      }
    }

    void run();
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [state.pendingFetchPayload]); // lang captured via closure — intentional

  const isNavigating = state.pendingNavigation !== null;
  const isFetching = state.pendingFetch !== null;
  const isBlocked = isNavigating || isFetching;

  const handleContainerClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const activeFs = state.fs;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        dispatch({ type: "CLEAR" });
        return;
      }

      if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && e.key.toLowerCase() === "c") {
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
        const completions = getCompletions(state.input, state.cwd, activeFs);
        if (completions.length === 1) {
          const parts = state.input.trimStart().split(/\s+/);
          if (parts.length <= 1) {
            const completed = (completions[0] ?? "") + " ";
            dispatch({ type: "SET_INPUT", value: completed });
          } else {
            const completion = completions[0] ?? "";
            parts[parts.length - 1] = completion;
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
        if (isBlocked) return;
        dispatch({ type: "EXECUTE", input: state.input, fsByLang, skillsData, endpoints });
        return;
      }
    },
    [state.input, state.cwd, activeFs, fsByLang, skillsData, isBlocked, endpoints]
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

      {/* Hidden input — real keyboard target, invisible. Disabled during navigation or fetch. */}
      <input
        ref={inputRef}
        type="text"
        value={state.input}
        onInput={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={isBlocked}
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
