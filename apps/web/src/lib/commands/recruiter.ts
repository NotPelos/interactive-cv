import type { Command } from "./types.js";

const recruiter: Command = {
  name: "recruiter",
  brief: {
    es: "Vista clásica para reclutadores",
    en: "Classic CV view for recruiters",
  },
  manual: {
    es: [
      "Abre la vista clásica del CV, optimizada para reclutadores no técnicos.",
      "Navega a /cv (ES) o /cv/en (EN) según el idioma activo.",
    ],
    en: [
      "Opens the classic CV view, optimised for non-technical recruiters.",
      "Navigates to /cv/en (EN) or /cv (ES) based on the active language.",
    ],
  },
  run(_args, ctx) {
    const url = ctx.lang === "en" ? "/cv/en" : "/cv";
    const transitionText =
      ctx.lang === "en"
        ? "→ opening recruiter view…"
        : "→ abriendo vista recruiter…";

    return {
      lines: [
        {
          kind: "plain",
          segments: [{ text: transitionText, color: "tn-yellow" }],
        },
      ],
      effect: "navigate",
      url,
    };
  },
};

export default recruiter;
