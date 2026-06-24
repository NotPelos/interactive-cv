import type { Command } from "./types.js";

const whoami: Command = {
  name: "whoami",
  brief: "Quién eres tú (visitante)",
  run(_args, _ctx) {
    // TODO Fase 3: bot detection per DESIGN.md
    return {
      lines: [
        {
          kind: "plain",
          segments: [{ text: "visitor", color: "tn-magenta" }],
        },
      ],
    };
  },
};

export default whoami;
