// AI fake script — 21 Q&A pairs + separate fallback. Ordered most-specific first.
// Source: docs/CONTENT.md section 8.

export interface AiEntry {
  triggers: string[];
  es: string;
  en: string;
}

export const aiScript: AiEntry[] = [
  {
    triggers: ["hire", "contratar", "contratarte", "fichar", "cuando puedes empezar"],
    es: "¿Contratarme? Rápido: `cat about.md`, `ls experience/`, decisión hecha.",
    en: "Hire me? Quick path: `cat about.md`, `ls experience/`, decision made.",
  },
  {
    triggers: ["salary", "sueldo", "salario", "cobrar", "money", "banda salarial"],
    es: "Eso en privado. `cat contact.vcf` y me escribes.",
    en: "That's a private conversation. `cat contact.vcf` and ping me.",
  },
  {
    triggers: ["java", "spring", "springboot", "spring boot"],
    es: "Pan de cada día. `cd experience` para ver dónde lo he reventado.",
    en: "My daily bread. `cd experience` to see where I've put it to work.",
  },
  {
    triggers: ["microservices", "microservicios"],
    es: "Hexagonal, Kafka, eventos. Lo de verdad, no PowerPoint.",
    en: "Hexagonal, Kafka, event-driven. The real thing — not slideware.",
  },
  {
    triggers: ["python"],
    es: "Para scripts y bots. No soy data scientist, soy backend con buenas costumbres.",
    en: "For scripts and bots. Not a data scientist — backend dev with good habits.",
  },
  {
    triggers: ["lua", "fivem", "gta"],
    es: "Sí, juego al GTA RP. Y le escribo los scripts del servidor. Hobby útil, dame envidia.",
    en: "Yes, I play GTA RP. And I write the server scripts for it. Useful hobby — eat your heart out.",
  },
  {
    triggers: ["react", "vue", "angular", "frontend"],
    es: "Toco frontend cuando hace falta. Mi territorio natural es el lado oscuro: backend.",
    en: "I touch frontend when needed. Natural habitat: the dark side — backend.",
  },
  {
    triggers: ["vim", "emacs", "neovim"],
    es: "vim, obviamente. Respeto a la gente de emacs… desde lejos.",
    en: "vim, obviously. Respect for the emacs folks though… from a distance.",
  },
  {
    triggers: ["coffee", "cafe", "café"],
    es: "Combustible primario. Sin él no hay PR.",
    en: "Primary fuel. No PRs without it.",
  },
  {
    triggers: ["remote", "remoto", "teletrabajo"],
    es: "Sí. Modalidad preferida. Entrego mejor sin ruido.",
    en: "Yes. Preferred setup. I ship better without noise.",
  },
  {
    triggers: ["where", "location", "donde vives"],
    es: "Míralo en `cat contact.vcf` — o escribe `whoami` para saber más.",
    en: "Check `cat contact.vcf` — or type `whoami` to learn more.",
  },
  {
    triggers: ["english", "ingles", "idiomas"],
    es: "Español nativo, inglés profesional. Sobreviví 3 meses en Holanda.",
    en: "Spanish native, English at professional level. Survived 3 months in the Netherlands.",
  },
  // linkedin and github entries are handled dynamically in commands/ai.ts
  // (they need ctx.social to inject the real URLs at runtime).

  {
    triggers: ["why backend", "por que backend", "why java"],
    es: "Porque me gusta pensar el sistema entero, no solo cómo se ve en mobile.",
    en: "Because I like reasoning about the whole system, not just how it looks on mobile.",
  },
  {
    triggers: ["seniority", "senior", "junior", "mid"],
    es: "Mid-Senior en camino. 4,5 años en cosas que no son toy projects.",
    en: "Mid-Senior in progress. 4.5 years on things that aren't toy projects.",
  },
  {
    triggers: ["available", "disponible", "buscas trabajo"],
    es: "No busco activamente. Si el proyecto mola, hablamos.",
    en: "Not actively looking. If the project's interesting, let's talk.",
  },
  {
    triggers: ["aws", "gcp", "azure", "cloud"],
    es: "He tocado, no me especializo. Docker + Kubernetes son mi zona cómoda.",
    en: "Touched them, not specialised. Docker + Kubernetes is my comfort zone.",
  },
  {
    triggers: ["ai", "llm", "chatgpt", "claude", "openai"],
    es: "Soy un guion con regex disfrazado de IA. La picardía es real, los embeddings no.",
    en: "I'm a regex script in an AI costume. The wit is real, the embeddings are not.",
  },
  {
    triggers: ["matrix", "neo", "red pill", "blue pill"],
    es: "Prueba el código Konami. Sin spoilers.",
    en: "Try the Konami code. No spoilers.",
  },
  {
    triggers: ["help", "ayuda", "que es esto", "que haces"],
    es: "Soy el comando `ai`. Pregúntame algo concreto o escribe `help` para volver a tierra firme.",
    en: "I'm the `ai` command. Ask something specific or type `help` to get back to solid ground.",
  },
];

export const aiFallback = {
  es: "No tengo respuesta enlatada para eso. Prueba `help` o sé más específico — soy fake, no mágico.",
  en: "No canned response for that. Try `help` or be more specific — I'm fake, not magical.",
};
