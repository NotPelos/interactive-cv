# Curriculum — Contexto del proyecto

CV interactivo de **Ismael Sánchez Aguilera Repullo** (alias público **NotPelos** · GitHub: [github.com/NotPelos](https://github.com/NotPelos)) con estética de **terminal hardcore Tokyo Night**. Modo dual: terminal para devs + vista clásica para reclutadores no técnicos.

> **Regla de alias importante:** Todo lo visible al visitante usa **NotPelos** (prompt del terminal, `whoami`, `neofetch`, wordmark, contacto). Internamente, rutas y docs pueden seguir usando "xpelos" como alias del proyecto. Ver [memory/project-alias.md](../../.claude/projects/F--Curriculum/memory/project-alias.md) y [docs/CONTENT.md](docs/CONTENT.md) sección 0.

## Stack

- **Frontend**: Astro + TypeScript + Tailwind → Cloudflare Pages
- **Backend**: Spring Boot (Java) microservicio showcase → Fly.io (free tier)
- **Repos en vivo**: GitHub API cacheada en Cloudflare Worker
- **Dominio**: `notpelos.pages.dev` (gratis, sin dominio propio por ahora)
- **PDF del CV**: generado on-demand por el microservicio Java
- **i18n**: ES/EN vía comando `lang es|en` + autodetección inicial

## Filosofía

- Terminal hardcore: arranca en negro, se descubre con `help`.
- Asistente IA fake con guion (sin coste, sin alojar).
- Modo reclutador accesible vía comando `recruiter` o botón discreto.
- La web **es** el CV demostrado, no solo contado (Swagger del backend Java público).

## Cómo trabajamos (orquestador + subagentes)

El flujo es:
1. Usuario manda petición.
2. Orquestador (sesión principal) la repasa y delega en subagentes (`.claude/agents/`).
3. Cada subagente hace su parte. `code-reviewer` y `security-auditor` validan antes de cerrar.
4. Si algo falla la revisión, vuelve al ciclo.
5. Todo cambio de decisión se documenta en `docs/`.

Asignación de modelos: **Opus** para diseño/revisión/seguridad, **Sonnet** para implementación.

## Documentación clave

- [PRD](docs/PRD.md) — qué construimos y por qué
- [Arquitectura](docs/ARCHITECTURE.md) — stack y decisiones
- [Diseño](docs/DESIGN.md) — UX, comandos, paleta
- [Contenido](docs/CONTENT.md) — CV bilingüe (rellenar)
- [Seguridad](docs/SECURITY.md) — modelo de amenazas
- [Despliegue](docs/DEPLOYMENT.md) — Cloudflare + Fly.io
- [Agentes](docs/AGENTS.md) — equipo y responsabilidades
- [Astro learning](docs/LEARNING-ASTRO.md) — chuleta para entrevistas
- [Roadmap](docs/ROADMAP.md) — fases en orden ejecutable

## Reglas de trabajo

- Idioma de docs y comentarios: **español**. Código: **inglés** (variables, funciones, commits).
- No introducir dependencias sin justificarlas en `ARCHITECTURE.md`.
- Toda feature pasa por `security-auditor` antes de merge.
- Sin secretos en repo. Cloudflare/Fly.io tokens vía variables de entorno.
