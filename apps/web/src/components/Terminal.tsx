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
import { readSoundStorage } from "../lib/commands/sound.js";
import MatrixRain from "./MatrixRain.js";

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
  pendingNavigation: string | null;
  // Pending fetch — blocks input while a fetch is in progress.
  pendingFetch: "pdf" | "repos" | null;
  // Pending fetch payload consumed by useEffect — cleared after consumption.
  pendingFetchPayload:
    | { kind: "pdf"; url: string; fallbackUrl: string; filename: string }
    | { kind: "repos"; url: string }
    | null;
  // Sound toggle
  soundEnabled: boolean;
  // Matrix rain overlay
  matrixActive: boolean;
}

type Action =
  | { type: "SET_INPUT"; value: string }
  | { type: "EXECUTE"; input: string; fsByLang: Record<Lang, Record<string, FsNode>>; skillsData?: SkillsData; endpoints: Endpoints; userAgent?: string }
  | { type: "HISTORY_UP" }
  | { type: "HISTORY_DOWN" }
  | { type: "CLEAR" }
  | { type: "CTRL_C" }
  | { type: "APPEND_LINES"; lines: Line[] }
  | { type: "SET_LANG"; lang: Lang }
  | { type: "SET_SOUND"; enabled: boolean }
  | { type: "FETCH_DONE" }
  | { type: "INJECT_FS_NODE"; path: string[]; name: string; content: () => string }
  | { type: "START_MATRIX" }
  | { type: "STOP_MATRIX" };

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
  initialSoundEnabled: boolean;
}

function makeInitialState({ defaultLang, initialFs, initialSoundEnabled }: InitialProps): TerminalState {
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
    soundEnabled: initialSoundEnabled,
    matrixActive: false,
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
  function cloneDir(
    children: Record<string, FsNode>,
    remaining: string[]
  ): Record<string, FsNode> {
    if (remaining.length === 0) {
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

    case "SET_SOUND":
      return { ...state, soundEnabled: action.enabled };

    case "START_MATRIX":
      return { ...state, matrixActive: true };

    case "STOP_MATRIX":
      return { ...state, matrixActive: false };

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
        userAgent: action.userAgent,
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

      if (result.effect === "setSound") {
        return {
          ...state,
          output: [...state.output, promptLine, ...result.lines],
          soundEnabled: result.soundEnabled,
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
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 200);
}

// ---------------------------------------------------------------------------
// Web Audio API — keystroke click (lazy initialised on first gesture)
// ---------------------------------------------------------------------------

// Safari < 14.1 only exposes webkitAudioContext. Returns null when unavailable.
function createAudioContext(): AudioContext | null {
  try {
    const Ctx =
      window.AudioContext ??
      (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    return Ctx ? new Ctx() : null;
  } catch {
    return null;
  }
}

function playTypeClick(audioCtx: AudioContext): void {
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g);
  g.connect(audioCtx.destination);
  o.type = "square";
  o.frequency.value = 800 + Math.random() * 200;
  g.gain.value = 0.02;
  o.start();
  o.stop(audioCtx.currentTime + 0.015);
}

// ---------------------------------------------------------------------------
// Konami sequence
// ---------------------------------------------------------------------------

const KONAMI: string[] = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

// ---------------------------------------------------------------------------
// Main Terminal component
// ---------------------------------------------------------------------------

interface TerminalProps {
  initialFsByLang?: Record<Lang, Record<string, FsNode>>;
  skillsData?: SkillsData;
  defaultLang?: Lang;
  endpoints?: Endpoints;
}

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

  const [state, dispatch] = useReducer(
    reducer,
    // defaultLang is typed as Lang ("es"|"en"), not user-controlled input
    // eslint-disable-next-line security/detect-object-injection
    { defaultLang, initialFs: fsByLang[defaultLang], initialSoundEnabled: false },
    makeInitialState
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isFirstScrollRef = useRef<boolean>(true);
  const isInitialMount = useRef(true);

  // Lazy AudioContext ref — only created after first user gesture.
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Close AudioContext on unmount to release Web Audio resources.
  useEffect(() => () => { audioCtxRef.current?.close(); }, []);

  // Konami buffer — last 10 keys
  const konamiBufferRef = useRef<string[]>([]);

  // Read sound preference from localStorage on mount.
  useEffect(() => {
    const stored = readSoundStorage();
    dispatch({ type: "SET_SOUND", enabled: stored === "on" });
  }, []);

  // Lang detection + persistence
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
  }, [state.lang]); // defaultLang is stable

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const behavior = isFirstScrollRef.current ? "auto" : "smooth";
    isFirstScrollRef.current = false;
    bottomRef.current?.scrollIntoView({ behavior });
  }, [state.output]);

  // Konami code detector — window-level keydown listener.
  // Only the exact keys that form the Konami sequence are accumulated.
  // This avoids incidental capture of unrelated keypresses.
  useEffect(() => {
    const KONAMI_KEYS = new Set([
      "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
      "b", "B", "a", "A",
    ]);

    function handleWindowKeyDown(e: KeyboardEvent): void {
      // Do not re-trigger matrix while one is already active.
      if (state.matrixActive) return;
      // Ignore any key not part of the Konami sequence — defence in depth.
      if (!KONAMI_KEYS.has(e.key)) return;

      const buf = konamiBufferRef.current;
      buf.push(e.key);
      if (buf.length > KONAMI.length) buf.shift();

      if (
        buf.length === KONAMI.length &&
        // i is a clamped numeric index, not user-controlled input
        // eslint-disable-next-line security/detect-object-injection
        buf.every((k, i) => k === KONAMI[i])
      ) {
        konamiBufferRef.current = [];
        dispatch({ type: "START_MATRIX" });
      }
    }

    window.addEventListener("keydown", handleWindowKeyDown);
    return () => window.removeEventListener("keydown", handleWindowKeyDown);
  }, [state.matrixActive]);

  // Stop Matrix after 10 seconds
  useEffect(() => {
    if (!state.matrixActive) return;
    const timer = setTimeout(() => {
      dispatch({ type: "STOP_MATRIX" });
    }, 10_000);
    return () => clearTimeout(timer);
  }, [state.matrixActive]);

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

  // Handles downloadPdf effect
  useEffect(() => {
    const payload = state.pendingFetchPayload;
    if (!payload || payload.kind !== "pdf") return;

    const { url, fallbackUrl, filename } = payload;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    async function run(): Promise<void> {
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
  }, [state.pendingFetchPayload]); // state.lang captured via closure — intentional

  // Handles fetchRepos effect
  useEffect(() => {
    const payload = state.pendingFetchPayload;
    if (!payload || payload.kind !== "repos") return;

    const { url } = payload;
    const lang = state.lang;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    async function run(): Promise<void> {
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
      // Web Audio click — lazy AudioContext creation on first gesture.
      if (state.soundEnabled) {
        if (!audioCtxRef.current) {
          audioCtxRef.current = createAudioContext();
        }
        const ctx = audioCtxRef.current;
        // Only play for printable characters and backspace — skip modifiers.
        const isPrintable =
          e.key.length === 1 || e.key === "Backspace" || e.key === "Delete";
        if (ctx && isPrintable && !e.ctrlKey && !e.metaKey) {
          playTypeClick(ctx);
        }
      }

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
        dispatch({
          type: "EXECUTE",
          input: state.input,
          fsByLang,
          skillsData,
          endpoints,
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        });
        return;
      }
    },
    [state.input, state.cwd, activeFs, fsByLang, skillsData, isBlocked, endpoints, state.soundEnabled]
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
      {/* Matrix rain overlay */}
      {state.matrixActive && <MatrixRain />}

      {/* Output history — role="log" + aria-live para lectores de pantalla */}
      <div class="pb-2" role="log" aria-live="polite" aria-atomic="false">
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
