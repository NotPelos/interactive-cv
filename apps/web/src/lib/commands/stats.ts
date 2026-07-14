import type { Command, Line } from "./types.js";

/** Formats a positive integer with locale grouping (1234 → "1,234" en-US / "1.234" es-ES). */
function formatCount(n: number, lang: "es" | "en"): string {
  const locale = lang === "en" ? "en-US" : "es-ES";
  return new Intl.NumberFormat(locale).format(n);
}

const stats: Command = {
  name: "stats",
  brief: {
    es: "Estadísticas de visitas de este CV",
    en: "Visit stats for this CV",
  },
  manual: {
    es: [
      "Uso: stats",
      "Muestra visitas totales y del día actual.",
      "Cuenta única por visitante y día (IP hasheada con salt, sin cookies).",
      "El contador vive en Cloudflare KV, gestionado por el Worker.",
    ],
    en: [
      "Usage: stats",
      "Shows total and today's visit count.",
      "One visit per unique visitor per day (IP hashed with salt, no cookies).",
      "Counter lives in Cloudflare KV, managed by the Worker.",
    ],
  },
  run(_args, ctx) {
    const v = ctx.visits;

    if (!v) {
      const msg =
        ctx.lang === "en"
          ? "stats: counter unreachable (degraded mode)"
          : "stats: contador no disponible (modo degradado)";
      return {
        lines: [{ kind: "plain", segments: [{ text: msg, color: "tn-red" }] }],
      };
    }

    const totalLabel = ctx.lang === "en" ? "Total visits" : "Visitas totales";
    const todayLabel = ctx.lang === "en" ? "Today" : "Hoy";
    const footer =
      ctx.lang === "en"
        ? "unique per visitor per day · no cookies"
        : "único por visitante y día · sin cookies";

    const lines: Line[] = [
      {
        kind: "plain",
        segments: [
          { text: totalLabel.padEnd(16), color: "tn-yellow" },
          { text: formatCount(v.total, ctx.lang), color: "tn-green" },
        ],
      },
      {
        kind: "plain",
        segments: [
          { text: todayLabel.padEnd(16), color: "tn-yellow" },
          { text: formatCount(v.today, ctx.lang), color: "tn-green" },
        ],
      },
      { kind: "plain", segments: [{ text: "" }] },
      { kind: "plain", segments: [{ text: footer, color: "tn-text-dim" }] },
    ];

    return { lines };
  },
};

export default stats;
