# Setup de deploy — guía paso a paso

Esta guía es lo que **tú (NotPelos) tienes que ejecutar** para activar el deploy real. Claude no puede tocar tus cuentas ni manejar tus tokens.

Sigue las secciones en orden. Cada bloque empieza con un comando o paso atómico.

---

## 0. Prerequisitos

- Cuenta GitHub ✓ (ya hecho — `NotPelos/interactive-cv`)
- Cuenta Cloudflare ✓ (confirmaste que la tienes)
- Cuenta Fly.io ⏳ (pendiente — cuando la tengas hacemos Fase 9B)
- `gh` CLI autenticado ✓
- `wrangler` CLI instalado ✓ (4.x global)

---

## 1. Cloudflare API token

1. Ve a https://dash.cloudflare.com/profile/api-tokens
2. **Create Token** → **Get started (Custom token)**
3. Nombre: `interactive-cv-deploy`
4. Permisos:
   - **Account** · `Cloudflare Pages` · **Edit**
   - **Account** · `Workers Scripts` · **Edit**
   - **Account** · `Workers KV Storage` · **Edit**
   - **User** · `User Details` · **Read**
5. Account Resources: incluir solo tu cuenta personal.
6. Zone Resources: ninguna (no usamos dominio propio aún).
7. TTL: sin expiración (puedes rotar manualmente).
8. **Create Token** → **copia el valor inmediatamente** (no se vuelve a mostrar).

## 2. Cloudflare Account ID

1. En el dashboard de Cloudflare, panel derecho → **Account ID** (32 caracteres hex).
2. Copia el valor.

## 3. Registrar secretos en GitHub

Desde la raíz del repo, con `gh` autenticado:

```bash
gh secret set CLOUDFLARE_API_TOKEN --repo NotPelos/interactive-cv
# (pega el token cuando lo pida)

gh secret set CLOUDFLARE_ACCOUNT_ID --repo NotPelos/interactive-cv
# (pega el account id)
```

Verifica con:
```bash
gh secret list --repo NotPelos/interactive-cv
```

## 4. Autenticar wrangler localmente

```bash
wrangler login
```
Abre el browser, autoriza. Confirma con:
```bash
wrangler whoami
```

## 5. Crear KV namespace para el Worker

```bash
cd apps/worker
wrangler kv:namespace create GITHUB_CACHE
```

La salida será algo como:
```
🌀  Creating namespace with title "notpelos-api-GITHUB_CACHE"
✨  Success!
Add the following to your configuration file in your kv_namespaces array:
{ binding = "GITHUB_CACHE", id = "abc123def456..." }
```

**Copia el `id`** y dímelo (o edita tú mismo `apps/worker/wrangler.toml` reemplazando `PLACEHOLDER_REPLACE_BEFORE_DEPLOY` por ese id).

## 6. (Opcional) GitHub Personal Access Token para el Worker

Si quieres que el Worker use un PAT para subir el rate limit de GitHub a 5000/h (en vez de 60/h anónimo):

1. https://github.com/settings/personal-access-tokens/new
2. Token tipo **fine-grained**.
3. Nombre: `interactive-cv-worker`.
4. Repository access: **Public Repositories (read-only)**.
5. Permisos: ninguno explícito (solo lectura pública por defecto).
6. Generar y copiar.

Luego:
```bash
cd apps/worker
wrangler secret put GITHUB_TOKEN
# (pega el PAT cuando lo pida)
```

Esto guarda el secret directamente en Cloudflare, NO en GitHub. El Worker lo lee via `env.GITHUB_TOKEN`. Sin este paso, el Worker funciona en modo anónimo (suficiente para tráfico bajo).

## 7. Crear proyecto Cloudflare Pages

Opción A (recomendada, automatizada):
```bash
cd apps/web
wrangler pages project create notpelos-cv \
  --production-branch=main \
  --compatibility-date=2026-06-24
```

Opción B (dashboard):
- https://dash.cloudflare.com/?to=/:account/pages
- **Create application** → **Pages** → **Direct upload** (NO Git, lo deployamos vía Actions).
- Nombre: `notpelos-cv`.
- Production branch: `main`.

Tras esto el dominio público será `notpelos-cv.pages.dev`.

> ⚠️ El dominio que hemos venido referenciando en docs es `notpelos.pages.dev`. Si quieres ese exacto, comprueba que `notpelos` esté disponible cuando hagas el `pages project create`. Si no, ajustamos los docs al nombre real.

## 8. Confirmarme y empujamos

Cuando hayas hecho 1-7, dime:
- El KV namespace `id`.
- El nombre final del proyecto Pages (notpelos-cv o el que haya quedado).
- Si añadiste el `GITHUB_TOKEN` o no.

Yo me encargo de:
- Actualizar `apps/worker/wrangler.toml` con el KV id.
- Añadir steps de deploy a los workflows `web.yml` y `worker.yml` (`wrangler deploy` + `wrangler pages deploy`).
- Ajustar dominios en `_headers` y CSP si el nombre del proyecto difiere.
- Hacer commit + push → primer deploy en vivo.

---

## Fase 9B — Fly.io (cuando crees la cuenta)

Pendiente. Cuando termines de registrarte en https://fly.io y añadir tarjeta:

1. Email-recovery activa.
2. Tarjeta añadida (free tier requiere — no cobra hasta superar el crédito $5/mes).
3. Crear token API en https://fly.io/user/personal_access_tokens.
4. Registrar en GitHub Secrets como `FLY_API_TOKEN`.
5. Decirme y completo el flujo: `flyctl launch --no-deploy` + secrets + workflow.

---

## Recuperación / rotación

Si algún token se filtra o cambias de email:

```bash
# Rotar Cloudflare token: dashboard → API Tokens → Roll
# Rotar GitHub Secret:
gh secret set CLOUDFLARE_API_TOKEN --repo NotPelos/interactive-cv

# Rotar GitHub PAT del Worker:
wrangler secret put GITHUB_TOKEN
```

Documenta cualquier incidente en `docs/INCIDENTS.md` (crear cuando ocurra).
