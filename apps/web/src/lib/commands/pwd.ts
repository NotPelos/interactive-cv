import type { Command } from "./types.js";
import { formatPath } from "../fs/index.js";

const pwd: Command = {
  name: "pwd",
  brief: {
    es: "Muestra la ruta actual",
    en: "Print current working directory",
  },
  manual: {
    es: [
      "Print Working Directory — imprime la ruta absoluta del directorio actual.",
      "El directorio home se muestra como ~ para mayor legibilidad.",
    ],
    en: [
      "Print Working Directory — prints the absolute path of the current directory.",
      "The home directory is displayed as ~ for readability.",
    ],
  },
  run(_args, ctx) {
    return {
      lines: [
        {
          kind: "plain",
          segments: [{ text: formatPath(ctx.cwd), color: "tn-text" }],
        },
      ],
    };
  },
};

export default pwd;
