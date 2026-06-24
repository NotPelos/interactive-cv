import type { FsNode } from "./index.js";

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

const minimalAbout = () =>
  `# Sobre mí

Desarrollador backend con 4,5 años de experiencia en Java / Spring Boot.
Stack principal: Java, Spring Boot, Kafka, Docker, PostgreSQL.
`;

const minimalSkills = () =>
  `{
  "languages": { "java": { "level": 5 }, "sql": { "level": 4 } },
  "frameworks": { "spring-boot": 5 },
  "infra": { "docker": 4 },
  "databases": { "postgresql": 4 },
  "methods": ["scrum"],
  "soft": ["Debug profundo"]
}`;

const minimalEducation = () =>
  `# Educación

- 2016-2019: Técnico Superior DAM
- 2020-2021: CFGS Diseño de Videojuegos
`;

const minimalContact = () =>
  `BEGIN:VCARD
VERSION:3.0
FN:NotPelos
EMAIL:ismaelprr10@gmail.com
URL:https://github.com/NotPelos
END:VCARD`;

const minimalSecretsReadme = () => `[acceso restringido]`;

export function getMinimalSeed(): Record<string, FsNode> {
  return {
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
              content: minimalAbout,
            },
            experience: {
              type: "directory",
              name: "experience",
              children: {
                "2025-aubay.md": {
                  type: "file",
                  name: "2025-aubay.md",
                  content: () => "# Aubay\n\nSoftware Developer · Nov 2025 → presente",
                },
                "2023-softtek.md": {
                  type: "file",
                  name: "2023-softtek.md",
                  content: () => "# Softtek\n\nSoftware Developer · Ene 2023 → Nov 2024",
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
                  content: () => "# AuthServiceGame\n\nTracker de tiempo de juego.",
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
              content: minimalEducation,
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

// ---------------------------------------------------------------------------
// Build virtual FS from Astro content collection entries (called at build time
// in index.astro — never in the browser or in tests).
// ---------------------------------------------------------------------------

function makeContactContent(): () => string {
  return () =>
    `BEGIN:VCARD
VERSION:3.0
FN:NotPelos
EMAIL:ismaelprr10@gmail.com
TEL:+34 696 320 615
URL:https://github.com/NotPelos
NOTE:linkedin.com/in/ismael-sanchez-aguilera-repullo
END:VCARD`;
}

export function buildFsFromContent(collections: {
  about: ContentEntry[];
  experience: ContentEntry[];
  projects: ContentEntry[];
  education: ContentEntry[];
  skillsJson?: Record<string, unknown>;
}): Record<string, FsNode> {
  // --- about.md ---
  const aboutEntry = collections.about[0];
  const aboutContent = aboutEntry?.body ?? minimalAbout();
  const aboutFile: FsNode = {
    type: "file",
    name: "about.md",
    content: () => aboutContent,
  };

  // --- experience/ directory ---
  const expChildren: Record<string, FsNode> = {};
  const sortedExp = [...collections.experience].sort((a, b) => {
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

    const header = [
      `# ${company}`,
      `**${role}**${client ? ` · cliente ${client}` : ""}`,
      `**${start} → ${end}** · ${location}`,
      `Stack: ${stack.join(", ")}`,
      "",
    ].join("\n");

    const fullContent = header + body;
    // Astro 6 glob loader strips the extension from the id; add .md back
    const rawId = entry.id.replace(/^experience\//, "");
    const fileName = rawId.endsWith(".md") ? rawId : rawId + ".md";

    // fileName is derived from a trusted content entry id, not user input
    // eslint-disable-next-line security/detect-object-injection
    expChildren[fileName] = {
      type: "file",
      name: fileName,
      content: () => fullContent,
    };
  }

  // --- projects/ directory ---
  const projChildren: Record<string, FsNode> = {};
  const sortedProj = [...collections.projects].sort((a, b) => {
    const oA = (a.data["order"] as number) ?? 99;
    const oB = (b.data["order"] as number) ?? 99;
    return oA - oB;
  });
  for (const entry of sortedProj) {
    const title = (entry.data["title"] as string) ?? "";
    const pitch = (entry.data["pitch"] as string) ?? "";
    const repo = (entry.data["repo"] as string) ?? "";
    const stack = (entry.data["stack"] as string[]) ?? [];
    const body = entry.body ?? "";

    const header = [
      `# ${title}`,
      `*${pitch}*`,
      `Stack: ${stack.join(", ")}`,
      `Repo: [${repo}](${repo})`,
      "",
    ].join("\n");

    const fullContent = header + body;
    // Astro 6 glob loader strips the extension from the id; add .md back
    const rawId = entry.id.replace(/^projects\//, "");
    const fileName = rawId.endsWith(".md") ? rawId : rawId + ".md";

    // fileName is derived from a trusted content entry id, not user input
    // eslint-disable-next-line security/detect-object-injection
    projChildren[fileName] = {
      type: "file",
      name: fileName,
      content: () => fullContent,
    };
  }

  // --- skills.json ---
  const skillsContent = collections.skillsJson
    ? JSON.stringify(collections.skillsJson, null, 2)
    : minimalSkills();
  const skillsFile: FsNode = {
    type: "file",
    name: "skills.json",
    content: () => skillsContent,
  };

  // --- education.md ---
  // Convention: MD bodies must NOT start with their own H1; the H1 is generated from the frontmatter title.
  const eduEntry = collections.education[0];
  const eduTitle = (eduEntry?.data["title"] as string) ?? "Educación";
  const eduBody = eduEntry?.body ?? minimalEducation();
  const eduContent = `# ${eduTitle}\n\n${eduBody}`;
  const educationFile: FsNode = {
    type: "file",
    name: "education.md",
    content: () => eduContent,
  };

  return {
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
              content: makeContactContent(),
            },
            ".secrets": {
              type: "directory",
              name: ".secrets",
              children: {
                "easter-eggs.md": {
                  type: "file",
                  name: "easter-eggs.md",
                  content: () =>
                    "# Easter Eggs\n\nPrueba: sudo, rm -rf /, exit, vim, emacs, hack, hello",
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
export const seedFs: Record<string, FsNode> = getMinimalSeed();
