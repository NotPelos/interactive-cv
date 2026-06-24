# Despliegue — Free tier sin sorpresas

## Topología

- **Front (Astro)** → Cloudflare Pages → `xpelos.pages.dev`
- **Worker (GitHub proxy)** → Cloudflare Workers → `xpelos-api.<account>.workers.dev` (ruta `/api/github/*` desde el front)
- **Backend (Spring Boot)** → Fly.io → `xpelos-cv-api.fly.dev`

## Cloudflare Pages — Frontend

### Cuenta y free tier
- Cuenta gratis de Cloudflare.
- Free tier Pages: 500 builds/mes, ancho de banda **ilimitado**, requests ilimitadas.

### Configuración
- Conectar repo de GitHub al proyecto Pages.
- Build command: `pnpm --filter web build`
- Output dir: `apps/web/dist`
- Variables de entorno: ninguna sensible en build, todo público (`PUBLIC_API_URL`).
- Preview deployments en cada PR.

### Headers
Crear `apps/web/public/_headers` con la CSP de [SECURITY.md](SECURITY.md).

## Cloudflare Worker — Proxy GitHub

### Free tier
- 100.000 requests/día gratis. Más que suficiente.

### Configuración
- `wrangler.toml` con nombre `xpelos-api`.
- `wrangler deploy` desde CI.
- Secret `GITHUB_TOKEN` (PAT con `public_repo` scope si necesitamos quitar el rate limit anónimo) → `wrangler secret put GITHUB_TOKEN`.
- KV namespace `GITHUB_CACHE` para cachear respuestas 1h.

## Fly.io — Backend Spring Boot

### Free tier (actualizado 2026)
- Fly.io ya no tiene "always free" estricto; tiene crédito mensual de $5 que cubre **3 shared-cpu-1x con 256 MB** corriendo todo el mes. Suficiente para 1 instancia de Spring Boot con un poco de memoria.
- Auto-stop/auto-start activado → la app duerme con tráfico cero, se levanta on-demand (cold start ~5-10 s).

### Configuración
- `Dockerfile` multi-stage: build con Maven + JRE 21 alpine.
- `fly.toml` con `min_machines_running = 0`, `auto_stop_machines = true`.
- Memoria: 512 MB (suficiente con JVM tuneada: `-Xmx384m`).
- Region: `mad` (Madrid) o `cdg` (París) según latencia.
- Health check: `/actuator/health`.

### Variables
- `SPRING_PROFILES_ACTIVE=prod`
- Secrets via `fly secrets set`.

### Comandos
```bash
flyctl launch --no-deploy
flyctl deploy
flyctl secrets set KEY=value
flyctl logs
```

## CI/CD — GitHub Actions

3 workflows:

### `.github/workflows/web.yml`
Trigger: push a `main` o PR.
- Setup Node 20, pnpm.
- Install + lint + typecheck + build.
- `npm audit`.
- (Despliegue lo hace Cloudflare Pages automático al push.)

### `.github/workflows/worker.yml`
Trigger: push con cambios en `apps/worker/**`.
- Setup Node 20.
- `wrangler deploy` con `CLOUDFLARE_API_TOKEN` en secrets.

### `.github/workflows/api.yml`
Trigger: push con cambios en `apps/api/**`.
- Setup JDK 21, Maven.
- `mvn verify` + tests + OWASP dependency-check.
- `flyctl deploy` con `FLY_API_TOKEN` en secrets.

### `.github/workflows/security.yml`
Trigger: schedule semanal + push a `main`.
- CodeQL para JS y Java.
- Dependabot ya cubre alertas pasivas.

## Costes estimados

| Servicio | Coste |
|---|---|
| Cloudflare Pages | 0 € |
| Cloudflare Workers + KV | 0 € |
| Fly.io | 0 € (dentro del crédito $5) |
| GitHub | 0 € (repo público) |
| Dominio | 0 € (usamos `.pages.dev`) |
| **Total** | **0 €/mes** |

## Plan B si Fly.io deja de ser viable

Alternativas reevaluadas en orden:
1. **Oracle Cloud Free Tier** — ARM Ampere A1, 4 OCPU + 24 GB RAM gratis para siempre. Curva más empinada pero brutal.
2. **Koyeb** free (1 servicio nano).
3. **Hugging Face Spaces** con Docker (raro pero gratis).
4. Cambiar el PDF a generarlo en el Worker con una lib JS (perdemos showcase Java).

## Setup inicial (cuando toque)

1. Crear cuenta Cloudflare + Fly.io (xpelos23@gmail.com).
2. Crear app vacía en Pages, Worker y Fly.io.
3. Generar tokens y guardar en GitHub Secrets.
4. Conectar repo.
5. Primer deploy "hola mundo" en las 3 plataformas para verificar la pipeline.
