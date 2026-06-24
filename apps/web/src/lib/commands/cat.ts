import type { Command, Line } from "./types.js";
import { resolvePath, getNode } from "../fs/index.js";

const cat: Command = {
  name: "cat",
  brief: "Muestra el contenido de un archivo",
  run(args, ctx) {
    if (args.length === 0 || args[0] === undefined || args[0].trim() === "") {
      return {
        lines: [
          {
            kind: "error",
            segments: [{ text: "cat: falta operando de archivo", color: "tn-red" }],
          },
        ],
      };
    }

    const target = args[0];
    const segments = resolvePath(target, ctx.cwd);

    if (segments === null) {
      return {
        lines: [
          {
            kind: "error",
            segments: [{ text: `cat: ${target}: No such file or directory`, color: "tn-red" }],
          },
        ],
      };
    }

    const node = getNode(segments, ctx.fs);

    if (node === null) {
      return {
        lines: [
          {
            kind: "error",
            segments: [{ text: `cat: ${target}: No such file or directory`, color: "tn-red" }],
          },
        ],
      };
    }

    if (node.type === "directory") {
      // target is validated non-empty above; `??` is dead code — use directly
      const display = target;
      return {
        lines: [
          {
            kind: "error",
            segments: [{ text: `cat: ${display}: Is a directory`, color: "tn-red" }],
          },
        ],
      };
    }

    // Split content by newlines and render each as a separate line
    const content = node.content();
    const textLines = content.split("\n");
    const lines: Line[] = textLines.map((text) => ({
      kind: "plain" as const,
      segments: [{ text, color: "tn-text" }],
    }));

    return { lines };
  },
};

export default cat;
