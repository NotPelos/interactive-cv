import type { Command } from "./types.js";

const clear: Command = {
  name: "clear",
  brief: "Limpia la pantalla",
  manual: [
    "Elimina todo el output visible de la terminal.",
    "Equivalente al atajo de teclado Ctrl+L.",
  ],
  run(_args, _ctx) {
    return { lines: [], effect: "clear" };
  },
};

export default clear;
