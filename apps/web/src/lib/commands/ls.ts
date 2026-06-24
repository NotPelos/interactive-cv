import type { Command, Line } from "./types.js";
import { resolvePath, getNode, formatPath } from "../fs/index.js";

const ls: Command = {
  name: "ls",
  brief: "Lista el contenido de un directorio",
  run(args, ctx) {
    const targetPath = args[0];
    const segments = targetPath
      ? resolvePath(targetPath, ctx.cwd)
      : [...ctx.cwd];

    if (segments === null) {
      return {
        lines: [
          {
            kind: "error",
            segments: [
              { text: `ls: ${targetPath ?? ""}: No such file or directory`, color: "tn-red" },
            ],
          },
        ],
      };
    }

    const node = getNode(segments, ctx.fs);

    if (node === null) {
      const display = targetPath ?? formatPath(ctx.cwd);
      return {
        lines: [
          {
            kind: "error",
            segments: [
              { text: `ls: ${display}: No such file or directory`, color: "tn-red" },
            ],
          },
        ],
      };
    }

    if (node.type === "file") {
      // ls on a file just shows the filename
      return {
        lines: [
          {
            kind: "plain",
            segments: [{ text: node.name, color: "tn-blue" }],
          },
        ],
      };
    }

    const children = Object.values(node.children);
    // Filter hidden files (starting with ".") — -a flag is Fase 3
    const visible = children.filter((n) => !n.name.startsWith("."));

    if (visible.length === 0) {
      return { lines: [] };
    }

    const lines: Line[] = visible.map((child) => {
      if (child.type === "directory") {
        return {
          kind: "plain" as const,
          segments: [{ text: child.name + "/", color: "tn-cyan" }],
        };
      }
      return {
        kind: "plain" as const,
        segments: [{ text: child.name, color: "tn-blue" }],
      };
    });

    return { lines };
  },
};

export default ls;
