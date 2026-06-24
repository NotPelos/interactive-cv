import type { Command, Line } from "./types.js";

// Registry is injected by index.ts — same pattern as help.ts
export const registry: Map<string, Command> = new Map();

const man: Command = {
  name: "man",
  brief: {
    es: "Manual de un comando",
    en: "Command manual",
  },
  manual: {
    es: [
      "Muestra la página de manual del comando indicado.",
      "Incluye descripción detallada y ejemplos de uso.",
      "Uso: man <comando>",
    ],
    en: [
      "Shows the manual page for the given command.",
      "Includes detailed description and usage examples.",
      "Usage: man <command>",
    ],
  },
  run(args, ctx) {
    if (args.length === 0 || args[0] === undefined || args[0].trim() === "") {
      return {
        lines: [
          {
            kind: "error",
            segments: [{ text: ctx.t("manWhatPage"), color: "tn-red" }],
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
            segments: [
              {
                text: ctx.t("manNoEntry", { cmd: cmdName }),
                color: "tn-red",
              },
            ],
          },
        ],
      };
    }

    const brief = cmd.brief[ctx.lang];
    const lines: Line[] = [
      {
        kind: "plain",
        segments: [
          { text: cmdName, color: "tn-magenta" },
          { text: " — ", color: "tn-text-dim" },
          { text: brief, color: "tn-magenta" },
        ],
      },
      {
        kind: "plain",
        segments: [{ text: "─".repeat(40), color: "tn-border" }],
      },
    ];

    const manualParagraphs = cmd.manual?.[ctx.lang] ?? [brief];
    for (const para of manualParagraphs) {
      lines.push({
        kind: "plain",
        segments: [{ text: para, color: "tn-text" }],
      });
    }

    return { lines };
  },
};

export default man;
