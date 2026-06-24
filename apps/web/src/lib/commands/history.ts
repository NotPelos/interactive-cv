import type { Command, Line } from "./types.js";

const history: Command = {
  name: "history",
  brief: "Muestra el historial de comandos",
  manual: [
    "Lista los comandos ejecutados en esta sesión numerados.",
    "Usa las flechas ↑ / ↓ para navegar por el historial desde el prompt.",
  ],
  run(_args, ctx) {
    if (ctx.history.length === 0) {
      return {
        lines: [
          {
            kind: "plain",
            segments: [{ text: "(historial vacío)", color: "tn-text-dim" }],
          },
        ],
      };
    }

    const lines: Line[] = ctx.history.map((cmd, i) => ({
      kind: "plain" as const,
      segments: [
        { text: String(i + 1).padStart(4) + "  ", color: "tn-text-dim" },
        { text: cmd, color: "tn-text" },
      ],
    }));

    return { lines };
  },
};

export default history;
