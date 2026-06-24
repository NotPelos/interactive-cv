import type { Command, Line } from "./types.js";

// Registry is injected by index.ts after construction to break the circular dependency.
export const registry: Map<string, Command> = new Map();

const help: Command = {
  name: "help",
  brief: {
    es: "Muestra los comandos disponibles",
    en: "Show available commands",
  },
  manual: {
    es: [
      "Lista todos los comandos disponibles con una descripción breve.",
      "Para ayuda detallada de un comando concreto, usa man <comando>.",
    ],
    en: [
      "Lists all available commands with a short description.",
      "For detailed help on a specific command, use man <command>.",
    ],
  },
  run(_args, ctx) {
    const lines: Line[] = [
      {
        kind: "plain",
        segments: [{ text: ctx.t("helpHeader"), color: "tn-yellow" }],
      },
      { kind: "plain", segments: [{ text: "" }] },
    ];

    const entries = Array.from(registry.entries());
    // Render two columns — i is a numeric index, not user-controlled
    for (let i = 0; i < entries.length; i += 2) {
      // eslint-disable-next-line security/detect-object-injection
      const left = entries[i];
      // eslint-disable-next-line security/detect-object-injection
      const right = entries[i + 1];
      if (!left) continue;
      const [leftName, leftCmd] = left;
      const leftBrief = leftCmd.brief[ctx.lang];

      if (!right) {
        lines.push({
          kind: "plain",
          segments: [
            { text: "  " + leftName.padEnd(12), color: "tn-green" },
            { text: leftBrief.padEnd(36), color: "tn-text-mute" },
          ],
        });
      } else {
        const [rightName, rightCmd] = right;
        const rightBrief = rightCmd.brief[ctx.lang];
        lines.push({
          kind: "plain",
          segments: [
            { text: "  " + leftName.padEnd(12), color: "tn-green" },
            { text: leftBrief.padEnd(36), color: "tn-text-mute" },
            { text: "  " + rightName.padEnd(12), color: "tn-green" },
            { text: rightBrief, color: "tn-text-mute" },
          ],
        });
      }
    }

    lines.push({ kind: "plain", segments: [{ text: "" }] });

    const tipCmd = "man <cmd>";
    lines.push({
      kind: "plain",
      segments: [
        { text: "Tip: ", color: "tn-yellow" },
        { text: ctx.t("helpTip"), color: "tn-text-dim" },
        { text: tipCmd, color: "tn-green" },
        { text: ctx.t("helpTipMan"), color: "tn-text-dim" },
      ],
    });

    return { lines };
  },
};

export default help;
