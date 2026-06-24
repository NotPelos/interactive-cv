import type { Command } from "./types.js";
import { formatPath } from "../fs/index.js";

const pwd: Command = {
  name: "pwd",
  brief: "Muestra la ruta actual",
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
