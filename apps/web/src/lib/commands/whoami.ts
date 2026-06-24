import type { Command } from "./types.js";

const whoami: Command = {
  name: "whoami",
  brief: {
    es: "Quién eres tú (visitante)",
    en: "Who you are (visitor)",
  },
  manual: {
    es: [
      "Imprime el nombre del usuario actual de la sesión de terminal.",
      "Si eres un bot conocido (Googlebot, GPTBot…), recibirás un saludo especial.",
    ],
    en: [
      "Prints the current user name for this terminal session.",
      "If you are a known bot (Googlebot, GPTBot…), you will get a special greeting.",
    ],
  },
  run(_args, ctx) {
    // TODO Fase 3: bot detection per DESIGN.md
    const text = ctx.lang === "en" ? "visitor" : "visitante";
    return {
      lines: [
        {
          kind: "plain",
          segments: [{ text, color: "tn-magenta" }],
        },
      ],
    };
  },
};

export default whoami;
