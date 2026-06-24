# Roadmap

Fases en orden ejecutable. Cada una termina con una entrega revisable.

## Fase 0 — Diseño y docs ✅
- [x] PRD, Arquitectura, Diseño, Seguridad, Despliegue, Agentes, Roadmap.
- [x] Definiciones de subagentes en `.claude/agents/`.
- [ ] **Pulir DESIGN.md** (wireframes, animaciones, formato `neofetch`).
- [ ] Rellenar parcialmente `CONTENT.md` (al menos identidad + 1 puesto).

## Fase 1 — Andamiaje del repo
- [ ] Iniciar git, repo público en GitHub.
- [ ] Crear monorepo: `apps/web`, `apps/worker`, `apps/api`.
- [ ] `pnpm workspaces` configurado.
- [ ] `apps/web`: Astro inicializado con Tailwind, TS, sitemap.
- [ ] `apps/worker`: Wrangler init, hello world.
- [ ] `apps/api`: Spring Boot 3 + Java 21 con un `/actuator/health`.
- [ ] Linters: ESLint + Prettier (web/worker), Checkstyle (api).
- [ ] GitHub Actions: CI básico (build + lint + test) para los 3 paquetes.
- [ ] Branch protection en `main`.

**Entrega**: 3 hello-world desplegados (Pages, Worker, Fly.io) bajo dominios `.pages.dev`, `.workers.dev`, `.fly.dev`.

## Fase 2 — Terminal mínimo viable
- [ ] Componente `Terminal.tsx` (island `client:load`).
- [ ] Loop de input + render de líneas + cursor.
- [ ] Comandos: `help`, `clear`, `whoami`, `pwd`, `ls`, `cd`, `cat`, `history`.
- [ ] Filesystem virtual con seed mínimo (about.md placeholder).
- [ ] Tema Tokyo Night aplicado.
- [ ] Autocompletado con Tab.
- [ ] Historial con flechas.

**Entrega**: terminal navegable en local con 8 comandos.

## Fase 3 — Contenido y filesystem real
- [ ] Content collections para `experience/`, `projects/`.
- [ ] `cat` renderiza MD bonito.
- [ ] `tree` ASCII.
- [ ] `neofetch` con CV en ASCII art.
- [ ] `grep`, `find`, `man`.
- [ ] **Rellenar CONTENT.md completo** (esto lo hace xpelos).

## Fase 4 — i18n
- [ ] Comando `lang es|en`.
- [ ] Autodetección del navegador.
- [ ] Persistencia en localStorage.
- [ ] Todos los mensajes del terminal pasan por i18n.

## Fase 5 — Vista recruiter
- [ ] Página `/cv` con layout clásico.
- [ ] Imprimible.
- [ ] Comando `recruiter` + botón discreto.
- [ ] SEO: meta tags, OG, JSON-LD `Person`.

## Fase 6 — Integraciones vivas
- [ ] Worker GitHub proxy con cache KV 1h.
- [ ] Comando `repos` o `ls /var/log/github/`.
- [ ] Microservicio Java: endpoint `/api/cv/pdf`.
- [ ] Comando `download cv.pdf`.
- [ ] Modo degradado si Fly.io duerme (PDF fallback estático).
- [ ] Swagger público.

## Fase 7 — AI fake + easter eggs
- [ ] Comando `ai` con matcher por keywords.
- [ ] Easter eggs: `sudo`, `rm -rf /`, `vim`, `exit`, Konami.
- [ ] `whoami` con detección de user-agent.

## Fase 8 — Endurecimiento y a11y
- [ ] CSP y headers de seguridad.
- [ ] Auditoría completa de `security-auditor`.
- [ ] Playwright e2e para los flujos críticos.
- [ ] axe a11y verde.
- [ ] Lighthouse ≥ 95 en las 4 categorías.
- [ ] Móvil: chips de comandos clicables.

## Fase 9 — Lanzamiento
- [ ] Revisión final con `code-reviewer` + `security-auditor`.
- [ ] Conectar dominio (queda en `.pages.dev` hasta que se compre uno).
- [ ] Compartir en LinkedIn / Twitter dev (opcional).
- [ ] `INCIDENTS.md` creado vacío para cuando haga falta.

## Fase 10+ (futuro, fuera de MVP)
- IA real con LLM (cuando haya presupuesto o créditos).
- Blog.
- Métricas con Plausible self-hosted.
- Dark/light toggle (¿necesario? Tokyo Night es dark de cuna).
- Tema "rainbow" Konami permanente.
- Comando `vim` que abra un editor real (loco pero divertido).
