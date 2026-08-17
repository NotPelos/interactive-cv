import type { Command } from "./types.js";

const adapt: Command = {
  name: "adapt",
  brief: {
    es: "Adapta el CV a una descripción de puesto (IA)",
    en: "Adapt CV to a job description (AI)",
  },
  manual: {
    es: [
      "Uso: adapt",
      "Abre un formulario donde pegar la descripción de un puesto. Un modelo",
      "IA (Gemini) analiza el CV completo y devuelve qué highlights, experiencias,",
      "proyectos y skills son más relevantes para ese puesto concreto, más un",
      "resumen personalizado de 2-4 frases.",
      "Rate limit: 10 análisis por minuto por IP.",
    ],
    en: [
      "Usage: adapt",
      "Opens a form to paste a job description. A Gemini AI model analyses the",
      "full CV and returns which highlights, experiences, projects and skills",
      "are most relevant to that role, plus a personalised 2-4 sentence summary.",
      "Rate limit: 10 analyses per minute per IP.",
    ],
  },
  run(_args, ctx) {
    const opening =
      ctx.lang === "en"
        ? "→ opening cv adapter…"
        : "→ abriendo adaptador del CV…";
    return {
      lines: [{ kind: "plain", segments: [{ text: opening, color: "tn-yellow" }] }],
      effect: "openAdapt",
    };
  },
};

export default adapt;
