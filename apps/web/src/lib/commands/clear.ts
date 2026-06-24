import type { Command } from "./types.js";

const clear: Command = {
  name: "clear",
  brief: {
    es: "Limpia la pantalla",
    en: "Clear the screen",
  },
  manual: {
    es: [
      "Elimina todo el output visible de la terminal.",
      "Equivalente al atajo de teclado Ctrl+L.",
    ],
    en: [
      "Removes all visible output from the terminal.",
      "Equivalent to the Ctrl+L keyboard shortcut.",
    ],
  },
  run(_args, _ctx) {
    return { lines: [], effect: "clear" };
  },
};

export default clear;
