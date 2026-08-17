# Despliegue — Free tier sin sorpresas

## Topología

- **Front (Astro)** → Cloudflare Pages → `notpelos.pages.dev`
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
- Secret `VISIT_SALT` — string aleatorio largo usado para hashear IPs antes de guardar el flag "ya visto hoy". Sin este secret, `/api/visits/hit` degrada a solo lectura y el contador nunca sube. Generar con `openssl rand -hex 32` y aplicar con `wrangler secret put VISIT_SALT`. Rotarlo invalida los flags "seen" existentes (aparecen visitas repetidas hasta que expire el TTL de 48h) — hacerlo solo si sospechas fuga.
- KV namespace `GITHUB_CACHE` para cachear respuestas 1h. **También** almacena los contadores de visitas (`visits:total`, `visits:day:*`, `visits:seen:*`), así que borrarlo resetea el contador.

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
- `SPRING_PROFILES_ACTIVE=prod` (en `fly.toml`).
- `ALLOWED_ORIGIN` — dominio CORS permitido (default `https://notpelos.pages.dev`).
- **Contact form** (`POST /api/contact`) — todos son secrets, se meten con `flyctl secrets set`:
  - `TURNSTILE_SECRET_KEY` — de [dash.cloudflare.com](https://dash.cloudflare.com/?to=/:account/turnstile) → New site → Widget mode "Managed". Copia el "Secret key". Sin este secret, `/api/contact` degrada fail-closed (403).
  - `RESEND_API_KEY` — de [resend.com/api-keys](https://resend.com/api-keys). Sin él, `/api/contact` devuelve 502.
  - `RESEND_FROM` — opcional. Default `onboarding@resend.dev` (dominio sandbox de Resend, sin verificar). Para usar `hi@notpelos.dev` u otro, verifica el dominio en Resend primero.
  - `CONTACT_TO_EMAIL` — dirección donde llegan los mensajes (típicamente el email del owner).
- **Frontend Turnstile** (Cloudflare Pages env, misma UI que la site key del secret):
  - `PUBLIC_TURNSTILE_SITE_KEY` — la "Site key" pública del mismo widget. Va en el bundle JS del cliente.

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
- Setup Node 22 LTS, pnpm.
- Install + lint + typecheck + build.
- `pnpm audit`.
- (Despliegue lo hace Cloudflare Pages automático al push.)

### `.github/workflows/worker.yml`
Trigger: push con cambios en `apps/worker/**`.
- Setup Node 22 LTS.
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

## Branch protection (setup post-creación del repo)

Una vez el repo esté creado en GitHub y la primera CI haya pasado, activar desde
`Settings → Branches → Add rule` (o via `gh api`) con estos requisitos:

- **Branch name pattern**: `main`
- **Require a pull request before merging**: sí, con al menos **1 reviewer**.
- **Require status checks to pass before merging**: sí.
  - Required checks: `web / Lint · Typecheck · Build · Audit`
  - Required checks: `worker / Lint · Typecheck · Build dry-run · Audit`
  - Required checks: `api / Tests · Build · (OWASP dep-check)`
- **Require branches to be up to date before merging**: sí.
- **Do not allow bypassing the above settings**: sí (incluye admins).
- **Allow force pushes**: no.
- **Allow deletions**: no.
- **Require linear history**: sí (evita merge commits, obliga a rebase).

Comando de referencia (ajustar `OWNER/REPO`):
```bash
gh api repos/OWNER/REPO/branches/main/protection \
  --method PUT \
  --input - <<'EOF'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "web / Lint · Typecheck · Build · Audit",
      "worker / Lint · Typecheck · Build dry-run · Audit",
      "api / Tests · Build · (OWASP dep-check)"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

## Setup inicial (cuando toque)

1. Crear cuenta Cloudflare + Fly.io (xpelos23@gmail.com).
2. Crear app vacía en Pages, Worker y Fly.io.
3. Generar tokens y guardar en GitHub Secrets.
4. Conectar repo.
5. Primer deploy "hola mundo" en las 3 plataformas para verificar la pipeline.
