# interactive-cv

CV interactivo de **NotPelos** ([Ismael Sánchez Aguilera Repullo](https://www.linkedin.com/in/ismael-sanchez-aguilera-repullo/)) — terminal hardcore Tokyo Night + microservicio Java de showcase, todo en free tier.

```
$ ls /home/notpelos/
about.md   experience/   projects/   skills.json   education.md   contact.vcf
```

## Stack

- **Frontend** — Astro + TypeScript + Tailwind · Cloudflare Pages
- **Backend** — Spring Boot 3 / Java 21 · Fly.io · genera el PDF del CV on-demand
- **GitHub proxy** — Cloudflare Worker cacheando la API de GitHub
- **Hosting** — `notpelos.pages.dev` (gratis)

## Layout del monorepo

```
apps/
├── web/         # Astro — terminal interactivo + vista recruiter
├── worker/      # Cloudflare Worker — GitHub API cache
└── api/         # Spring Boot — PDF del CV + visitas + Swagger
docs/            # PRD, arquitectura, diseño, seguridad, despliegue, roadmap
.claude/         # Subagentes para orquestación con Claude Code
```

## Desarrollo local

```bash
pnpm install              # instala web + worker
pnpm dev:web              # arranca Astro en localhost:4321
pnpm dev:worker           # arranca Worker en localhost:8787
cd apps/api && ./mvnw spring-boot:run   # arranca Spring Boot en localhost:8080
```

## Documentación

- [PRD](docs/PRD.md) — qué y por qué
- [Arquitectura](docs/ARCHITECTURE.md)
- [Diseño](docs/DESIGN.md) — UX y paleta Tokyo Night
- [Contenido](docs/CONTENT.md) — el CV en sí
- [Seguridad](docs/SECURITY.md)
- [Despliegue](docs/DEPLOYMENT.md)
- [Roadmap](docs/ROADMAP.md)

## Licencia

MIT — el código sí, el contenido del CV es mío.
