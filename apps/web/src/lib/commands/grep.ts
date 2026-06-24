import type { Command, Line, Segment } from "./types.js";
import type { FsNode } from "../fs/index.js";
import { resolvePath, getNode } from "../fs/index.js";

// Pattern matching is literal string (no regex) in this phase to prevent ReDoS.
// Regex support is planned for Phase 7 when a safe regex sandbox is evaluated.

const MAX_RESULTS = 200;
const MAX_DEPTH = 8;
const MAX_NODES_VISITED = 5000;

function matchesPattern(line: string, pattern: string): boolean {
  return line.toLowerCase().includes(pattern.toLowerCase());
}

function highlightMatch(line: string, pattern: string): Segment[] {
  const lowerLine = line.toLowerCase();
  const lowerPattern = pattern.toLowerCase();
  const idx = lowerLine.indexOf(lowerPattern);
  if (idx === -1) return [{ text: line, color: "tn-text" }];

  const before = line.slice(0, idx);
  const match = line.slice(idx, idx + pattern.length);
  const after = line.slice(idx + pattern.length);

  const segs: Segment[] = [];
  if (before) segs.push({ text: before, color: "tn-text" });
  segs.push({ text: match, color: "tn-yellow" });
  if (after) segs.push({ text: after, color: "tn-text" });
  return segs;
}

interface GrepMatch {
  filePath: string;
  lineNum: number;
  content: string;
}

interface GrepWalkState {
  visited: number;
  truncated: boolean;
}

function grepFile(content: string, pattern: string, filePath: string, matches: GrepMatch[]): void {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length && matches.length < MAX_RESULTS; i++) {
    // i is a numeric loop index — not user-controlled object key
    // eslint-disable-next-line security/detect-object-injection
    const l = lines[i] ?? "";
    if (matchesPattern(l, pattern)) {
      matches.push({ filePath, lineNum: i + 1, content: l });
    }
  }
}

function grepNode(
  node: FsNode,
  pattern: string,
  prefix: string,
  matches: GrepMatch[],
  depth: number,
  state: GrepWalkState
): void {
  if (matches.length >= MAX_RESULTS || state.truncated) return;

  state.visited++;
  if (state.visited > MAX_NODES_VISITED || depth > MAX_DEPTH) {
    state.truncated = true;
    return;
  }

  if (node.type === "file") {
    grepFile(node.content(), pattern, prefix, matches);
  } else {
    for (const child of Object.values(node.children)) {
      if (matches.length >= MAX_RESULTS || state.truncated) return;
      const childPath = prefix ? prefix + "/" + child.name : child.name;
      grepNode(child, pattern, childPath, matches, depth + 1, state);
    }
  }
}

const grep: Command = {
  name: "grep",
  brief: {
    es: "Busca texto en archivos",
    en: "Search text in files",
  },
  manual: {
    es: [
      "Busca un patrón (literal, sin regex) en un archivo o directorio.",
      "En directorios, la búsqueda es recursiva. Máximo 200 resultados.",
      "Uso: grep <patrón> <archivo|directorio>",
    ],
    en: [
      "Searches for a literal pattern (no regex) in a file or directory.",
      "In directories, the search is recursive. Maximum 200 results.",
      "Usage: grep <pattern> <file|directory>",
    ],
  },
  run(args, ctx) {
    if (args.length < 2 || args[0] === undefined || args[1] === undefined) {
      return {
        lines: [
          {
            kind: "error",
            segments: [{ text: ctx.t("grepUsage"), color: "tn-red" }],
          },
        ],
      };
    }

    const pattern = args[0];
    const target = args[1];
    const segs = resolvePath(target, ctx.cwd);

    if (segs === null) {
      return {
        lines: [
          {
            kind: "error",
            segments: [
              {
                text: ctx.t("noSuchFile", { cmd: "grep", path: target }),
                color: "tn-red",
              },
            ],
          },
        ],
      };
    }

    const node = getNode(segs, ctx.fs);

    if (node === null) {
      return {
        lines: [
          {
            kind: "error",
            segments: [
              {
                text: ctx.t("noSuchFile", { cmd: "grep", path: target }),
                color: "tn-red",
              },
            ],
          },
        ],
      };
    }

    const matches: GrepMatch[] = [];
    const walkState: GrepWalkState = { visited: 0, truncated: false };

    if (node.type === "file") {
      grepFile(node.content(), pattern, target, matches);
    } else {
      grepNode(node, pattern, target, matches, 0, walkState);
    }

    if (matches.length === 0 && !walkState.truncated) {
      return {
        lines: [
          {
            kind: "plain",
            segments: [{ text: ctx.t("noResults"), color: "tn-text-dim" }],
          },
        ],
      };
    }

    const isDir = node.type === "directory";
    const lines: Line[] = matches.map((m) => {
      const segsLine: Segment[] = [];
      if (isDir) {
        segsLine.push({ text: m.filePath, color: "tn-magenta" });
        segsLine.push({ text: ":", color: "tn-border" });
      }
      segsLine.push({ text: String(m.lineNum), color: "tn-text-dim" });
      segsLine.push({ text: " ", color: "tn-text" });
      segsLine.push(...highlightMatch(m.content, pattern));
      return { kind: "plain" as const, segments: segsLine };
    });

    if (walkState.truncated) {
      lines.push({
        kind: "plain",
        segments: [{ text: ctx.t("searchTruncated"), color: "tn-yellow" }],
      });
    }

    return { lines };
  },
};

export default grep;
