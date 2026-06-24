import type { Command } from "./types.js";

const recruiter: Command = {
  name: "recruiter",
  brief: "Vista clásica para reclutadores",
  manual: [
    "Accede a la vista clásica de CV, optimizada para reclutadores no técnicos.",
    "Vista clásica disponible en Fase 5 — estará en /cv.",
  ],
  run(_args, _ctx) {
    return {
      lines: [
        {
          kind: "plain",
          segments: [
            { text: "vista clásica disponible en Fase 5", color: "tn-yellow" },
          ],
        },
        {
          kind: "plain",
          segments: [
            { text: "Mientras tanto, usa el botón ", color: "tn-text-dim" },
            { text: "👔 recruiter", color: "tn-blue" },
            { text: " en la esquina superior derecha.", color: "tn-text-dim" },
          ],
        },
      ],
    };
  },
};

export default recruiter;
