# Seguridad

> Auditado y mantenido por el subagente `security-auditor` (Opus). Toda feature pasa por aquí.

## Modelo de amenazas

| Activo | Amenaza | Impacto | Prioridad |
|---|---|---|---|
| Frontend (terminal) | XSS via input del user en comandos | Alto (robo de localStorage, redirect) | **Crítica** |
| Worker GitHub proxy | Abuso del proxy (free-rider) | Medio (rate limit) | Alta |
| Backend Spring Boot | DoS / abuso del endpoint PDF | Medio (Fly.io tira) | Alta |
| Backend Spring Boot | SSRF, RCE via parámetros | Crítico | **Crítica** |
| Repo público | Filtración de secretos | Crítico | **Crítica** |
| GitHub PAT (si se usa) | Filtración del token | Alto | Alta |

## Controles obligatorios

### Frontend
- **Sanitización estricta** del input del terminal antes de mostrarlo. Nunca `innerHTML` con string del user — usar `textContent` o sanitizer (DOMPurify si se necesita renderizar MD).
- **CSP estricta** vía `_headers` de Cloudflare Pages:
  ```
  Content-Security-Policy: default-src 'self';
    script-src 'self';
    style-src 'self' 'unsafe-inline';
    img-src 'self' https://avatars.githubusercontent.com data:;
    font-src 'self';
    connect-src 'self' https://*.fly.dev https://*.workers.dev;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
  ```
- **Decisión sobre fuentes (2026-06-24):** JetBrains Mono se **selfhostea** vía `@fontsource/jetbrains-mono` o subset propio en `public/fonts/`. NO se carga desde Google Fonts. Esto mantiene `font-src 'self'` puro y evita relajar la CSP. Pendiente de aplicar en `apps/web/` antes del primer deploy a Cloudflare Pages (Fase 2).
- **`connect-src` incluye `*.workers.dev`** para el proxy de GitHub (Cloudflare Worker). Cuando se conozca el subdominio exacto del Worker, restringir al host concreto en lugar del wildcard.
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- **No `eval`, no `Function()`, no `dangerouslySetInnerHTML`**. Linter lo bloquea.

### Worker (Cloudflare)
- Whitelist de endpoints permitidos (`/api/github/profile`, `/api/github/repos`, `/api/visits`, `/api/visits/hit`).
- Rate limit por IP: 30 req/min con `cf.cacheKey`.
- CORS: solo `https://notpelos.pages.dev`.
- Si se usa PAT: en secret de Cloudflare, **nunca** en código.
- Logs sin datos personales.
- **Contador de visitas**:
  - IPs se hashean con SHA-256(salt || ip || day) antes de guardar el flag "seen" en KV; el salt (`VISIT_SALT`) es un secreto crítico — su fuga permite reversar hashes por diccionario (~4B IPv4). Rotable con `wrangler secret put VISIT_SALT` (invalida los flags "seen" existentes hasta que expire su TTL de 48h).
  - `/api/visits/hit` exige header `Origin` presente → bloquea `curl` y scripts sin browser. `/api/visits` (lectura) sigue accesible desde cualquier cliente.
  - Cap diario de escrituras (`WRITE_CAP_PER_DAY = 500`) para blindar el free tier de KV (1000 writes/día) de un pool IP-rotating: cuando se llega al cap, `/hit` degrada a solo lectura hasta las 00:00 UTC.
  - Sin salt configurado → `/hit` degrada a solo lectura (fail-closed).

### Backend (Spring Boot)
- **Spring Security** activo aunque no haya auth — para gestionar headers y CORS.
- Endpoints públicos del MVP: `GET /api/cv/pdf`, `GET /api/visits`, `GET /actuator/health`.
- Resto: `denyAll()`.
- **Rate limiting** con Bucket4j (60 req/min por IP en `/cv/pdf`).
- Validación con `jakarta.validation` en cualquier parámetro.
- Headers HTTP de seguridad equivalentes a los del frontend.
- Dependencias auditadas con OWASP Dependency-Check en CI.
- Sin endpoints `/actuator/*` expuestos salvo `health` y `info` (sin git/env).
- **No deserializar JSON sin tipo** (sin `Object`, sin `Map<String,Object>` en bodies).
- Logs estructurados con tracing, sin PII.

### Repo
- `.gitignore` cubre `.env`, `*.pem`, `application-secrets.*`.
- **Pre-commit hook** con `gitleaks` o `git-secrets`.
- **Branch protection** en `main`: PR obligatorio, status checks verdes.
- **Dependabot** activo.
- **CodeQL** en GitHub Actions para JS y Java.
- Secret scanning de GitHub activo.

## CI security gates

Antes de merge a `main`:
1. `npm audit --audit-level=high` → 0 hallazgos.
2. OWASP Dependency-Check (Maven) → 0 críticas.
3. CodeQL → 0 alertas críticas o altas.
4. ESLint con `eslint-plugin-security` → 0 errores.
5. `security-auditor` agente da OK manual.

## Checklist OWASP Top 10 (revisar al final)

- [ ] A01 Broken Access Control → no hay auth, todo público read-only.
- [ ] A02 Cryptographic Failures → HTTPS forzado, sin datos sensibles persistidos.
- [ ] A03 Injection → validación + sin SQL dinámico + sanitización del terminal.
- [ ] A04 Insecure Design → revisado este doc, threat model documentado.
- [ ] A05 Security Misconfiguration → headers, CSP, actuator restringido.
- [ ] A06 Vulnerable Components → Dependabot + audits en CI.
- [ ] A07 Identification & Auth → N/A, sin auth.
- [ ] A08 Data Integrity Failures → sin deserialización insegura, SRI en CDN si se usa.
- [ ] A09 Logging Failures → logs estructurados, sin PII, retención clara.
- [ ] A10 SSRF → backend no hace fetch externo con input del user.

## TODOs de seguridad pendientes (follow-ups documentados)

### IP extraction trust (X-Forwarded-For) — Follow-up Fase 8
En producción Fly.io filtra los headers de proxy en su edge, por lo que
`Fly-Client-IP` es de confianza. Sin embargo, un proxy mal configurado o una
ruta alternativa podría dejar pasar un `X-Forwarded-For` spoofed.

TODO: validar que `request.getRemoteAddr()` pertenece a un rango IP conocido de
Fly.io antes de aceptar `X-Forwarded-For`. Por ahora, la caída de `Fly-Client-IP`
al primer elemento de `X-Forwarded-For` es aceptable para el MVP.

### PUBLIC_API_URL allowlist en build — Follow-up Fase 8
El revisor propone validar en build-time que `PUBLIC_API_URL` apunta a un host
de la allowlist (p. ej. `*.fly.dev`). Esto no se ha aplicado aún porque implica
un cambio de arquitectura en el pipeline de build (Astro env vars).

TODO: añadir validación en `astro.config.mjs` o en un script de pre-build que
rechace valores de `PUBLIC_API_URL` que no coincidan con la allowlist de hosts
permitidos.

### Logs sin PII — Decisión sobre SHA-256 + salt
El campo `ip_hash` (usando `String.hashCode()`) ha sido eliminado del log de
rate-limit de `CvPdfController` porque `hashCode()` es trivialmente reversible
para IPv4. Si en el futuro se necesita correlacionar incidentes por IP sin
almacenar la IP en claro, añadir SHA-256 + salt rotante (nunca `hashCode()`).

## Respuesta a incidentes

Si se filtra algo:
1. Rotar el secreto en Cloudflare/Fly.io.
2. `git filter-repo` para limpiar historia.
3. Documentar el incidente en `docs/INCIDENTS.md` (crear cuando ocurra).
