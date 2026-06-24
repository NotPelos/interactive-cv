import type { FsNode } from "./index.js";

const aboutContent = () =>
  `# Sobre mí

[Fase 3 — contenido real pendiente]

Placeholder temporal. Aquí irá el perfil profesional de NotPelos:
desarrollador backend con stack Java / Spring Boot, experiencia en
entornos enterprise y pasión por la automatización.

Escribe \`help\` para ver los comandos disponibles.`;

const experienceReadme = () =>
  `[Fase 3 — contenido real pendiente]

Este directorio contendrá las entradas de experiencia laboral
ordenadas por fecha.`;

const projectsReadme = () =>
  `[Fase 3 — contenido real pendiente]

Este directorio contendrá los proyectos destacados de NotPelos.`;

const skillsContent = () =>
  `{
  "_note": "Fase 3 — contenido real pendiente",
  "languages": [],
  "frameworks": [],
  "tools": []
}`;

const educationContent = () =>
  `# Educación

[Fase 3 — contenido real pendiente]

Aquí irá la trayectoria académica y formativa de NotPelos.`;

const contactContent = () =>
  `BEGIN:VCARD
VERSION:3.0
FN:NotPelos
NOTE:[Fase 3 — contenido real pendiente]
END:VCARD`;

const secretsReadme = () =>
  `[acceso restringido — Fase 3]`;

/**
 * Virtual filesystem root children.
 * The tree mirrors /home/notpelos/ as defined in DESIGN.md.
 * Hidden nodes (prefix ".") are excluded from ls without -a flag (handled in ls command).
 */
export const seedFs: Record<string, FsNode> = {
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
            content: aboutContent,
          },
          experience: {
            type: "directory",
            name: "experience",
            children: {
              "README.md": {
                type: "file",
                name: "README.md",
                content: experienceReadme,
              },
            },
          },
          projects: {
            type: "directory",
            name: "projects",
            children: {
              "README.md": {
                type: "file",
                name: "README.md",
                content: projectsReadme,
              },
            },
          },
          "skills.json": {
            type: "file",
            name: "skills.json",
            content: skillsContent,
          },
          "education.md": {
            type: "file",
            name: "education.md",
            content: educationContent,
          },
          "contact.vcf": {
            type: "file",
            name: "contact.vcf",
            content: contactContent,
          },
          // Hidden directory — not shown by ls without -a (Fase 3)
          ".secrets": {
            type: "directory",
            name: ".secrets",
            children: {
              "easter-eggs.md": {
                type: "file",
                name: "easter-eggs.md",
                content: secretsReadme,
              },
            },
          },
        },
      },
    },
  },
};
