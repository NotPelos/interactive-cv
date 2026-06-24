import type { Command, Line } from "./types.js";

const history: Command = {
  name: "history",
  brief: {
    es: "Muestra el historial de comandos",
    en: "Show command history",
  },
  manual: {
    es: [
      "Lista los comandos ejecutados en esta sesión numerados.",
      "Usa las flechas ↑ / ↓ para navegar por el historial desde el prompt.",
    ],
    en: [
      "Lists the commands executed in this session, numbered.",
      "Use the ↑ / ↓ arrow keys to navigate history from the prompt.",
    ],
  },
  run(_args, ctx) {
    if (ctx.history.length === 0) {
      return {
        lines: [
          {
            kind: "plain",
            segments: [{ text: ctx.t("historyEmpty"), color: "tn-text-dim" }],
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
