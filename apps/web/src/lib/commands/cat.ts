import type { Command, Line } from "./types.js";
import { resolvePath, getNode } from "../fs/index.js";
import { renderMarkdown } from "../markdown/render.js";

const cat: Command = {
  name: "cat",
  brief: "Muestra el contenido de un archivo",
  manual: [
    "Imprime el contenido de un archivo en la terminal.",
    "Si el archivo es .md, renderiza Markdown con colores Tokyo Night.",
    "Uso: cat <archivo>  — soporta rutas relativas, absolutas y ~.",
  ],
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
    const segs = resolvePath(target, ctx.cwd);

    if (segs === null) {
      return {
        lines: [
          {
            kind: "error",
            segments: [{ text: `cat: ${target}: No such file or directory`, color: "tn-red" }],
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
            segments: [{ text: `cat: ${target}: No such file or directory`, color: "tn-red" }],
          },
        ],
      };
    }

    if (node.type === "directory") {
      return {
        lines: [
          {
            kind: "error",
            segments: [{ text: `cat: ${target}: Is a directory`, color: "tn-red" }],
          },
        ],
      };
    }

    const content = node.content();

    // Render Markdown for .md files; plain text for everything else
    if (node.name.endsWith(".md")) {
      return { lines: renderMarkdown(content) };
    }

    const textLines = content.split("\n");
    const lines: Line[] = textLines.map((text) => ({
      kind: "plain" as const,
      segments: [{ text, color: "tn-text" as const }],
    }));

    return { lines };
  },
};

export default cat;
