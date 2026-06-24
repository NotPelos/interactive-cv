# Arquitectura

## Diagrama de componentes

```
┌─────────────────────────────────────────────────────────────┐
│  Usuario (browser)                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare Pages — notpelos.pages.dev                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Astro app (SSG + islands)                            │  │
│  │  - Terminal component (TS, vanilla, no framework UI)  │  │
│  │  - Filesystem virtual en JSON/MD                      │  │
│  │  - i18n via Astro content collections                 │  │
│  │  - Vista "recruiter" pre-renderizada estática         │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────┬─────────────────────────────────┬────────────────┘
           │                                 │
           │ /api/github/* (proxy)           │ /api/cv.pdf
           ▼                                 ▼
┌──────────────────────────┐   ┌─────────────────────────────┐
│  Cloudflare Worker       │   │  Spring Boot — Fly.io       │
│  - Cache GitHub API 1h   │   │  - GET /api/cv/pdf          │
│  - Rate-limit por IP     │   │  - GET /api/visits          │
│  - CORS estricto         │   │  - GET /swagger-ui          │
└──────────────┬───────────┘   │  - Health check / wake      │
               │               └─────────────────────────────┘
               ▼
       ┌───────────────┐
       │  GitHub API   │
       └───────────────┘
```

## Decisiones técnicas

### Por qué Astro (no Next/SvelteKit)
- SSG por defecto → Lighthouse máximo, cero JS en páginas estáticas.
- "Islands" → el terminal carga JS solo donde hace falta.
- SEO brutal sin esfuerzo (la vista recruiter es HTML puro).
- Content collections con type-safety para el CV bilingüe.

### Por qué Spring Boot en Fly.io
- Showcase real del stack del autor.
- Fly.io tiene 3 VMs gratis y permite Java sin trampa (Render duerme, Railway ya no es free).
- El PDF se genera con OpenPDF/iText (sin Chromium pesado).
- Swagger público = parte del CV.

### Por qué Cloudflare Worker intermedio
- Esconde cualquier token de GitHub (PAT si llega a hacer falta).
- Cachea respuestas 1h → no quemamos rate limit.
- CSP-friendly: el frontend solo habla con `same-origin`.

### Modo degradado
Si Fly.io está caído o despertando:
- PDF → fallback a PDF estático pre-generado en build.
- Visits → se ocultan, no rompe nada.
- `ai` comando → siempre local, no depende del back.

## Estructura de repositorio (propuesta)

```
/
├── apps/
│   ├── web/                 # Astro
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   └── terminal/
│   │   │   ├── content/     # MD del CV (bilingüe)
│   │   │   ├── pages/
│   │   │   └── lib/
│   │   │       ├── fs/      # filesystem virtual
│   │   │       └── commands/
│   │   ├── public/
│   │   └── astro.config.mjs
│   ├── worker/              # Cloudflare Worker GitHub proxy
│   └── api/                 # Spring Boot
│       ├── src/main/java/
│       └── pom.xml
├── docs/
├── .claude/
│   └── agents/
└── .github/workflows/       # CI/CD
```

Monorepo simple con pnpm workspaces para el lado JS y Maven aparte para Java.

## Versiones objetivo

- Node 22 LTS, pnpm 10
- Astro 6.x, TypeScript 5.x, Tailwind 3.x, Preact 10
- Java 21 LTS, Spring Boot 3.x, Maven 3.9
- Wrangler 4.x para el Worker

## Dependencias añadidas (justificadas)

### Caffeine 3.1.8 (apps/api)
Reemplaza el `ConcurrentHashMap` ilimitado en `RateLimitConfig` con una cache
LRU acotada (`maximumSize=10 000`, `expireAfterAccess=10 min`). La razón es
seguridad: un atacante con N IPs distintas podría llenar el heap de la JVM con
la implementación anterior. Caffeine (Apache 2.0) es la librería de cache
in-process estándar en el ecosistema Java/Spring. Documentado también en
`SECURITY.md`.

## Performance budget

- JS inicial < 50 KB (terminal solo).
- Vista recruiter: 0 JS, HTML/CSS puro.
- LCP < 1.5 s, CLS < 0.05, INP < 200 ms.
