import type { Command } from "./types.js";

const recruiter: Command = {
  name: "recruiter",
  brief: {
    es: "Vista clásica para reclutadores",
    en: "Classic CV view for recruiters",
  },
  manual: {
    es: [
      "Accede a la vista clásica de CV, optimizada para reclutadores no técnicos.",
      "Vista clásica disponible en Fase 5 — estará en /cv.",
    ],
    en: [
      "Access the classic CV view, optimised for non-technical recruiters.",
      "Classic view available in Phase 5 — will be at /cv.",
    ],
  },
  run(_args, ctx) {
    return {
      lines: [
        {
          kind: "plain",
          segments: [
            { text: ctx.t("recruiterStub"), color: "tn-yellow" },
          ],
        },
        {
          kind: "plain",
          segments: [
            {
              text: ctx.lang === "en"
                ? "Meanwhile, use the "
                : "Mientras tanto, usa el botón ",
              color: "tn-text-dim",
            },
            { text: "👔 recruiter", color: "tn-blue" },
            { text: ctx.t("recruiterHint"), color: "tn-text-dim" },
          ],
        },
      ],
    };
  },
};

export default recruiter;
