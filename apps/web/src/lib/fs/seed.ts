import type { FsNode } from "./index.js";
import type { Lang } from "../commands/types.js";

// ---------------------------------------------------------------------------
// Types for content collection entries passed from index.astro
// ---------------------------------------------------------------------------

export interface ContentEntry {
  id: string;
  body?: string;
  data: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Minimal deterministic seed used in tests (no filesystem I/O dependency).
// Mirrors the shape expected by existing tests: about.md, experience/, projects/,
// skills.json, education.md, contact.vcf, .secrets/
// ---------------------------------------------------------------------------

const minimalAbout =
  `# Sobre mí

Desarrollador backend con 4,5 años de experiencia en Java / Spring Boot.
Stack principal: Java, Spring Boot, Kafka, Docker, PostgreSQL.
`;

const minimalAboutEn =
  `# About me

Backend developer with 4.5 years of experience in Java / Spring Boot.
Main stack: Java, Spring Boot, Kafka, Docker, PostgreSQL.
`;

const minimalSkills =
  `{
  "languages": { "java": { "level": 5 }, "sql": { "level": 4 } },
  "frameworks": { "spring-boot": 5 },
  "infra": { "docker": 4 },
  "databases": { "postgresql": 4 },
  "methods": ["scrum"],
  "soft": ["Debug profundo"]
}`;

const minimalEducation =
  `# Educación

- 2016-2019: Técnico Superior DAM
- 2020-2021: CFGS Diseño de Videojuegos
`;

const minimalEducationEn =
  `# Education

- 2016-2019: Higher Technician in DAM (Software Development)
- 2020-2021: Higher Cert. in Video Game Design
`;

const minimalContact =
  `BEGIN:VCARD
VERSION:3.0
FN:youralias
EMAIL:you@example.com
URL:https://github.com/youralias
END:VCARD`;

const minimalSecretsReadme = `[acceso restringido]`;

// Mensaje placeholder visible antes de ejecutar `repos` por primera vez.
const githubReposPlaceholder = "(no data yet — run 'repos' first)";

function buildMinimalFs(lang: Lang): Record<string, FsNode> {
  return {
    var: {
      type: "directory",
      name: "var",
      children: {
        log: {
          type: "directory",
          name: "log",
          children: {
            github: {
              type: "directory",
              name: "github",
              children: {
                "repos.json": {
                  type: "file",
                  name: "repos.json",
                  content: githubReposPlaceholder,
                },
              },
            },
          },
        },
      },
    },
    home: {
      type: "directory",
      name: "home",
      children: {
        notpelos: {
          type: "directory",
          name: "notpelos",
          children: {
            "about.md": {
              type: "file",
              name: "about.md",
              content: lang === "en" ? minimalAboutEn : minimalAbout,
            },
            experience: {
              type: "directory",
              name: "experience",
              children: {
                "2025-aubay.md": {
                  type: "file",
                  name: "2025-aubay.md",
                  content:
                    lang === "en"
                      ? "# Aubay\n\nSoftware Developer · Nov 2025 → present"
                      : "# Aubay\n\nSoftware Developer · Nov 2025 → presente",
                },
                "2023-softtek.md": {
                  type: "file",
                  name: "2023-softtek.md",
                  content:
                    lang === "en"
                      ? "# Softtek\n\nSoftware Developer · Jan 2023 → Nov 2024"
                      : "# Softtek\n\nSoftware Developer · Ene 2023 → Nov 2024",
                },
              },
            },
            projects: {
              type: "directory",
              name: "projects",
              children: {
                "authservicegame.md": {
                  type: "file",
                  name: "authservicegame.md",
                  content:
                    lang === "en"
                      ? "# AuthServiceGame\n\nPlaytime tracker built with microservices."
                      : "# AuthServiceGame\n\nTracker de tiempo de juego.",
                },
              },
            },
            "skills.json": {
              type: "file",
              name: "skills.json",
              content: minimalSkills,
            },
            "education.md": {
              type: "file",
              name: "education.md",
              content: lang === "en" ? minimalEducationEn : minimalEducation,
            },
            "contact.vcf": {
              type: "file",
              name: "contact.vcf",
              content: minimalContact,
            },
            ".secrets": {
              type: "directory",
              name: ".secrets",
              children: {
                "easter-eggs.md": {
                  type: "file",
                  name: "easter-eggs.md",
                  content: minimalSecretsReadme,
                },
              },
            },
          },
        },
      },
    },
  };
}

export function getMinimalSeed(lang: Lang = "es"): Record<string, FsNode> {
  return buildMinimalFs(lang);
}

// Extrae el slug limpio de un entry.id del glob loader de Astro.
// Astro 6 glob loader normaliza el stem del filename: "2025-aubay.es.md"
// puede generar el id "2025-aubayes" (concatena slug+lang, quita puntos y extensión).
// Estrategia: quitar prefix, extensión .md, sufijo ".es"/".en" con punto,
// y finalmente los últimos 2 chars si son "es"/"en" (formato Astro 6 normalizado).
function extractSlug(id: string, prefix: string): string {
  // Quita prefix de colección si el glob loader lo incluye (e.g. "experience/slug")
  // Usamos slice manual en lugar de new RegExp(prefix) para evitar lint security/detect-non-literal-regexp
  const withPrefix = `${prefix}/`;
  let s = id.startsWith(withPrefix) ? id.slice(withPrefix.length) : id;
  // Quita extensión .md si el glob loader la incluye en el id
  if (s.endsWith(".md")) s = s.slice(0, -3);
  // Quita sufijo ".es"/".en" con punto (formato con extensión explícita en el id)
  if (s.endsWith(".es") || s.endsWith(".en")) s = s.slice(0, -3);
  // Astro 6 normaliza "slug.es.md" → "slughtmles" (sin punto, 2 últimos chars son el lang code)
  else if (s.endsWith("es") || s.endsWith("en")) s = s.slice(0, -2);
  return s;
}

// ---------------------------------------------------------------------------
// Build virtual FS from Astro content collection entries (called at build time
// in index.astro — never in the browser or in tests).
// ---------------------------------------------------------------------------

// Phone number deliberately omitted — reversible channels only (email + social).
// Aligns with /cv recruiter view which doesn't expose phone either.
function makeContactContent(alias: string, email: string, githubUrl: string, linkedinUrl: string): string {
  // Strip protocol from linkedIn for NOTE field
  const linkedinNote = linkedinUrl.replace("https://www.", "").replace("https://", "");
  return `BEGIN:VCARD
VERSION:3.0
FN:${alias}
EMAIL:${email}
URL:${githubUrl}
NOTE:${linkedinNote}
END:VCARD`;
}

export interface ContactInfo {
  alias: string;
  email: string;
  githubUrl: string;
  linkedinUrl: string;
}

export function buildFsFromContent(
  collections: {
    about: ContentEntry[];
    experience: ContentEntry[];
    projects: ContentEntry[];
    education: ContentEntry[];
    skillsJson?: Record<string, unknown>;
  },
  lang: Lang = "es",
  contact?: ContactInfo
): Record<string, FsNode> {
  // Filter entries by lang
  const aboutEntries = collections.about.filter((e) => e.data["lang"] === lang);
  const expEntries = collections.experience.filter((e) => e.data["lang"] === lang);
  const projEntries = collections.projects.filter((e) => e.data["lang"] === lang);
  const eduEntries = collections.education.filter((e) => e.data["lang"] === lang);

  // --- about.md ---
  const aboutEntry = aboutEntries[0];
  // TODO: log when body is undefined — significa que la collection entry no tiene cuerpo
  const aboutContent = aboutEntry?.body ?? (lang === "en" ? minimalAboutEn : minimalAbout);
  const aboutFile: FsNode = {
    type: "file",
    name: "about.md",
    content: aboutContent,
  };

  // --- experience/ directory ---
  const expChildren: Record<string, FsNode> = {};
  const sortedExp = [...expEntries].sort((a, b) => {
    const oA = (a.data["order"] as number) ?? 99;
    const oB = (b.data["order"] as number) ?? 99;
    return oA - oB;
  });
  for (const entry of sortedExp) {
    const company = (entry.data["company"] as string) ?? "empresa";
    const role = (entry.data["role"] as string) ?? "";
    const start = (entry.data["start"] as string) ?? "";
    const end = (entry.data["end"] as string) ?? "";
    const location = (entry.data["location"] as string) ?? "";
    const stack = (entry.data["stack"] as string[]) ?? [];
    const client = entry.data["client"] as string | undefined;
    const body = entry.body ?? "";

    const clientLabel = lang === "en" ? "client" : "cliente";
    const header = [
      `# ${company}`,
      `**${role}**${client ? ` · ${clientLabel} ${client}` : ""}`,
      `**${start} → ${end}** · ${location}`,
      `Stack: ${stack.join(", ")}`,
      "",
    ].join("\n");

    const fullContent = header + body;
    const fileName = extractSlug(entry.id, "experience") + ".md";

    // fileName is derived from a trusted content entry id, not user input
    // eslint-disable-next-line security/detect-object-injection
    expChildren[fileName] = {
      type: "file",
      name: fileName,
      content: fullContent,
    };
  }

  // --- projects/ directory ---
  const projChildren: Record<string, FsNode> = {};
  const sortedProj = [...projEntries].sort((a, b) => {
    const oA = (a.data["order"] as number) ?? 99;
    const oB = (b.data["order"] as number) ?? 99;
    return oA - oB;
  });
  for (const entry of sortedProj) {
    const title = (entry.data["title"] as string) ?? "";
    const pitch = (entry.data["pitch"] as string) ?? "";
    const repo = entry.data["repo"] as string | undefined;
    const liveUrl = entry.data["liveUrl"] as string | undefined;
    const stack = (entry.data["stack"] as string[]) ?? [];
    const body = entry.body ?? "";

    const linkLines: string[] = [];
    if (repo) linkLines.push(`Repo: [${repo}](${repo})`);
    if (liveUrl) linkLines.push(`Live: [${liveUrl}](${liveUrl})`);

    const header = [
      `# ${title}`,
      `*${pitch}*`,
      `Stack: ${stack.join(", ")}`,
      ...linkLines,
      "",
    ].join("\n");

    const fullContent = header + body;
    const fileName = extractSlug(entry.id, "projects") + ".md";

    // fileName is derived from a trusted content entry id, not user input
    // eslint-disable-next-line security/detect-object-injection
    projChildren[fileName] = {
      type: "file",
      name: fileName,
      content: fullContent,
    };
  }

  // --- skills.json (lang-agnostic) ---
  const skillsContent = collections.skillsJson
    ? JSON.stringify(collections.skillsJson, null, 2)
    : minimalSkills;
  const skillsFile: FsNode = {
    type: "file",
    name: "skills.json",
    content: skillsContent,
  };

  // --- education.md ---
  const eduEntry = eduEntries[0];
  const defaultTitle = lang === "en" ? "Education" : "Educación";
  const eduTitle = (eduEntry?.data["title"] as string) ?? defaultTitle;
  // TODO: log when body is undefined — significa que la collection entry no tiene cuerpo
  const eduBody = eduEntry?.body ?? (lang === "en" ? minimalEducationEn : minimalEducation);
  const eduContent = `# ${eduTitle}\n\n${eduBody}`;
  const educationFile: FsNode = {
    type: "file",
    name: "education.md",
    content: eduContent,
  };

  return {
    var: {
      type: "directory",
      name: "var",
      children: {
        log: {
          type: "directory",
          name: "log",
          children: {
            github: {
              type: "directory",
              name: "github",
              children: {
                "repos.json": {
                  type: "file",
                  name: "repos.json",
                  content: githubReposPlaceholder,
                },
              },
            },
          },
        },
      },
    },
    home: {
      type: "directory",
      name: "home",
      children: {
        notpelos: {
          type: "directory",
          name: "notpelos",
          children: {
            "about.md": aboutFile,
            experience: {
              type: "directory",
              name: "experience",
              children: expChildren,
            },
            projects: {
              type: "directory",
              name: "projects",
              children: projChildren,
            },
            "skills.json": skillsFile,
            "education.md": educationFile,
            "contact.vcf": {
              type: "file",
              name: "contact.vcf",
              content: contact
                ? makeContactContent(contact.alias, contact.email, contact.githubUrl, contact.linkedinUrl)
                : minimalContact,
            },
            ".secrets": {
              type: "directory",
              name: ".secrets",
              children: {
                "easter-eggs.md": {
                  type: "file",
                  name: "easter-eggs.md",
                  content: "# Easter Eggs\n\nPrueba: sudo, rm -rf /, exit, vim, emacs, hack, hello",
                },
              },
            },
          },
        },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// seedFs — used as fallback when Terminal receives no initialFs prop.
// In production, index.astro passes the real FS. In tests, use getMinimalSeed().
// ---------------------------------------------------------------------------
export const seedFs: Record<string, FsNode> = getMinimalSeed("es");

// ---------------------------------------------------------------------------
// assertFsParity — verifica que dos árboles FS tienen los mismos paths.
// Lanza en build si hay asimetría entre la versión ES y EN del FS.
// ---------------------------------------------------------------------------

function collectPaths(node: FsNode, prefix: string): Set<string> {
  const paths = new Set<string>();
  paths.add(prefix);
  if (node.type === "directory") {
    for (const [childName, child] of Object.entries(node.children)) {
      const childPaths = collectPaths(child, `${prefix}/${childName}`);
      for (const p of childPaths) paths.add(p);
    }
  }
  return paths;
}

function collectFsPaths(fs: Record<string, FsNode>): Set<string> {
  const paths = new Set<string>();
  for (const [name, node] of Object.entries(fs)) {
    const nodePaths = collectPaths(node, name);
    for (const p of nodePaths) paths.add(p);
  }
  return paths;
}

export function assertFsParity(
  fsEs: Record<string, FsNode>,
  fsEn: Record<string, FsNode>
): void {
  const pathsEs = collectFsPaths(fsEs);
  const pathsEn = collectFsPaths(fsEn);

  for (const path of pathsEs) {
    if (!pathsEn.has(path)) {
      throw new Error(`FS asymmetry between langs at ${path} (present in es, missing in en)`);
    }
  }
  for (const path of pathsEn) {
    if (!pathsEs.has(path)) {
      throw new Error(`FS asymmetry between langs at ${path} (present in en, missing in es)`);
    }
  }
}
