/**
 * cvData.ts — construye el payload JSON que /api/cv/adapt espera, desde los
 * content collections de Astro.
 *
 * Se ejecuta en build time (dentro de index.astro) y su output se pasa como
 * prop al island Terminal. En runtime, el modal `adapt` lo envía al backend.
 */

import type { SkillsData } from "./commands/types.js";

// ---- shapes de content collection entries ----

interface CollectionEntry {
  id: string;
  body?: string;
  data: Record<string, unknown>;
}

// ---- shape que /api/cv/adapt espera ----

export interface AdaptPayload {
  lang: "es" | "en";
  about: string;
  highlights: Array<{ metric: string; label: string }>;
  experience: Array<{
    company: string;
    role: string;
    dateRange: string;
    stack: string[];
    bullets: string[];
  }>;
  projects: Array<{ title: string; pitch: string; stack: string[] }>;
  skills: Record<string, unknown>;
}

/**
 * Extrae bullets de un body markdown. Solo líneas que empiezan por - o *.
 * Idéntico patrón al del generator del PDF Typst.
 */
function extractBullets(body: string | undefined): string[] {
  if (!body) return [];
  const out: string[] = [];
  for (const l of body.split(/\r?\n/)) {
    const m = l.match(/^\s*[-*]\s+(.*)$/);
    if (m) out.push(m[1].trim());
  }
  return out;
}

/**
 * Meses ES/EN cortos, para formatear dateRange consistente con el PDF.
 */
const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDate(raw: unknown, lang: "es" | "en"): string {
  if (!raw) return "";
  const s = String(raw);
  const m = s.match(/^(\d{4})-(\d{2})/);
  if (!m) return s;
  // idx clamped a [0, 11] — seguro para indexar el array
  const idx = Math.min(11, Math.max(0, parseInt(m[2]!, 10) - 1));
  const months = lang === "en" ? MONTHS_EN : MONTHS_ES;
  // eslint-disable-next-line security/detect-object-injection
  return `${months[idx]} ${m[1]}`;
}

function dateRange(start: unknown, end: unknown, lang: "es" | "en"): string {
  const s = formatDate(start, lang);
  const present = lang === "en" ? "present" : "presente";
  const e = !end || end === "present" ? present : formatDate(end, lang);
  return `${s} → ${e}`;
}

/**
 * Devuelve el payload adaptado para un idioma. Filtra las entries por lang y
 * ordena experience (más reciente arriba, order asc) y projects (order asc).
 */
export function buildAdaptPayload(
  collections: {
    about: CollectionEntry[];
    highlights: CollectionEntry[];
    experience: CollectionEntry[];
    projects: CollectionEntry[];
    skillsJson: SkillsData;
  },
  lang: "es" | "en"
): AdaptPayload {
  const byLang = <T extends CollectionEntry>(entries: T[]): T[] =>
    entries.filter((e) => e.data["lang"] === lang);

  // ---- about ----
  const aboutEntry = byLang(collections.about)[0];
  const about = (aboutEntry?.body ?? "").trim();

  // ---- highlights ----
  const highlights = byLang(collections.highlights)
    .sort((a, b) => Number(a.data["order"] ?? 0) - Number(b.data["order"] ?? 0))
    .map((h) => ({
      metric: String(h.data["metric"] ?? ""),
      label: String(h.data["label"] ?? ""),
    }));

  // ---- experience (más reciente arriba = order asc: order=1 es Aubay) ----
  const experience = byLang(collections.experience)
    .sort((a, b) => Number(a.data["order"] ?? 0) - Number(b.data["order"] ?? 0))
    .map((e) => ({
      company: String(e.data["company"] ?? ""),
      role: String(e.data["role"] ?? ""),
      dateRange: dateRange(e.data["start"], e.data["end"], lang),
      stack: Array.isArray(e.data["stack"]) ? (e.data["stack"] as unknown[]).map(String) : [],
      bullets: extractBullets(e.body),
    }));

  // ---- projects ----
  const projects = byLang(collections.projects)
    .sort((a, b) => Number(a.data["order"] ?? 0) - Number(b.data["order"] ?? 0))
    .map((p) => ({
      title: String(p.data["title"] ?? ""),
      pitch: String(p.data["pitch"] ?? ""),
      stack: Array.isArray(p.data["stack"]) ? (p.data["stack"] as unknown[]).map(String) : [],
    }));

  return {
    lang,
    about,
    highlights,
    experience,
    projects,
    skills: collections.skillsJson as unknown as Record<string, unknown>,
  };
}
