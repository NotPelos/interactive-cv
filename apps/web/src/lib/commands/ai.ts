import type { Command } from "./types.js";
import { aiScript, aiFallback } from "../ai/script.js";
import type { Lang } from "./types.js";

// Normalise input: lowercase, trim, strip diacritics.
// ̀-ͯ is the Unicode Combining Diacritical Marks block (NFD combining chars).
function normalise(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function matchScript(query: string, lang: Lang): string {
  const q = normalise(query);

  for (const entry of aiScript) {
    for (const trigger of entry.triggers) {
      if (q.includes(normalise(trigger))) {
        // lang is typed as Lang ("es"|"en"), not user-controlled input
        // eslint-disable-next-line security/detect-object-injection
        return entry[lang];
      }
    }
  }

  // No match — return the dedicated fallback object.
  // eslint-disable-next-line security/detect-object-injection
  return aiFallback[lang];
}

const ai: Command = {
  name: "ai",
  brief: {
    es: "Asistente fake con guion pregrabado",
    en: "Fake assistant with pre-scripted answers",
  },
  manual: {
    es: [
      "Uso: ai <pregunta>",
      "Asistente de lenguaje natural fake. Respuestas pregrabadas con humor.",
      "Sin conexión a ningún LLM real — es un matcher de keywords.",
      "Ejemplos: ai contratar, ai java, ai remoto",
    ],
    en: [
      "Usage: ai <question>",
      "Fake natural-language assistant. Pre-scripted answers with wit.",
      "No real LLM connection — it's a keyword matcher.",
      "Examples: ai hire, ai java, ai remote",
    ],
  },
  run(args, ctx) {
    if (args.length === 0) {
      const hint =
        ctx.lang === "en"
          ? "ai: ask me something. Example: ai hire, ai java, ai remote"
          : "ai: hazme una pregunta. Ejemplo: ai contratar, ai java, ai remoto";
      return {
        lines: [{ kind: "plain", segments: [{ text: hint, color: "tn-yellow" }] }],
      };
    }

    const query = args.join(" ");
    const response = matchScript(query, ctx.lang);

    return {
      lines: [
        {
          kind: "plain",
          segments: [
            { text: "→ ", color: "tn-magenta" },
            { text: response, color: "tn-text" },
          ],
        },
      ],
    };
  },
};

export { matchScript };
export default ai;
