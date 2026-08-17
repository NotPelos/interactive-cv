import type { Command } from "./types.js";

const contact: Command = {
  name: "contact",
  brief: {
    es: "Formulario de contacto (envía email directo)",
    en: "Contact form (sends email directly)",
  },
  manual: {
    es: [
      "Uso: contact",
      "Abre un formulario para que un reclutador (o quien sea) me escriba.",
      "El mensaje se valida en el servidor, pasa por Cloudflare Turnstile",
      "para bloquear bots, y se envía por email vía Resend.",
      "Rate limit: 5 mensajes por minuto por IP.",
    ],
    en: [
      "Usage: contact",
      "Opens a form for a recruiter (or anyone) to send me a message.",
      "The message is validated server-side, checked against Cloudflare",
      "Turnstile (anti-bot) and sent by email via Resend.",
      "Rate limit: 5 messages per minute per IP.",
    ],
  },
  run(_args, ctx) {
    const opening =
      ctx.lang === "en"
        ? "→ opening contact form…"
        : "→ abriendo formulario de contacto…";
    return {
      lines: [{ kind: "plain", segments: [{ text: opening, color: "tn-yellow" }] }],
      effect: "openContact",
    };
  },
};

export default contact;
