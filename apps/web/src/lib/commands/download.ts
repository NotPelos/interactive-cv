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
      "Descarga el CV estático (cv-es.pdf o cv-en.pdf según el idioma actual).",
      "Servido desde Cloudflare Pages, sin cold start ni timeouts. Regenerado",
      "automáticamente cada vez que cambia el contenido del CV.",
    ],
    en: [
      "Usage: download cv.pdf",
      "Downloads the static CV PDF (cv-es.pdf or cv-en.pdf depending on the",
      "current language). Served from Cloudflare Pages — no cold start, no",
      "timeouts. Regenerated automatically whenever the CV content changes.",
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
        ? "→ downloading cv.pdf…"
        : "→ descargando cv.pdf…";
    // Estático servido por Cloudflare Pages en el mismo origen — mismo path
    // tanto en dev (Astro dev server) como en producción.
    const staticUrl = `/cv-${ctx.lang}.pdf`;

    return {
      lines: [{ kind: "plain", segments: [{ text: msg, color: "tn-yellow" }] }],
      effect: "downloadPdf",
      url: staticUrl,
      // Sin fallback distinto: es el mismo estático. Si el fetch fallara
      // (offline), se abre en ventana nueva como último recurso.
      fallbackUrl: staticUrl,
      filename: `notpelos-cv-${ctx.lang}.pdf`,
    };
  },
};

export default download;
