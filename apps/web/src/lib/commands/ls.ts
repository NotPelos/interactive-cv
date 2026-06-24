import type { Command, Line } from "./types.js";
import { resolvePath, getNode, formatPath } from "../fs/index.js";

const ls: Command = {
  name: "ls",
  brief: {
    es: "Lista el contenido de un directorio",
    en: "List directory contents",
  },
  manual: {
    es: [
      "Lista los archivos y carpetas del directorio indicado (o el actual si no se pasa path).",
      "Los directorios aparecen en cyan con / al final; los archivos en azul.",
      "Los archivos ocultos (prefijo .) no se muestran por defecto.",
      "Uso: ls [path]",
    ],
    en: [
      "Lists the files and folders of the given directory (or the current one if no path is provided).",
      "Directories appear in cyan with a trailing /; files in blue.",
      "Hidden files (prefixed with .) are not shown by default.",
      "Usage: ls [path]",
    ],
  },
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
              {
                text: ctx.t("noSuchFile", { cmd: "ls", path: targetPath ?? "" }),
                color: "tn-red",
              },
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
              {
                text: ctx.t("noSuchFile", { cmd: "ls", path: display }),
                color: "tn-red",
              },
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
