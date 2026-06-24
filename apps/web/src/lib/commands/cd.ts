import type { Command } from "./types.js";
import { resolvePath, getNode, HOME_SEGMENTS } from "../fs/index.js";

const cd: Command = {
  name: "cd",
  brief: {
    es: "Cambia el directorio actual",
    en: "Change current directory",
  },
  manual: {
    es: [
      "Navega a un directorio. Sin args va a home (~).",
      "Soporta rutas relativas, absolutas, ~ y cd - (vuelve al directorio anterior).",
      "Uso: cd [path]  — ejemplos: cd experience  cd ..  cd ~  cd -",
    ],
    en: [
      "Navigate to a directory. With no args, goes to home (~).",
      "Supports relative paths, absolute paths, ~ and cd - (goes back to previous directory).",
      "Usage: cd [path]  — examples: cd experience  cd ..  cd ~  cd -",
    ],
  },
  run(args, ctx) {
    // cd with no args → go home
    if (args.length === 0 || args[0] === undefined) {
      return {
        lines: [],
        newCwd: [...HOME_SEGMENTS],
        newPrevCwd: [...ctx.cwd],
      };
    }

    const target = args[0];

    // cd - → go to previous directory
    if (target === "-") {
      if (ctx.prevCwd === null) {
        return {
          lines: [
            {
              kind: "error",
              segments: [{ text: ctx.t("oldpwdNotSet"), color: "tn-red" }],
            },
          ],
        };
      }
      return {
        lines: [],
        newCwd: [...ctx.prevCwd],
        newPrevCwd: [...ctx.cwd],
      };
    }

    const segments = resolvePath(target, ctx.cwd);

    if (segments === null) {
      return {
        lines: [
          {
            kind: "error",
            segments: [
              {
                text: ctx.t("noSuchFile", { cmd: "cd", path: target }),
                color: "tn-red",
              },
            ],
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
            segments: [
              {
                text: ctx.t("noSuchFile", { cmd: "cd", path: target }),
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
                text: ctx.t("notADirectory", { cmd: "cd", path: target }),
                color: "tn-red",
              },
            ],
          },
        ],
      };
    }

    return {
      lines: [],
      newCwd: segments,
      newPrevCwd: [...ctx.cwd],
    };
  },
};

export default cd;
