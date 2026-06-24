import type { Command } from "./types.js";

const clear: Command = {
  name: "clear",
  brief: "Limpia la pantalla",
  run(_args, _ctx) {
    return { lines: [], effect: "clear" };
  },
};

export default clear;
