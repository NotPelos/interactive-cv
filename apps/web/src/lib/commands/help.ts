import type { Command, Line } from "./types.js";

// Registry is injected by index.ts after construction to break the circular dependency.
export const registry: Map<string, Command> = new Map();

const help: Command = {
  name: "help",
  brief: "Muestra los comandos disponibles",
  manual: [
    "Lista todos los comandos disponibles con una descripción breve.",
    "Para ayuda detallada de un comando concreto, usa man <comando>.",
  ],
  run(_args, _ctx) {
    const lines: Line[] = [
      {
        kind: "plain",
        segments: [{ text: "Comandos disponibles:", color: "tn-yellow" }],
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

      if (!right) {
        lines.push({
          kind: "plain",
          segments: [
            { text: "  " + leftName.padEnd(12), color: "tn-green" },
            { text: leftCmd.brief.padEnd(36), color: "tn-text-mute" },
          ],
        });
      } else {
        const [rightName, rightCmd] = right;
        lines.push({
          kind: "plain",
          segments: [
            { text: "  " + leftName.padEnd(12), color: "tn-green" },
            { text: leftCmd.brief.padEnd(36), color: "tn-text-mute" },
            { text: "  " + rightName.padEnd(12), color: "tn-green" },
            { text: rightCmd.brief, color: "tn-text-mute" },
          ],
        });
      }
    }

    lines.push({ kind: "plain", segments: [{ text: "" }] });
    lines.push({
      kind: "plain",
      segments: [
        { text: "Tip: ", color: "tn-yellow" },
        { text: "usa Tab para autocompletar. ", color: "tn-text-dim" },
        { text: "man <cmd>", color: "tn-green" },
        { text: " para ayuda detallada.", color: "tn-text-dim" },
      ],
    });

    return { lines };
  },
};

export default help;
