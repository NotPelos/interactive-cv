import type { Command } from "./types.js";
import { formatPath } from "../fs/index.js";

const pwd: Command = {
  name: "pwd",
  brief: "Muestra la ruta actual",
  manual: [
    "Print Working Directory — imprime la ruta absoluta del directorio actual.",
    "El directorio home se muestra como ~ para mayor legibilidad.",
  ],
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
