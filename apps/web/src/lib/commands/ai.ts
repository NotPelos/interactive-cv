import type { Command, Ctx } from "./types.js";
import { aiScript, aiFallback } from "../ai/script.js";
import type { AiEntry } from "../ai/script.js";
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

// Builds dynamic entries whose text depends on profile social links.
// These override the static entries in aiScript with runtime URLs.
function buildDynamicEntries(ctx?: Partial<Ctx>): AiEntry[] {
  const linkedinUrl = ctx?.social?.linkedinUrl ?? "";
  const githubUser = ctx?.social?.githubUser ?? "youralias";

  // Strip https://www. from LinkedIn for display
  const linkedinDisplay = linkedinUrl.replace("https://www.", "").replace("https://", "");

  return [
    {
      triggers: ["linkedin"],
      es: `${linkedinDisplay} — pero el CV real es éste.`,
      en: `${linkedinDisplay} — but the real CV is right here.`,
    },
    {
      triggers: ["github", "repos", "proyectos"],
      es: `github.com/${githubUser} — \`ls /var/log/github/\` lo ves en vivo.`,
      en: `github.com/${githubUser} — \`ls /var/log/github/\` to see it live.`,
    },
    {
      triggers: ["contact", "contacto", "email"],
      es: `\`cat ~/contact.vcf\` — o escríbeme directamente desde LinkedIn.`,
      en: `\`cat ~/contact.vcf\` — or ping me on LinkedIn directly.`,
    },
  ];
}

function matchScript(query: string, lang: Lang, ctx?: Partial<Ctx>): string {
  const q = normalise(query);

  // Dynamic entries (social-link-aware) checked before static ones
  const dynamicEntries = buildDynamicEntries(ctx);
  for (const entry of dynamicEntries) {
    for (const trigger of entry.triggers) {
      if (q.includes(normalise(trigger))) {
        // lang is typed as Lang ("es"|"en"), not user-controlled input
        // eslint-disable-next-line security/detect-object-injection
        return entry[lang];
      }
    }
  }

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
    const response = matchScript(query, ctx.lang, ctx as Partial<Ctx>);

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

export { matchScript, buildDynamicEntries };
export default ai;
