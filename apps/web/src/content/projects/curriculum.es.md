---
title: Curriculum
pitch: El CV que estás leyendo, construido con orquestación de subagentes IA. El código es la evidencia.
repo: https://github.com/NotPelos/curriculum
stack: ["Astro", "Preact", "TypeScript", "Tailwind", "Spring Boot", "Cloudflare Pages", "Cloudflare Workers", "Fly.io", "GitHub Actions"]
lang: es
order: 8
---

Terminal interactivo Tokyo Night + microservicio Java sirviendo el PDF on-demand + Cloudflare Worker cacheando la GitHub API. Todo en free tier. El repo está abierto porque **el código es el CV**.

354 tests (263 unit + 91 e2e/a11y). Lighthouse ≥ 95. 0 vulnerabilidades altas en audit.

La metodología es la parte que no se suele ver: **9 subagentes Claude Code** — architect, frontend-dev, backend-dev, content-writer, devops, qa-tester, security-auditor, code-reviewer, astro-tutor — orquestados desde una sesión principal. Cada ciclo: orquestador asigna → obrero ejecuta → code-reviewer + security-auditor validan (bloqueantes) → merge. ~10 horas distribuidas de cero a producción con free tiers.

Los subagentes siguen en `.claude/agents/` si quieres auditar el proceso.
