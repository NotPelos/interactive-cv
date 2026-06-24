import type { Command, Line } from "./types.js";

// Registry is injected by index.ts — same pattern as help.ts
export const registry: Map<string, Command> = new Map();

const man: Command = {
  name: "man",
  brief: "Manual de un comando",
  manual: [
    "Muestra la página de manual del comando indicado.",
    "Incluye descripción detallada y ejemplos de uso.",
    "Uso: man <comando>",
  ],
  run(args, _ctx) {
    if (args.length === 0 || args[0] === undefined || args[0].trim() === "") {
      return {
        lines: [
          {
            kind: "error",
            segments: [{ text: "man: ¿qué página de manual quieres?", color: "tn-red" }],
          },
        ],
      };
    }

    const cmdName = args[0].trim();
    const cmd = registry.get(cmdName);

    if (!cmd) {
      return {
        lines: [
          {
            kind: "error",
            segments: [{ text: `man: no hay entrada de manual para '${cmdName}'`, color: "tn-red" }],
          },
        ],
      };
    }

    const lines: Line[] = [
      {
        kind: "plain",
        segments: [
          { text: cmdName, color: "tn-magenta" },
          { text: " — ", color: "tn-text-dim" },
          { text: cmd.brief, color: "tn-magenta" },
        ],
      },
      {
        kind: "plain",
        segments: [{ text: "─".repeat(40), color: "tn-border" }],
      },
    ];

    const paragraphs = cmd.manual ?? [cmd.brief];
    for (const para of paragraphs) {
      lines.push({
        kind: "plain",
        segments: [{ text: para, color: "tn-text" }],
      });
    }

    return { lines };
  },
};

export default man;
