import type { Command } from "./types.js";

const SUPPORTED_ARG = "cv.pdf";

const download: Command = {
  name: "download",
  brief: {
    es: "Descarga el CV en PDF",
    en: "Download CV as PDF",
  },
  manual: {
    es: [
      "Uso: download cv.pdf",
      "Solicita el PDF al API de Spring Boot. Si el API no responde, usa el PDF estático.",
      "El archivo se descarga como notpelos-cv-es.pdf o notpelos-cv-en.pdf.",
    ],
    en: [
      "Usage: download cv.pdf",
      "Requests the PDF from the Spring Boot API. Falls back to static PDF if the API is down.",
      "File downloads as notpelos-cv-es.pdf or notpelos-cv-en.pdf.",
    ],
  },
  run(args, ctx) {
    const arg = args[0];

    if (!arg || arg !== SUPPORTED_ARG) {
      const msg =
        ctx.lang === "en"
          ? `download: only 'cv.pdf' is supported`
          : `download: solo 'cv.pdf' está soportado`;
      return {
        lines: [{ kind: "error", segments: [{ text: msg, color: "tn-red" }] }],
      };
    }

    const msg =
      ctx.lang === "en"
        ? "→ requesting PDF from API…"
        : "→ solicitando PDF al API…";

    return {
      lines: [{ kind: "plain", segments: [{ text: msg, color: "tn-yellow" }] }],
      effect: "downloadPdf",
      url: `${ctx.endpoints.api}/api/cv/pdf?lang=${ctx.lang}`,
      fallbackUrl: `/cv-static-${ctx.lang}.pdf`,
      filename: `notpelos-cv-${ctx.lang}.pdf`,
    };
  },
};

export default download;
