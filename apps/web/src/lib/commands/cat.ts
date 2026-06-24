import type { Command, Line } from "./types.js";
import { resolvePath, getNode } from "../fs/index.js";
import { renderMarkdown } from "../markdown/render.js";

const cat: Command = {
  name: "cat",
  brief: {
    es: "Muestra el contenido de un archivo",
    en: "Show file contents",
  },
  manual: {
    es: [
      "Imprime el contenido de un archivo en la terminal.",
      "Si el archivo es .md, renderiza Markdown con colores Tokyo Night.",
      "Uso: cat <archivo>  — soporta rutas relativas, absolutas y ~.",
    ],
    en: [
      "Prints the contents of a file to the terminal.",
      "If the file is .md, renders Markdown with Tokyo Night colours.",
      "Usage: cat <file>  — supports relative, absolute and ~ paths.",
    ],
  },
  run(args, ctx) {
    if (args.length === 0 || args[0] === undefined || args[0].trim() === "") {
      return {
        lines: [
          {
            kind: "error",
            segments: [{ text: ctx.t("catMissingArg"), color: "tn-red" }],
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
            segments: [
              {
                text: ctx.t("noSuchFile", { cmd: "cat", path: target }),
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
                text: ctx.t("noSuchFile", { cmd: "cat", path: target }),
                color: "tn-red",
              },
            ],
          },
        ],
      };
    }

    if (node.type === "directory") {
      return {
        lines: [
          {
            kind: "error",
            segments: [
              {
                text: ctx.t("isADirectory", { cmd: "cat", path: target }),
                color: "tn-red",
              },
            ],
          },
        ],
      };
    }

    const content = node.content;

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
