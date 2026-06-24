# PRD — Curriculum interactivo de xpelos

## 1. Visión

Una página web que **es** el CV en sí misma: un terminal Tokyo Night que demuestra el perfil técnico del autor (backend Java + microservicios) a la vez que lo cuenta. Modo dual para no excluir a reclutadores no técnicos.

## 2. Público objetivo

| Perfil | Necesidad | Cómo lo servimos |
|---|---|---|
| Reclutador técnico | Ver stack real, repos, profundidad | Terminal hardcore + Swagger del backend + GitHub en vivo |
| Reclutador no-dev | CV legible, contactar rápido | Comando `recruiter` → vista clásica + PDF descargable |
| Otro dev / comunidad | Inspiración, easter eggs, código del proyecto | Repo público, easter eggs, `sudo` y `.secrets/` |
| Cliente freelance | Ver proyectos reales y forma de trabajar | Sección `projects/` + repos |

## 3. Objetivos medibles

- **Tiempo hasta "contactar"** < 30 s para reclutador no-dev (con modo clásico).
- **Lighthouse** ≥ 95 en Performance, A11y, Best Practices, SEO.
- **Coste mensual**: 0 € (todo en free tier).
- **0 vulnerabilidades críticas** en auditoría (OWASP Top 10).
- **Bilingüe completo** ES/EN sin contenido huérfano.

## 4. Alcance (MVP)

### Dentro
- Terminal interactivo con comandos: `help`, `ls`, `cd`, `cat`, `tree`, `whoami`, `clear`, `history`, `man`, `grep`, `sudo`, `neofetch`, `lang`, `recruiter`, `ai`, `download`.
- Filesystem virtual con secciones del CV.
- Integración GitHub API (repos, lenguajes, contribuciones).
- Generación de PDF on-demand (microservicio Java).
- Vista clásica accesible.
- i18n ES/EN completo.
- SEO: meta tags, OG, sitemap, robots.
- Modo móvil usable (terminal adaptado, no perfecto).

### Fuera (v2+)
- IA real con LLM.
- Blog/posts.
- Comentarios o auth.
- Analytics avanzados.
- Dominio propio.

## 5. Restricciones

- Presupuesto: **0 €**.
- Hosting solo en free tiers (Cloudflare Pages, Fly.io).
- No exponer claves, sin backend de pago.
- Web debe seguir funcionando si el microservicio Java cae (modo degradado).

## 6. Riesgos

| Riesgo | Mitigación |
|---|---|
| Fly.io duerme la app (cold start) | Avisar al user con loader gracioso "despertando JVM…" + ping cron suave |
| GitHub API rate limit | Cache 1h en Cloudflare Worker |
| Reclutador no encuentra contacto | Botón emergencia visible siempre + comando `contact` directo |
| XSS en input del terminal | Sanitización estricta, ver [SECURITY.md](SECURITY.md) |
| Móvil incómodo con teclado virtual | Sugerencias de comandos clicables en móvil |

## 7. Criterios de "hecho"

- [ ] Todos los comandos del MVP funcionan.
- [ ] CV completo en ES y EN.
- [ ] PDF se genera y descarga correctamente.
- [ ] Lighthouse ≥ 95 en las 4 categorías.
- [ ] `security-auditor` da OK.
- [ ] `code-reviewer` aprueba último PR.
- [ ] Desplegado en `notpelos.pages.dev` con backend vivo en Fly.io.
