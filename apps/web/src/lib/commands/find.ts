import type { Command, Line } from "./types.js";
import type { FsNode } from "../fs/index.js";
import { getNode } from "../fs/index.js";

const MAX_DEPTH = 8;
const MAX_NODES_VISITED = 5000;

// Glob matching: only * wildcard is supported (matches any sequence of chars).
// Linear implementation — no backtracking, no ReDoS risk.
function globMatch(pattern: string, name: string): boolean {
  if (!pattern.includes("*")) {
    // No wildcard: substring match
    return name.toLowerCase().includes(pattern.toLowerCase());
  }

  // Split pattern on * and match each part sequentially
  const parts = pattern.toLowerCase().split("*");
  let haystack = name.toLowerCase();

  for (let i = 0; i < parts.length; i++) {
    // i is a numeric loop index into parts — not user-controlled object key
    // eslint-disable-next-line security/detect-object-injection
    const part = parts[i] ?? "";
    if (i === 0) {
      // First part must match from start (prefix)
      if (!haystack.startsWith(part)) return false;
      haystack = haystack.slice(part.length);
    } else if (i === parts.length - 1) {
      // Last part must match at end (suffix)
      if (!haystack.endsWith(part)) return false;
    } else {
      const idx = haystack.indexOf(part);
      if (idx === -1) return false;
      haystack = haystack.slice(idx + part.length);
    }
  }

  return true;
}

interface WalkState {
  visited: number;
  truncated: boolean;
}

function walkFind(
  node: FsNode,
  pattern: string,
  relativePath: string,
  results: string[],
  depth: number,
  state: WalkState
): void {
  if (state.truncated) return;

  state.visited++;
  if (state.visited > MAX_NODES_VISITED || depth > MAX_DEPTH) {
    state.truncated = true;
    return;
  }

  if (node.type === "file") {
    if (globMatch(pattern, node.name)) {
      results.push(relativePath);
    }
  } else {
    for (const child of Object.values(node.children)) {
      if (state.truncated) break;
      const childPath = relativePath ? relativePath + "/" + child.name : child.name;
      if (child.type === "file" && globMatch(pattern, child.name)) {
        state.visited++;
        if (state.visited > MAX_NODES_VISITED) { state.truncated = true; break; }
        results.push(childPath);
      } else if (child.type === "directory") {
        walkFind(child, pattern, childPath, results, depth + 1, state);
      }
    }
  }
}

const find: Command = {
  name: "find",
  brief: {
    es: "Busca archivos por nombre",
    en: "Find files by name",
  },
  manual: {
    es: [
      "Busca archivos recursivamente desde el directorio actual.",
      "Soporta * como wildcard. Sin wildcard, hace substring match.",
      "Uso: find <patrón>  — ejemplos: find *.md  find experience",
    ],
    en: [
      "Recursively searches files from the current directory.",
      "Supports * as a wildcard. Without wildcard, does substring match.",
      "Usage: find <pattern>  — examples: find *.md  find experience",
    ],
  },
  run(args, ctx) {
    if (args.length === 0 || args[0] === undefined || args[0].trim() === "") {
      return {
        lines: [
          {
            kind: "error",
            segments: [{ text: ctx.t("findUsage"), color: "tn-red" }],
          },
        ],
      };
    }

    const pattern = args[0];
    const node = getNode(ctx.cwd, ctx.fs);

    if (node === null || node.type === "file") {
      return {
        lines: [
          {
            kind: "error",
            segments: [{ text: ctx.t("findCwdError"), color: "tn-red" }],
          },
        ],
      };
    }

    const results: string[] = [];
    const walkState: WalkState = { visited: 0, truncated: false };

    for (const child of Object.values(node.children)) {
      if (walkState.truncated) break;
      const childPath = child.name;
      if (child.type === "file" && globMatch(pattern, child.name)) {
        walkState.visited++;
        if (walkState.visited > MAX_NODES_VISITED) { walkState.truncated = true; break; }
        results.push(childPath);
      } else if (child.type === "directory") {
        walkFind(child, pattern, childPath, results, 1, walkState);
      }
    }

    if (results.length === 0 && !walkState.truncated) {
      return {
        lines: [
          {
            kind: "plain",
            segments: [{ text: ctx.t("noResults"), color: "tn-text-dim" }],
          },
        ],
      };
    }

    const lines: Line[] = results.map((r) => ({
      kind: "plain" as const,
      segments: [{ text: r, color: "tn-blue" }],
    }));

    if (walkState.truncated) {
      lines.push({
        kind: "plain",
        segments: [{ text: ctx.t("searchTruncated"), color: "tn-yellow" }],
      });
    }

    return { lines };
  },
};

export default find;
