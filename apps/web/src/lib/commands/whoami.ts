import type { Command } from "./types.js";
import { detectBot } from "../userAgent.js";

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
    // userAgent is only defined client-side — access guard required for SSR safety.
    if (ctx.userAgent !== undefined) {
      const bot = detectBot(ctx.userAgent);
      if (bot !== null) {
        const name = bot.toLowerCase();
        const text =
          ctx.lang === "en"
            ? `${name} — index away, but whoever hires me will be human.`
            : `${name} — indexa lo que quieras, pero el que me contrate es humano.`;
        return {
          lines: [{ kind: "plain", segments: [{ text, color: "tn-magenta" }] }],
        };
      }
    }

    const text = ctx.lang === "en" ? "visitor" : "visitante";
    return {
      lines: [{ kind: "plain", segments: [{ text, color: "tn-magenta" }] }],
    };
  },
};

export default whoami;
