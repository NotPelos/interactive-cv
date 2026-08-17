/**
 * generate-cv-pdf.mjs — genera cv-es.pdf y cv-en.pdf con Typst.
 *
 * Lee el contenido desde `apps/web/src/content/` (que ya ha sido copiado
 * por sync-content.mjs) y renderiza la plantilla `template.typ`.
 *
 * Uso local:
 *   pnpm --filter web sync              # sincroniza contenido desde personal/
 *   pnpm --filter web cv:pdf            # (este script) genera los PDFs
 *
 * Requiere el binario `typst` en el PATH. En CI se descarga en el workflow.
 * Localmente:
 *   winget install typst           (Windows)
 *   brew install typst             (macOS)
 *   cargo install --locked typst-cli  (todos)
 *
 * Si typst no está disponible, el script sale con mensaje claro sin romper el build.
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { execFileSync, spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_DIR = resolve(__dirname, "..", "..");
const CONTENT_DIR = join(WEB_DIR, "src", "content");
const PUBLIC_DIR = join(WEB_DIR, "public");
const AVATAR_SRC = join(WEB_DIR, "source", "avatar-raw.png");
const OUT_DIR = join(__dirname, "build");

const LANGS = ["es", "en"];

// ---------------------------------------------------------------------------
// Frontmatter parser mínimo (sin dependencia externa)
// ---------------------------------------------------------------------------

/**
 * Parsea `--- yaml ---\nbody` sin traer gray-matter. Solo soporta el subset que
 * usamos: valores string quoted, valores string sin quote, arrays JSON inline,
 * y objetos anidados (testimonial). Body es todo lo que sigue al segundo `---`.
 */
function parseFrontmatter(raw) {
  const src = raw.replace(/^﻿/, ""); // strip BOM if any
  if (!src.startsWith("---")) return { data: {}, body: src };
  const end = src.indexOf("\n---", 3);
  if (end === -1) return { data: {}, body: src };
  const yaml = src.slice(4, end).trim();
  const body = src.slice(end + 4).replace(/^\r?\n/, "");
  const data = parseYaml(yaml);
  return { data, body };
}

/**
 * Parser YAML de subset: soporta scalars, listas JSON inline y objetos anidados
 * con indentación de 2 espacios. Todas las líneas se procesan con estado simple.
 */
function parseYaml(src) {
  const lines = src.split(/\r?\n/);
  const root = {};
  const stack = [{ obj: root, indent: -1 }];

  for (const rawLine of lines) {
    if (!rawLine.trim() || rawLine.trim().startsWith("#")) continue;
    const indent = rawLine.match(/^ */)[0].length;
    const line = rawLine.slice(indent);

    // pop stack to matching indent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    const target = stack[stack.length - 1].obj;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const rest = line.slice(colonIdx + 1).trim();

    if (rest === "") {
      // start of nested object
      const child = {};
      target[key] = child;
      stack.push({ obj: child, indent });
    } else {
      target[key] = parseScalar(rest);
    }
  }
  return root;
}

function parseScalar(v) {
  const s = v.trim();
  // JSON array/object inline
  if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
    try {
      return JSON.parse(s.replace(/'/g, '"'));
    } catch {
      return s;
    }
  }
  // Quoted string
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Loaders por sección
// ---------------------------------------------------------------------------

function loadByLang(dir, lang) {
  const items = [];
  if (!existsSync(dir)) return items;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(`.${lang}.md`)) continue;
    const raw = readFileSync(join(dir, name), "utf8");
    const { data, body } = parseFrontmatter(raw);
    items.push({ ...data, __body: body, __file: name });
  }
  return items;
}

// Máximo de párrafos del "Sobre mí" que caben cómodos en el header del PDF sin
// robarle sitio al resto. El contenido original de about.md puede ser más largo
// (la web lo aprovecha entero); aquí truncamos a los primeros N para que el CV
// permanezca escaneable en 5 segundos.
const ABOUT_MAX_PARAGRAPHS = 2;

function loadAbout(lang) {
  const items = loadByLang(join(CONTENT_DIR, "about"), lang);
  if (items.length === 0) return [];
  const body = items[0].__body.trim();
  return body.split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(Boolean)
    .slice(0, ABOUT_MAX_PARAGRAPHS)
    .map(mdToTypst);
}

// Top-3 highlights: mantiene la simetría visual de la grid (3 badges alineados)
// y evita meter métricas no-numéricas que rompan el patrón.
const HIGHLIGHTS_MAX = 3;

function loadHighlights(lang) {
  return loadByLang(join(CONTENT_DIR, "highlights"), lang)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .slice(0, HIGHLIGHTS_MAX)
    .map(h => ({ metric: String(h.metric ?? ""), label: String(h.label ?? "") }));
}

function loadExperience(lang, labels) {
  // El frontmatter usa `order: 1` para el trabajo más reciente. Un CV se lee
  // reverse-chronological → orden ASC por `order` = más reciente arriba.
  return loadByLang(join(CONTENT_DIR, "experience"), lang)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .map(e => {
      const bullets = extractBullets(e.__body);
      return {
        company: String(e.company ?? ""),
        role: String(e.role ?? ""),
        client: e.client ? String(e.client) : null,
        location: String(e.location ?? ""),
        stack: Array.isArray(e.stack) ? e.stack.map(String) : [],
        dateRange: formatDateRange(e.start, e.end, labels),
        bullets,
      };
    });
}

// Top-4 proyectos — es el máximo que cabe en pág 2 sin que se cuele un
// huérfano en pág 3 (aprovechando el hueco que dejan bootcamps + otros).
const PROJECTS_MAX = 4;

function loadProjects(lang) {
  return loadByLang(join(CONTENT_DIR, "projects"), lang)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .slice(0, PROJECTS_MAX)
    .map(p => ({
      title: String(p.title ?? ""),
      pitch: String(p.pitch ?? ""),
      stack: Array.isArray(p.stack) ? p.stack.map(String) : [],
      link: p.liveUrl ? String(p.liveUrl) : (p.repo ? String(p.repo) : ""),
    }));
}

// Mapping explícito de slugs a nombres humanos. Priorizamos siglas conocidas
// y el naming oficial de cada tecnología (Spring Boot, Node.js, discord.py…).
// Todo lo que no esté aquí cae al humanizador por defecto (title case + hyphens
// como espacios).
const SKILL_LABELS = {
  // Lenguajes
  "sql": "SQL",
  "javascript": "JavaScript",
  "typescript": "TypeScript",
  "lua": "Lua",
  "python": "Python",
  "java": "Java",
  // Frameworks
  "spring-boot": "Spring Boot",
  "spring-cloud": "Spring Cloud",
  "spring-security": "Spring Security",
  "junit": "JUnit",
  "mockito": "Mockito",
  "angular": "Angular",
  "ionic": "Ionic",
  "node-js": "Node.js",
  "discord-py": "discord.py",
  // Infra
  "docker": "Docker",
  "git": "Git",
  "jenkins": "Jenkins",
  "kafka": "Kafka",
  "kibana": "Kibana",
  "grafana": "Grafana",
  "linux": "Linux",
  "kubernetes": "Kubernetes",
  // DBs
  "postgresql": "PostgreSQL",
  "mongodb": "MongoDB",
  "db2": "DB2",
  "snowflake": "Snowflake",
  "sql-server": "SQL Server",
  // Métodos
  "scrum": "Scrum",
  "agile": "Agile",
  "code review": "Code review",
  "pair programming": "Pair programming",
  "tdd-básico": "TDD (básico)",
  "jwt": "JWT",
  "oauth2": "OAuth2",
  "rest api": "REST API",
};

function humanizeSkill(slug) {
  const key = String(slug).toLowerCase();
  if (SKILL_LABELS[key]) return SKILL_LABELS[key];
  // Fallback: hyphens → espacios, capitaliza cada palabra.
  return key
    .replace(/-/g, " ")
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function loadSkills(lang) {
  const raw = readFileSync(join(CONTENT_DIR, "skills", "skills.json"), "utf8");
  const s = JSON.parse(raw);
  return {
    languages: Object.keys(s.languages ?? {}).map(humanizeSkill),
    frameworks: Object.keys(s.frameworks ?? {}).map(humanizeSkill),
    infra: Object.keys(s.infra ?? {}).map(humanizeSkill),
    databases: Object.keys(s.databases ?? {}).map(humanizeSkill),
    methods: (s.methods ?? []).map(humanizeSkill),
  };
}

function loadEducation(lang) {
  const items = loadByLang(join(CONTENT_DIR, "education"), lang);
  if (items.length === 0) return { rows: [], sections: [] };
  const body = items[0].__body;

  // 1) Tabla principal
  const rows = [];
  const lineRe = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/gm;
  let m;
  let idx = 0;
  const strip = s => s.replace(/\*\*/g, "").replace(/\*(.+?)\*/g, "$1").trim();
  while ((m = lineRe.exec(body)) !== null) {
    idx += 1;
    if (idx <= 2) continue; // header + separator
    rows.push({ year: strip(m[1]), school: strip(m[2]), title: strip(m[3]) });
  }

  // 2) Secciones `## Título` con lista de bullets. Recogemos todas para no
  //    perder Bootcamps / Otros / etc.
  const sections = [];
  const sectionRe = /^##\s+(.+?)\s*$/gm;
  const marks = [];
  let sm;
  while ((sm = sectionRe.exec(body)) !== null) {
    marks.push({ title: sm[1].trim(), start: sm.index + sm[0].length });
  }
  for (let i = 0; i < marks.length; i++) {
    const startPos = marks[i].start;
    const endPos = i + 1 < marks.length ? marks[i + 1].start - marks[i + 1].title.length - 3 : body.length;
    const chunk = body.slice(startPos, endPos);
    const bullets = [];
    for (const line of chunk.split(/\r?\n/)) {
      const bm = line.match(/^\s*[-*]\s+(.*)$/);
      if (bm) bullets.push(strip(bm[1]).trim());
    }
    if (bullets.length > 0) sections.push({ title: marks[i].title, bullets });
  }

  return { rows, sections };
}

// ---------------------------------------------------------------------------
// Utilidades de fecha y bullets
// ---------------------------------------------------------------------------

const MONTHS_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MONTHS_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDate(raw, lang) {
  if (!raw) return "";
  const s = String(raw);
  const m = s.match(/^(\d{4})-(\d{2})/);
  if (!m) return s;
  const year = m[1];
  const monthIdx = parseInt(m[2], 10) - 1;
  const months = lang === "en" ? MONTHS_EN : MONTHS_ES;
  return `${months[monthIdx]} ${year}`;
}

function formatDateRange(start, end, labels) {
  const startTxt = formatDate(start, labels.lang);
  const endTxt = !end || end === "present" ? labels.present : formatDate(end, labels.lang);
  return `${startTxt} → ${endTxt}`;
}

/**
 * Extrae los bullets del body markdown. Cada bullet queda como una string
 * pasada al template (que la evalúa como markup Typst).
 * - Quita el "-" o "*" inicial.
 * - Convierte **bold** → *bold* de Typst.
 * - Escapa `_` (que en Typst es emphasis).
 */
function extractBullets(body) {
  if (!body) return [];
  const lines = body.split(/\r?\n/);
  const bullets = [];
  for (const l of lines) {
    const m = l.match(/^\s*[-*]\s+(.*)$/);
    if (m) bullets.push(mdToTypst(m[1].trim()));
  }
  return bullets;
}

/**
 * Convierte markdown inline mínimo a markup Typst.
 * Nuestro subset: **bold**, `code`. Escapamos caracteres peligrosos para Typst.
 */
function mdToTypst(md) {
  let out = md;
  // Escape Typst special chars we don't want interpreted from raw MD
  out = out.replace(/([#@$%&\\])/g, "\\$1");
  // **bold** → *bold*
  out = out.replace(/\*\*(.+?)\*\*/g, "*$1*");
  // `code` stays as `code` (Typst raw)
  return out;
}

// ---------------------------------------------------------------------------
// Labels por idioma
// ---------------------------------------------------------------------------

const LABELS = {
  es: {
    lang: "es",
    present: "presente",
    client: "cliente",
    contact: "Contacto",
    languages: "Lenguajes",
    frameworks: "Frameworks",
    infra: "Infraestructura",
    databases: "Bases de datos",
    methods: "Metodologías",
    spoken: "Idiomas",
    spanishNative: "Español · nativo",
    englishProfessional: "Inglés · profesional",
    profile: "Perfil",
    highlights: "Logros",
    experience: "Experiencia",
    projects: "Proyectos",
    education: "Educación",
  },
  en: {
    lang: "en",
    present: "present",
    client: "client",
    contact: "Contact",
    languages: "Languages",
    frameworks: "Frameworks",
    infra: "Infrastructure",
    databases: "Databases",
    methods: "Methods",
    spoken: "Spoken languages",
    spanishNative: "Spanish · native",
    englishProfessional: "English · professional",
    profile: "Profile",
    highlights: "Highlights",
    experience: "Experience",
    projects: "Projects",
    education: "Education",
  },
};

// ---------------------------------------------------------------------------
// Profile loader (mismo pattern que sync-content.mjs)
// ---------------------------------------------------------------------------

function extractProfileField(src, field) {
  const pattern = new RegExp(`${field}\\s*:\\s*["']([^"']+)["']`);
  const m = src.match(pattern);
  return m ? m[1] : undefined;
}

function loadProfile() {
  const p = join(WEB_DIR, "src", "profile.ts");
  const src = readFileSync(p, "utf8");
  return {
    fullName: extractProfileField(src, "fullName") ?? "",
    email: extractProfileField(src, "email") ?? "",
    githubUrl: extractProfileField(src, "githubUrl") ?? "",
    githubUser: extractProfileField(src, "githubUser") ?? "",
    linkedinUrl: extractProfileField(src, "linkedinUrl") ?? "",
  };
}

function locationFor(src, lang) {
  // location: { es: "...", en: "..." }  ← es un objeto, no un string
  const re = new RegExp(`location:\\s*\\{[^}]*${lang}\\s*:\\s*["']([^"']+)["']`, "s");
  const m = src.match(re);
  return m ? m[1] : "";
}

// ---------------------------------------------------------------------------
// Build data + render Typst
// ---------------------------------------------------------------------------

function buildData(lang) {
  const profile = loadProfile();
  const profileSrc = readFileSync(join(WEB_DIR, "src", "profile.ts"), "utf8");
  const labels = LABELS[lang];
  const location = locationFor(profileSrc, lang);

  const hasAvatar = existsSync(AVATAR_SRC);
  if (hasAvatar) {
    // Copiamos al dir de cv-pdf/ (no a build/) para que el path relativo
    // resuelva bien desde template.typ (que vive en cv-pdf/).
    copyFileSync(AVATAR_SRC, join(__dirname, "avatar.png"));
  }

  // Github/LinkedIn display: strip protocol for compactness
  const stripProto = url => url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  // El handle de LinkedIn tiene guiones (ismael-sanchez-aguilera-repullo).
  // Typst por defecto los trata como break-opportunity y al partir línea deja
  // "sanchez-" al final y "-aguilera" al principio → doble guion. Fix simple:
  // sustituir los guiones del handle por non-breaking hyphens (U+2011, glifo
  // idéntico) y dejar que Typst rompa en las `/`, que sí son punto de wrap
  // limpio. El href del link sigue siendo la URL original.
  const linkedinRaw = stripProto(profile.linkedinUrl).replace(/^www\./, "");
  const linkedinDisplay = linkedinRaw.replace(/-/g, "‑");

  return {
    fullName: profile.fullName,
    role: lang === "en"
      ? "Backend Developer · Java · Spring Boot"
      : "Desarrollador Backend · Java · Spring Boot",
    email: profile.email,
    location,
    githubUrl: profile.githubUrl,
    githubDisplay: `github.com/${profile.githubUser}`,
    linkedinUrl: profile.linkedinUrl,
    linkedinDisplay,
    hasAvatar,
    avatarPath: hasAvatar ? "avatar.png" : "",
    about: loadAbout(lang),
    highlights: loadHighlights(lang),
    experience: loadExperience(lang, labels),
    projects: loadProjects(lang),
    education: loadEducation(lang),
    skills: loadSkills(lang),
  };
}

function jsonToTypst(value) {
  // Serialize JS value to Typst literal via a temporary JSON file the template loads.
  // Simpler: we write data.json and use `json("data.json")` in main.typ.
  return JSON.stringify(value);
}

function renderMainTyp(lang, dataFileName, labelsFileName) {
  return `
#import "../template.typ": cv
#let data = json("${dataFileName}")
#let labels = json("${labelsFileName}")
#cv(data, labels)
`;
}

// ---------------------------------------------------------------------------
// Typst runner (con fallback graceful)
// ---------------------------------------------------------------------------

function typstAvailable() {
  const r = spawnSync("typst", ["--version"], { shell: process.platform === "win32", stdio: "ignore" });
  return r.status === 0;
}

function runTypst(mainTyp, outPdf) {
  // --root al dir de cv-pdf/ para que main-*.typ (dentro de build/) pueda
  // hacer `#import "../template.typ"` y cargar avatar.png con path relativo.
  // --font-path a los TTFs de Inter bundleados en el repo — así el render es
  // determinístico entre local (Windows/mac) y CI (Linux). Se distribuyen 5
  // variantes (Regular, Bold, Italic, BoldItalic, SemiBold) — ~2MB total.
  const fontDir = join(__dirname, "fonts");
  const args = ["compile", mainTyp, outPdf, "--root", __dirname];
  if (existsSync(fontDir)) args.push("--font-path", fontDir);
  const r = spawnSync("typst", args, {
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  if (r.status !== 0) throw new Error(`typst compile falló para ${mainTyp}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  if (!existsSync(CONTENT_DIR)) {
    console.error(`[cv-pdf] No existe ${CONTENT_DIR} — ejecuta 'pnpm --filter web sync' primero.`);
    process.exit(1);
  }

  const available = typstAvailable();
  if (!available) {
    console.warn(`[cv-pdf] typst no encontrado en PATH — los PDFs no se regenerarán en este build.`);
    console.warn(`[cv-pdf] Instala con: winget install typst  |  brew install typst  |  cargo install --locked typst-cli`);
    // Falla suave: no romper el build local si el dev no tiene typst instalado.
    // En CI, el workflow instala typst antes de correr esto.
    process.exit(0);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  mkdirSync(PUBLIC_DIR, { recursive: true });

  for (const lang of LANGS) {
    const data = buildData(lang);
    const labels = LABELS[lang];
    const dataFile = join(OUT_DIR, `data-${lang}.json`);
    const labelsFile = join(OUT_DIR, `labels-${lang}.json`);
    const mainFile = join(OUT_DIR, `main-${lang}.typ`);
    const outPdf = join(PUBLIC_DIR, `cv-${lang}.pdf`);

    writeFileSync(dataFile, jsonToTypst(data), "utf8");
    writeFileSync(labelsFile, jsonToTypst(labels), "utf8");
    writeFileSync(mainFile, renderMainTyp(lang, `data-${lang}.json`, `labels-${lang}.json`), "utf8");

    runTypst(mainFile, outPdf);
    console.log(`[cv-pdf] generado: ${outPdf}`);
  }
}

main();
