import type { Command, Line } from "./types.js";

// Registry is injected by index.ts after construction to break the circular dependency.
export const registry: Map<string, Command> = new Map();

const help: Command = {
  name: "help",
  brief: "Muestra los comandos disponibles",
  run(_args, _ctx) {
    const lines: Line[] = [
      {
        kind: "plain",
        segments: [{ text: "Comandos disponibles:", color: "tn-yellow" }],
      },
      { kind: "plain", segments: [{ text: "" }] },
    ];

    for (const [name, cmd] of registry.entries()) {
      lines.push({
        kind: "plain",
        segments: [
          { text: "  " + name.padEnd(12), color: "tn-green" },
          { text: cmd.brief, color: "tn-text-mute" },
        ],
      });
    }

    lines.push({ kind: "plain", segments: [{ text: "" }] });
    lines.push({
      kind: "plain",
      segments: [
        { text: "Tip: ", color: "tn-yellow" },
        { text: "usa Tab para autocompletar rutas y comandos.", color: "tn-text-dim" },
      ],
    });

    return { lines };
  },
};

export default help;
