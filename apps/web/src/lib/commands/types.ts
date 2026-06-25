import type { FsNode } from "../fs/index.js";

// ---------------------------------------------------------------------------
// Skills data shape — mirrors skills.json structure validated by Zod at build time
// ---------------------------------------------------------------------------

export interface SkillLevel {
  level: number;
  yearsApprox: number;
  note?: string;
}

export interface SkillsData {
  languages: Record<string, SkillLevel>;
  frameworks: Record<string, number>;
  infra: Record<string, number>;
  databases: Record<string, number>;
  methods: string[];
  soft: string[];
}

// Tokyo Night color tokens — only keys matching Tailwind tn-* classes
export type TokyoColor =
  | "tn-text"
  | "tn-text-mute"
  | "tn-text-dim"
  | "tn-blue"
  | "tn-green"
  | "tn-red"
  | "tn-yellow"
  | "tn-magenta"
  | "tn-cyan"
  | "tn-border";

export interface Segment {
  text: string;
  color?: TokyoColor;
}

export type LineKind = "plain" | "prompt" | "error" | "success";

export interface Line {
  kind: LineKind;
  segments: Segment[];
}

export type Lang = "es" | "en";

// Endpoints for external services — empty strings mean degraded mode (use fallback)
export interface Endpoints {
  api: string;    // Spring Boot API base URL, e.g. https://xxx.fly.dev
  worker: string; // Cloudflare Worker base URL, e.g. https://xxx.workers.dev
}

// Context passed to every command at runtime
export interface Ctx {
  cwd: string[];                // current path segments (e.g. ["home","notpelos"])
  prevCwd: string[] | null;     // previous cwd for `cd -`; null = OLDPWD not set yet
  history: string[];            // command history list
  fs: Record<string, FsNode>;   // root children
  skillsData?: SkillsData;      // parsed skills.json — optional so tests without it still compile
  lang: Lang;                   // active UI language
  t: (key: string, args?: Record<string, string>) => string; // i18n helper
  endpoints: Endpoints;         // external service URLs (empty = degraded mode)
  userAgent?: string;           // navigator.userAgent — injected client-side only; undefined in SSR/tests
  /** "user@host" string shown in terminal prompt — used by neofetch header. */
  promptUser?: string;
  /** Short location string for neofetch Host line, e.g. "Sevilla, ES". */
  neofetchHost?: string;
  /** Social links for AI command responses. */
  social?: {
    linkedinUrl: string;
    githubUrl: string;
    githubUser: string;
  };
}

export type CommandResult =
  | { lines: Line[]; effect?: undefined; newCwd?: string[]; newPrevCwd?: string[] }
  | { lines: Line[]; effect: "clear"; newCwd?: string[]; newPrevCwd?: string[] }
  | { lines: Line[]; effect: "setLang"; lang: Lang }
  | { lines: Line[]; effect: "navigate"; url: string }
  | { lines: Line[]; effect: "downloadPdf"; url: string; fallbackUrl: string; filename: string }
  | { lines: Line[]; effect: "fetchRepos"; url: string }
  | { lines: Line[]; effect: "setSound"; soundEnabled: boolean };

export interface Command {
  name: string;
  brief: { es: string; en: string };
  manual?: { es: string[]; en: string[] };
  /** When true, the command is excluded from `help` output but still executable and visible in `man`. */
  hidden?: boolean;
  run(args: string[], ctx: Ctx): CommandResult;
}

// Helpers
export function plain(text: string, color?: TokyoColor): Line {
  return { kind: "plain", segments: [{ text, color }] };
}

export function errorLine(text: string): Line {
  return { kind: "error", segments: [{ text, color: "tn-red" }] };
}

export function segments(...parts: Segment[]): Line {
  return { kind: "plain", segments: parts };
}
