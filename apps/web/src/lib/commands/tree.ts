import type { Command, Line, Segment } from "./types.js";
import type { FsNode } from "../fs/index.js";
import { resolvePath, getNode, formatPath } from "../fs/index.js";

const MAX_DEPTH = 3;

function buildTree(
  children: Record<string, FsNode>,
  prefix: string,
  depth: number,
  lines: Line[]
): void {
  if (depth > MAX_DEPTH) return;

  const entries = Object.values(children).filter((n) => !n.name.startsWith("."));
  entries.forEach((node, idx) => {
    const isLast = idx === entries.length - 1;
    const connector = isLast ? "└── " : "├── ";
    const childPrefix = prefix + (isLast ? "    " : "│   ");

    const segs: Segment[] = [
      { text: prefix + connector, color: "tn-border" },
    ];

    if (node.type === "directory") {
      segs.push({ text: node.name + "/", color: "tn-cyan" });
    } else {
      segs.push({ text: node.name, color: "tn-blue" });
    }

    lines.push({ kind: "plain", segments: segs });

    if (node.type === "directory") {
      buildTree(node.children, childPrefix, depth + 1, lines);
    }
  });
}

const tree: Command = {
  name: "tree",
  brief: {
    es: "Árbol de directorios en ASCII",
    en: "ASCII directory tree",
  },
  manual: {
    es: [
      "Renderiza el árbol de archivos del directorio indicado (o el actual).",
      "Profundidad máxima: 3 niveles. Archivos ocultos excluidos.",
      "Uso: tree [path]",
    ],
    en: [
      "Renders the file tree of the given directory (or the current one).",
      "Maximum depth: 3 levels. Hidden files excluded.",
      "Usage: tree [path]",
    ],
  },
  run(args, ctx) {
    const targetPath = args[0];
    const segs = targetPath ? resolvePath(targetPath, ctx.cwd) : [...ctx.cwd];

    if (segs === null) {
      return {
        lines: [
          {
            kind: "error",
            segments: [
              {
                text: ctx.t("noSuchFile", { cmd: "tree", path: targetPath ?? "" }),
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
                text: ctx.t("noSuchFile", { cmd: "tree", path: targetPath ?? "" }),
                color: "tn-red",
              },
            ],
          },
        ],
      };
    }

    if (node.type === "file") {
      return {
        lines: [
          {
            kind: "error",
            segments: [
              {
                text: ctx.t("notADirectory", { cmd: "tree", path: targetPath ?? "" }),
                color: "tn-red",
              },
            ],
          },
        ],
      };
    }

    const label = formatPath(segs);
    const lines: Line[] = [
      {
        kind: "plain",
        segments: [{ text: label + "/", color: "tn-cyan" }],
      },
    ];

    buildTree(node.children, "", 1, lines);

    return { lines };
  },
};

export default tree;
