import type { Command } from "./types.js";

const repos: Command = {
  name: "repos",
  brief: {
    es: "Lista los repositorios públicos de GitHub en vivo",
    en: "List live public GitHub repositories",
  },
  manual: {
    es: [
      "Uso: repos",
      "Obtiene los repositorios más recientes de NotPelos via el Worker proxy.",
      "Si el Worker no responde, informa del modo degradado.",
      "Tras un fetch exitoso, el JSON queda en /var/log/github/repos.json.",
    ],
    en: [
      "Usage: repos",
      "Fetches NotPelos's most recent repositories via the Worker proxy.",
      "If the Worker is unreachable, reports degraded mode.",
      "After a successful fetch, JSON is available at /var/log/github/repos.json.",
    ],
  },
  run(_args, ctx) {
    const msg =
      ctx.lang === "en"
        ? "→ fetching live repos from GitHub via worker…"
        : "→ obteniendo repos en vivo de GitHub via worker…";

    return {
      lines: [{ kind: "plain", segments: [{ text: msg, color: "tn-yellow" }] }],
      effect: "fetchRepos",
      url: `${ctx.endpoints.worker}/api/github/repos`,
    };
  },
};

export default repos;
