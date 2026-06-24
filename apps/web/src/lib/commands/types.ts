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

// Context passed to every command at runtime
export interface Ctx {
  cwd: string[];                // current path segments (e.g. ["home","notpelos"])
  prevCwd: string[] | null;     // previous cwd for `cd -`; null = OLDPWD not set yet
  history: string[];            // command history list
  fs: Record<string, FsNode>;   // root children
  skillsData?: SkillsData;      // parsed skills.json — optional so tests without it still compile
}

export type CommandResult = {
  lines: Line[];
  effect?: "clear";
  newCwd?: string[];
  newPrevCwd?: string[];
};

export interface Command {
  name: string;
  brief: string;
  manual?: string[];
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
