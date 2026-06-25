# Tour completo del proyecto — para Ismael (NotPelos)

> Documento de referencia personal. Audiencia: yo mismo, preparando entrevistas. Tono: tutor senior en pausa de café. Asume backend Java sólido; no explica qué es REST, una excepción o un thread pool. Explica POR QUÉ hicimos cada cosa.

---

## Capítulo 0 — Mapa mental

### Las 3 aplicaciones y cómo conversan

```
                       ┌──────────────────────────┐
                       │  Visitante (browser)     │
                       │  Chrome / Firefox / iOS  │
                       └──────────┬───────────────┘
                                  │ HTTPS
                                  ▼
            ┌─────────────────────────────────────────┐
            │  apps/web — Astro (SSG)                 │
            │  Cloudflare Pages · notpelos.pages.dev  │
            │                                         │
            │  /         → terminal (Preact island)   │
            │  /cv       → vista recruiter (0 JS)     │
            │  /cv/en    → idem en inglés             │
            └─────┬─────────────────────────┬─────────┘
                  │                         │
       fetch repos (Worker)        download cv.pdf (API)
                  │                         │
                  ▼                         ▼
   ┌──────────────────────────┐   ┌─────────────────────────┐
   │ apps/worker (Cloudflare) │   │ apps/api (Spring Boot)  │
   │ notpelos-api.workers.dev │   │ notpelos-cv-api.fly.dev │
   │                          │   │                         │
   │ /api/github/profile      │   │ /api/cv/pdf?lang=es|en  │
   │ /api/github/repos        │   │ /api/visits             │
   │                          │   │ /swagger-ui.html        │
   │ KV: cache 1h + rate-lim  │   │ Bucket4j + Caffeine     │
   └────────────┬─────────────┘   └─────────────────────────┘
                │
                ▼
       ┌────────────────┐
       │ api.github.com │
       └────────────────┘
```

### Qué aporta cada capa

| Capa | Tecnología | Aporta | Demuestra en CV |
|---|---|---|---|
| Frontend | Astro 6 + Preact island | HTML estático, JS solo donde hace falta | Lighthouse 95+, criterio para no recargar el stack |
| Edge proxy | Cloudflare Worker + KV | Caché 1h, rate-limit, esconde token GitHub | Edge computing, defensa en profundidad |
| Backend | Spring Boot 3 + Java 21 | PDF on-demand, /visits, Swagger público | Mi stack real — el CV se demuestra, no se cuenta |
| Infra | Cloudflare Pages + Fly.io | Free tier extremo a extremo | Pragmatismo, conciencia de coste |
| CI/CD | 6 workflows GitHub Actions | Lint, test, deploy automático con gates | Cultura DevOps |
| Seguridad | CSP, CodeQL, audits, denyAll | Cero secretos, defensa en profundidad | OWASP, threat modeling |

---

## Capítulo 1 — Frontend / Astro

### 1.1 Por qué Astro y no Next/SvelteKit

Next es un framework React de propósito general: hidrata todo el árbol, incluso si tu landing es 90% texto. SvelteKit reduce bundle pero sigue siendo SPA por defecto. Astro arranca al revés: **HTML estático**, y solo hidrata las "islands" que tú marcas.

Para un CV donde el 90% del DOM es prosa estática (la vista `/cv` para reclutadores) y solo el terminal es interactivo, Astro envía **cero JS** en la vista recruiter y el bundle de Preact (10 KB) solo en `/`. Resultado: Lighthouse 95+ sin trucos.

- **Dónde se ve**: `apps/web/astro.config.mjs` línea 8-10 (`integrations: [preact({ compat: false }), sitemap()]`). El `compat: false` corta el adapter de compatibilidad de React, ahorra otros KB.
- **En entrevista**: "Elegí Astro porque la web es contenido estático con una isla interactiva. Cualquier SPA habría sido sobreingeniería; Astro me da SSG por defecto y yo decido dónde meter JS."

### 1.2 Estructura del proyecto

```
apps/web/src/
├── pages/
│   ├── index.astro          → / (terminal)
│   ├── cv/index.astro       → /cv (recruiter ES)
│   └── cv/en.astro          → /cv/en (recruiter EN)
├── layouts/
│   └── RecruiterLayout.astro
├── components/
│   ├── Terminal.tsx          ← la única island
│   ├── MatrixRain.tsx        ← konami easter egg
│   └── recruiter/
│       ├── Header.astro
│       ├── Summary.astro
│       ├── Experience.astro
│       ├── Projects.astro
│       ├── Skills.astro
│       ├── Education.astro
│       ├── Highlights.astro
│       ├── BackToTerminal.astro
│       └── LangSwitch.astro
├── content/                  ← collections (MD + JSON)
├── content.config.ts         ← Zod schemas
├── lib/
│   ├── commands/             ← 25+ comandos del terminal
│   ├── fs/                   ← filesystem virtual
│   ├── i18n/                 ← detect, t(), messages
│   └── parser.ts             ← tokenizer con quotes
└── styles/global.css
```

### 1.3 Routing file-based

Astro mapea archivos a URLs. `src/pages/cv/index.astro` → `/cv`. `src/pages/cv/en.astro` → `/cv/en`. No hay router que configurar. Si necesitara `/cv/[lang]/print`, crearía `src/pages/cv/[lang]/print.astro`.

**Decisión**: rutas explícitas `/cv` y `/cv/en` en vez de `[lang].astro` dinámico. Razón: solo dos idiomas, queremos hreflang y canonical limpios, y cero overhead de runtime. El precio es duplicación mínima en dos archivos de 30 líneas.

### 1.4 Content collections con Zod

Astro permite definir **colecciones tipadas** de contenido. En `content.config.ts` declaramos schemas Zod que validan **en build time**: si añado un MD con `lang: "fr"`, el build revienta antes de salir a producción.

```ts
// apps/web/src/content.config.ts
const experience = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/experience" }),
  schema: z.object({
    company: z.string(),
    role: z.string(),
    start: z.string().regex(/^\d{4}-\d{2}$/),
    end: z.union([z.string().regex(/^\d{4}-\d{2}$/), z.literal("present")]),
    location: z.string(),
    client: z.string().optional(),
    stack: z.array(z.string()),
    lang: z.enum(["es", "en"]),
    order: z.number(),
    testimonial: z.object({ ... }).optional(),
  }),
});
```

- **Cuándo se ejecuta**: durante `astro build`. Cero coste runtime — el JSON validado se serializa y embebe en el bundle.
- **Por qué importa**: el `skillsSchema.parse(skillsRaw)` en `pages/index.astro:28` me da type-safety hasta el comando `cat skills.json` del terminal. Si el JSON está mal, el build falla con mensaje Zod claro.
- **En entrevista**: "Es como Bean Validation pero en build, no en request. Un error en data no llega nunca a producción."

### 1.5 Islands con `client:load`

Una *island* es un componente con JS que se hidrata en cliente. El resto del árbol es HTML muerto.

```astro
<!-- apps/web/src/pages/index.astro:101 -->
<Terminal
  client:load
  initialFsByLang={initialFsByLang}
  skillsData={skillsData}
  defaultLang="es"
  endpoints={endpoints}
/>
```

- **`client:load`** = hidrata al cargar la página. Lo elegimos porque el terminal es la única razón para visitar `/`; no merece la pena demorarlo.
- **Alternativas** que descartamos:
  - `client:idle` — hidrata cuando el browser está libre. Bueno para widgets secundarios; el terminal es primario.
  - `client:visible` — hidrata cuando entra en viewport. Para componentes "below the fold".
  - `client:only="preact"` — sin SSR. Lo evitamos porque queremos que el terminal renderice el prompt inicial en HTML estático (mejor LCP).

**Las props se serializan a JSON e inyectan en el HTML** (mira el DOM real, verás un `<astro-island props="...">`). Eso significa: las props deben ser serializables (nada de funciones, refs, etc.).

### 1.6 Tailwind v3 + paleta Tokyo Night

`tailwind.config.mjs` extiende el theme con tokens `tn-bg`, `tn-blue`, `tn-magenta`, etc. Decisión consciente: **no usar v4** porque v4 cambia el modelo de configuración (CSS-first), y nuestro proyecto ya tenía v3 estable cuando empezamos.

- **Animaciones custom**: `animate-blink` con cadencia 530ms (xterm clásico).
- **`content: ["./src/**/*.{astro,html,js,jsx,ts,tsx}"]`** — Tailwind escanea todo y purga clases no usadas. Bundle CSS final ~15 KB.

### 1.7 Self-hosted fonts (@fontsource)

Usamos `@fontsource/jetbrains-mono` en vez de Google Fonts. Razón: **CSP estricta**. Cargar de fonts.googleapis.com requeriría añadir ese dominio al `font-src` y `style-src`. Con @fontsource las fuentes son archivos del bundle, todo same-origin.

- **Pitfall**: algunas CSS de @fontsource embeben woff2 como data URIs → por eso el CSP incluye `font-src 'self' data:`.

### 1.8 Layouts y componentes Astro

`RecruiterLayout.astro` envuelve `/cv` y `/cv/en`. Contiene `<head>` (meta, OpenGraph, hreflang, JSON-LD Person), skip link de accesibilidad, y el `<slot />`.

```astro
<!-- apps/web/src/layouts/RecruiterLayout.astro:67 -->
<script is:inline type="application/ld+json" set:html={JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Person",
  ...
}).replace(/</g, "\\u003c")} />
```

El `replace(/</g, "\\u003c")` es **defensa anti-`</script>` injection** aunque el contenido sea estático. Costumbre que en entrevista de seguridad puntúa.

**Para cada componente recruiter** (`Summary.astro`, `Experience.astro`, etc.) el patrón es: importar `getCollection`, filtrar por `lang`, ordenar por `order`, renderizar HTML. **Cero JS en cliente**.

---

## Capítulo 2 — Terminal interactivo (Preact island)

### 2.1 Por qué Preact y no React

Bundle. React + ReactDOM ≈ 45 KB gzipped. Preact ≈ 10 KB y expone la misma API (`useReducer`, `useEffect`, `useRef`). El precio: ciertas libs del ecosistema React asumen `react-dom` y rompen — por eso `preact({ compat: false })` en `astro.config.mjs`; nos negamos a meter el adapter de compat que devolvería esos KB.

- **En entrevista**: "Si tu único uso de JS son hooks y JSX, Preact te da React-API por 1/4 del bundle. La hidratación es trivial."

### 2.2 useReducer + máquina de estado

`Terminal.tsx:54` define `TerminalState` con todos los slots del terminal:

```ts
interface TerminalState {
  output: Line[];                 // historial visible
  cwd: string[];                  // path actual
  prevCwd: string[] | null;       // para cd -
  history: string[];              // ↑/↓
  historyIndex: number;
  input: string;
  lang: Lang;
  fs: Record<string, FsNode>;
  pendingNavigation: string | null;
  pendingFetch: "pdf" | "repos" | null;
  pendingFetchPayload: ... | null;
  soundEnabled: boolean;
  matrixActive: boolean;
}
```

**Por qué reducer y no `useState` múltiple**: las acciones tienen transiciones complejas (un EXECUTE puede mutar `output`, `history`, `cwd`, `fs`, `pendingFetch` a la vez). Con N `useState` tendrías N renders en cascada y bugs de stale closures. Reducer = una transición atómica.

### 2.3 Discriminated unions de `CommandResult`

```ts
// apps/web/src/lib/commands/types.ts:68
export type CommandResult =
  | { lines: Line[]; effect?: undefined; newCwd?: string[]; newPrevCwd?: string[] }
  | { lines: Line[]; effect: "clear"; newCwd?: string[]; newPrevCwd?: string[] }
  | { lines: Line[]; effect: "setLang"; lang: Lang }
  | { lines: Line[]; effect: "navigate"; url: string }
  | { lines: Line[]; effect: "downloadPdf"; url: string; fallbackUrl: string; filename: string }
  | { lines: Line[]; effect: "fetchRepos"; url: string }
  | { lines: Line[]; effect: "setSound"; soundEnabled: boolean };
```

TypeScript me obliga, vía `if (result.effect === "navigate")`, a que `result.url` exista. Imposible olvidar campos. **En entrevista**: "Es un sum type tipado, equivalente a un `sealed interface` en Java. El compilador valida exhaustividad."

### 2.4 Filesystem virtual

`lib/fs/seed.ts` construye un árbol inmutable a partir de las content collections en build:

```
/home/notpelos/
  about.md
  experience/
    aubay.md
    softtek.md
  projects/
    rusteagle.md
    raids.md
  skills.json
/var/log/github/
  repos.json   ← inyectado en runtime tras `repos`
```

El árbol es `Record<string, FsNode>` donde `FsNode = { type: 'file', content } | { type: 'directory', children }`. **Inmutable**: para añadir `repos.json` al filesystem cuando ejecuto `repos`, no muto — clono solo el path al directorio destino:

```ts
// Terminal.tsx:156 — injectFsNode
function cloneDir(children, remaining): Record<string, FsNode> {
  if (remaining.length === 0) {
    return { ...children, [name]: { type: "file", name, content } };
  }
  // recursivamente clonar el path /var/log/github
  ...
}
```

**Por qué inmutable**: el reducer es puro. Si mutara el FS, perderíamos referential equality y los `useEffect` con `state.fs` en deps se romperían. Es la misma disciplina que `Collections.unmodifiableMap` pero estructural.

### 2.5 Registry de comandos extensible

```ts
// apps/web/src/lib/commands/index.ts
export const commandRegistry: Map<string, Command> = new Map([
  ["help", help], ["clear", clear], ["whoami", whoami],
  ["pwd", pwd], ["ls", ls], ["cd", cd], ["cat", cat],
  ...
  ["sudo", sudo], ["rm", rm], ...  // easter eggs con hidden: true
]);
```

Cada comando implementa la misma interfaz `Command { name, brief, manual, hidden?, run(args, ctx): CommandResult }`. **Añadir un comando nuevo** = un archivo + una línea en el registry. Es el patrón Strategy puro.

### 2.6 Parser de input con quotes

`parser.ts` es un tokenizer manual. Soporta `cat "file with spaces.md"` y filtra caracteres de control (`< 0x20`) para evitar inyección de chars invisibles.

```ts
// apps/web/src/lib/parser.ts
if (c.charCodeAt(0) >= 0x20) token += c;  // strip control chars
```

No usamos `split(" ")` porque rompe con quotes. No usamos regex porque la state machine es más legible y testable (8 tests en `__tests__/parser.test.ts`).

### 2.7 i18n: `detectLang`, localStorage, navigator

```ts
// apps/web/src/lib/i18n/detect.ts
export function detectLang(fallback: Lang = "es"): Lang {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (isValidLang(stored)) return stored;
  }
  if (typeof navigator !== "undefined") {
    const nav = navigator.language ?? "";
    if (nav.startsWith("es")) return "es";
    if (nav.startsWith("en")) return "en";
  }
  return fallback;
}
```

Prioridad: localStorage → navigator.language → fallback. **El `isValidLang` es una guarda type-safe** — nunca confiamos en string raw de localStorage; un atacante podría haber metido `<script>` ahí.

### 2.8 Web Audio API — keystroke click

`Terminal.tsx:557` — generamos un click sintético en cada tecla con envelope ADSR mínimo:

```ts
g.gain.setValueAtTime(0.0001, now);
g.gain.exponentialRampToValueAtTime(0.15, now + 0.002);  // 2ms attack
g.gain.exponentialRampToValueAtTime(0.0001, now + 0.05); // 50ms decay
```

- **AudioContext lazy**: creado solo en la primera tecla (los browsers exigen gesto de usuario).
- **Cleanup**: `useEffect(() => () => audioCtxRef.current?.close(), [])` libera recursos al desmontar.

### 2.9 Konami code

```ts
const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
const KONAMI_KEYS = new Set([...]); // filtro: solo teclas del konami acumulan
```

**Defensa en profundidad**: ignoramos cualquier key fuera del set para no acumular ruido. El buffer es un array circular de 10 posiciones.

### 2.10 Patrón `pendingNavigation` / `useEffect` para side-effects

Los reducers de React/Preact son **funciones puras**. Hacer `window.location.href = ...` dentro del reducer es un side-effect prohibido (rompe Strict Mode, doble invoke).

Solución: el reducer escribe `pendingNavigation: url` y un `useEffect` consume:

```ts
// Terminal.tsx:756
useEffect(() => {
  const url = state.pendingNavigation;
  if (!url) return;
  if (!url.startsWith("/")) return;   // guarda anti-redirect externo
  const timer = setTimeout(() => { window.location.href = url; }, 400);
  return () => clearTimeout(timer);
}, [state.pendingNavigation]);
```

Mismo patrón para `pendingFetchPayload` (downloadPdf y fetchRepos). **Esta es la lección React-101 que muchos suspenden**: estado describe intent, efectos ejecutan.

---

## Capítulo 3 — Worker (Cloudflare)

### 3.1 Qué es un Worker

Función JavaScript que corre en el **edge** de Cloudflare (cientos de PoPs). Runtime V8 aislado (no Node — no tienes `fs`, `net`). El handler recibe `Request`, devuelve `Response`. Latencia ~5-20ms global.

**Diferencia con Lambda**:
- Lambda: container fresco (cold starts de 100ms+), Node completo, pay-per-invocation.
- Worker: V8 isolate (cold start ~5ms), API web (`fetch`, `Request`, `Response`), 100k req/día gratis.

### 3.2 Estructura

```
apps/worker/src/
├── index.ts              ← handler principal
├── lib/
│   ├── cors.ts           ← preflight + withCors helper
│   ├── cache.ts          ← KV get/put con TTL 1h
│   ├── rateLimit.ts      ← bucket por IP en KV
│   └── github.ts         ← upstream fetch
└── handlers/
    ├── profile.ts
    └── repos.ts
```

### 3.3 Rate limit por IP con KV — el bug del TTL deslizante

KV es eventual-consistente con TTL. La implementación naïve:

```ts
// MAL: cada put resetea expirationTtl a 60s → ventana NUNCA cierra
await kv.put(key, count + 1, { expirationTtl: 60 });
```

El bug: si me llegan 30 requests bien espaciados, cada uno renueva los 60s. El usuario queda **permanentemente bloqueado**.

Fix (`apps/worker/src/lib/rateLimit.ts:60`):

```ts
const { value, metadata } = await kv.getWithMetadata<RateLimitMeta>(key, "text");
const firstHitMs = metadata?.firstHitMs ?? Date.now();
const elapsedMs = Date.now() - firstHitMs;
const remainingTtl = Math.max(1, Math.ceil((WINDOW_MS - elapsedMs) / 1000));
await kv.put(key, String(current + 1), {
  expirationTtl: remainingTtl,
  metadata: { firstHitMs },
});
```

Anclamos la ventana al **primer hit** vía metadata. Cada put recalcula el TTL restante. El bloqueo dura exactamente 60s desde la primera request.

- **TOCTOU honesto**: KV no es atómico. N requests simultáneas pueden leer 0 y todas escribir 1. El comentario en código lo admite explícitamente y propone Durable Objects para atomicidad real.

### 3.4 Cache con KV (1h TTL)

`lib/cache.ts` — get/put de JSON con `expirationTtl: 3600`. Sencillo a propósito. GitHub envía ETag, pero KV no soporta conditional requests nativamente; un TTL fijo es suficiente para un showcase.

### 3.5 CORS estricto + Vary: Origin

`apps/worker/src/lib/cors.ts:28`:

```ts
return {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Methods": "GET",
  "Access-Control-Allow-Headers": "Content-Type",  // mínimo necesario
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",   // ← clave
  "X-Content-Type-Options": "nosniff",
  ...
};
```

**Por qué `Vary: Origin` incluso en 403/405**: si un proxy intermedio cachea la respuesta 403 que dimos a `evil.com`, la podría servir luego a `notpelos.pages.dev` legítimo. Vary: Origin obliga a la caché a indexar por origen.

### 3.6 Whitelist de paths (defensa en profundidad)

```ts
// apps/worker/src/index.ts:27
const ALLOWED_PATHS = new Set(["/api/github/profile", "/api/github/repos"]);
if (!ALLOWED_PATHS.has(path)) {
  return new Response("Not Found", { status: 404 });
}
```

Cualquier path desconocido devuelve 404 sin echo del path (no info leak). Añadir un endpoint requiere code change → revisión obligatoria.

### 3.7 Tests con @cloudflare/vitest-pool-workers

`apps/worker/src/test/` contiene tests que corren el handler en el **runtime real del worker** (no en Node). Validan CORS, whitelist, rate-limit, cache. Es el equivalente a `@SpringBootTest` pero para el edge.

---

## Capítulo 4 — Backend Spring Boot (apps/api)

### 4.1 Spring Security — denyAll por defecto

```java
// apps/api/src/main/java/dev/notpelos/cv/config/SecurityConfig.java:33
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/error").permitAll()
    .requestMatchers("/actuator/health", "/actuator/info").permitAll()
    .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
    .requestMatchers("/api/cv/pdf").permitAll()
    .requestMatchers("/api/visits").permitAll()
    .anyRequest().denyAll()
)
```

Filosofía: **lista blanca**, no negra. Cualquier endpoint nuevo está cerrado hasta que lo abro explícitamente. En entrevista esto es oro: el reverso (permitAll + denegar manualmente) es el patrón que filtra `/actuator/env` con secretos.

- **Stateless + CSRF disabled**: no hay sesiones, no hay forms. El stateless elimina la superficie CSRF de raíz.
- **Headers de seguridad**: nosniff, X-Frame-Options DENY, HSTS 1 año.

### 4.2 Bucket4j + Caffeine — el fix de unbounded growth

`RateLimitConfig.java:40`:

```java
private final Cache<String, Bucket> buckets = Caffeine.newBuilder()
    .maximumSize(10_000)
    .expireAfterAccess(Duration.ofMinutes(10))
    .build();
```

**El problema que resolvimos**: la implementación original usaba `ConcurrentHashMap<String, Bucket>`. Un atacante con N IPs distintas (o spoofing de `Fly-Client-IP`) hace el mapa crecer sin tope → OOM en JVM con 384 MB de heap.

Caffeine acota a 10k entradas (LRU + idle eviction 10 min). El bucket es token-bucket clásico: 60 tokens / minuto, refill greedy.

- **Por qué bucket4j-core y no el starter**: el starter te mete autoconfig + servlet filter que acopla rate-limit al filter chain. Con core lo controlo en el `@RestController` (`CvPdfController:78` → `bucket.tryConsume(1)`), mucho más testable con MockMvc.
- **Escalado**: para >1 instancia migraría a `bucket4j-redis`. Documentado en el javadoc de la clase.

### 4.3 OpenPDF para generación on-demand

OpenPDF (LGPL, fork de iText 2) vs alternativas:
- **iText 5+** → AGPL, contaminante para closed-source.
- **PDFBox** → sin layout engine; pintarías cajas a mano.
- **Chromium/Playwright PDF** → 200 MB extra, lento, overkill.

`PdfGenerator.java` construye el PDF a mano: header, secciones, tabla de skills con dots ●○. Sin descargar fuentes (Helvetica built-in). Total: ~30 KB de PDF.

### 4.4 Actuator restringido

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info     # nada de env, beans, mappings, heapdump
  endpoint:
    health:
      show-details: never        # no fugar versiones de DB, etc.
```

Exponer `/actuator/env` en producción es la causa #1 de leaks de secretos en CVs de Spring que veo en pentest reports.

### 4.5 Dockerfile multi-stage + non-root

```dockerfile
# Stage 1: build con JDK
FROM eclipse-temurin:21.0.5_11-jdk-alpine AS build
RUN ./mvnw package -DskipTests -q && mv target/*.jar target/app.jar

# Stage 2: runtime con JRE (no JDK)
FROM eclipse-temurin:21.0.5_11-jre-alpine AS runtime
RUN addgroup -S cvapp && adduser -S cvapp -G cvapp
USER cvapp
ENV JAVA_OPTS="-Xmx384m -XX:+UseG1GC -XX:MaxRAMPercentage=75 ..."
```

- **JRE en runtime** = imagen ~120 MB vs ~400 MB con JDK.
- **Non-root** = principio de menor privilegio; un RCE no escala a root del contenedor.
- **`MaxRAMPercentage=75`** + `-Xmx384m` = la JVM respeta el límite de 512 MB de la VM Fly.

### 4.6 Fly.io: auto-stop, cold start, free tier

```toml
# fly.toml
auto_stop_machines = "stop"
auto_start_machines = true
min_machines_running = 0
```

Sin tráfico, la máquina se duerme. Primer request despierta (5-10s cold start). El frontend (`Terminal.tsx:807`) detecta timeout de 5s y abre el PDF estático fallback. **Degradación elegante**, no error.

---

## Capítulo 5 — CI/CD (GitHub Actions)

### 5.1 Seis workflows con path filters

| Workflow | Trigger | Qué hace |
|---|---|---|
| `web.yml` | cambios en `apps/web/**` | typecheck, lint, build, audit, deploy Pages |
| `worker.yml` | `apps/worker/**` | test, deploy Cloudflare |
| `api.yml` | `apps/api/**` | mvn verify, deploy Fly.io |
| `security.yml` | push + cron lunes | CodeQL (JS + Java), queries security-extended |
| `lighthouse.yml` | PR a main | Lighthouse CI, targets ≥95 |
| `e2e.yml` | PR / push main | Playwright 91 tests Chromium |

**Path filters** = un PR que solo toca `docs/` no dispara ningún CI pesado. Ahorra minutos de Actions y feedback rápido.

### 5.2 Concurrency + cancel-in-progress

```yaml
concurrency:
  group: web-ci-${{ github.ref }}
  cancel-in-progress: true
```

Si pusheo 3 veces en 30s, los 2 primeros runs se cancelan. Ahorra minutos y evita race en deploy. **Excepción**: `security.yml` tiene `cancel-in-progress: false` — los scans de seguridad nunca se cancelan, deben completarse.

### 5.3 Permissions mínimas

```yaml
permissions:
  contents: read
```

Cada workflow declara solo lo que necesita. `security.yml` añade `security-events: write` para subir SARIF. El default de GitHub es `write-all`; lo cerramos.

### 5.4 pnpm con frozen-lockfile

`pnpm install --frozen-lockfile` falla si el `pnpm-lock.yaml` no coincide con `package.json`. Garantía: el CI compila exactamente lo mismo que tu local.

### 5.5 Branch protection + required status checks

En main: PR obligatorio, status checks `web-ci`, `worker-ci`, `api-ci`, `security-codeql` deben pasar, una review aprobada. Deploy jobs gateados a `needs: ci` + `if push to main`.

---

## Capítulo 6 — Seguridad transversal

### 6.1 CSP en `apps/web/public/_headers`

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' https://avatars.githubusercontent.com data:;
  font-src 'self' data:;
  connect-src 'self' https://*.fly.dev https://*.workers.dev;
  frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

- **`'unsafe-inline'` en script-src**: Astro emite scripts inline para hidratar islands. El TODO documentado en `SECURITY.md` es migrar a `experimental.csp` con hashes. Aceptable hoy porque XSS está mitigado por Preact (escape automático en JSX) y no usamos `innerHTML` ni `eval` en ningún bundle.
- **`connect-src`** limitado a fly.dev y workers.dev — nada más se puede `fetch`ear.
- **`frame-ancestors 'none'`** = anti-clickjacking.

### 6.2 pnpm.overrides para CVEs transitivas

```json
// package.json:14
"pnpm": {
  "overrides": {
    "undici": ">=6.27.0",
    "ws": ">=8.21.0",
    "devalue": ">=5.3.2",
    "vite": ">=6.4.3"
  }
}
```

Fuerza versiones mínimas en deps transitivas. Si Astro 6.4 trajera Vite 6.0 con CVE, lo subo aquí sin esperar al upstream.

### 6.3 ESLint con eslint-plugin-security

Detecta `eval`, RegExp dinámicas, object injection. Falla CI con `--max-warnings 0`. Los `// eslint-disable-next-line security/detect-object-injection` están justificados case-by-case en el código (índices clamped, literales tipados).

### 6.4 CodeQL semanal + push-trigger

`security.yml` corre CodeQL en cada push a main, en PRs y cada lunes 09:00 UTC. Matrix `javascript-typescript` + `java-kotlin`. Queries `security-extended` (incluye CWEs críticos).

### 6.5 pnpm audit como gate

`pnpm audit --audit-level=high` falla el build si hay CVE alta no resuelta. En `web.yml:62`.

### 6.6 Sin secretos en repo

- Cloudflare API token → GitHub Secret `CLOUDFLARE_API_TOKEN`.
- Fly.io token → `FLY_API_TOKEN`.
- ALLOWED_ORIGIN del API → `flyctl secrets set` (rotable sin redeploy).
- GitHub token (si llegamos a usar PAT en Worker) → `wrangler secret put`.

`.gitignore` cubre `.env*`. Pre-commit hook + gitleaks recomendable (no implementado aún).

---

## Capítulo 7 — Metodología vibe coding

### 7.1 Equipo de 9 subagentes

Cada subagente vive en `.claude/agents/<nombre>.md` con un system prompt específico y acceso al `CLAUDE.md` del proyecto:

| Agente | Modelo | Rol |
|---|---|---|
| `architect` | Opus | Diseño, ADRs, trade-offs |
| `frontend-dev` | Sonnet | Astro, Preact, Tailwind |
| `backend-dev` | Sonnet | Spring Boot, Java |
| `content-writer` | Sonnet | Contenido del CV bilingüe |
| `devops` | Sonnet | CI/CD, Fly, Cloudflare |
| `qa-tester` | Sonnet | Vitest, Playwright, JUnit |
| `security-auditor` | Opus | CSP, CVEs, threat model |
| `code-reviewer` | Opus | Revisión bloqueante pre-merge |
| `astro-tutor` | Sonnet | Material de aprendizaje (este doc) |

### 7.2 Ciclo

```
Usuario → Orquestador → Obrero (Sonnet) → Reviewers (Opus, bloqueantes) → Merge
                            ↑                       │
                            └───────── si fail ─────┘
```

Reviewers son **bloqueantes**: si `security-auditor` o `code-reviewer` rechazan, vuelve al ciclo. Nunca se mergea sin doble visto.

### 7.3 Cómo lee contexto cada agente

`CLAUDE.md` raíz + `docs/AGENTS.md` declara qué docs específicos lee cada uno. Por ejemplo `security-auditor` siempre lee `SECURITY.md` antes de actuar. Esto es la diferencia clave con "Cursor pidiéndole cosas al chat": **el contexto es estructurado y repetible**.

### 7.4 Trade-offs honestos

- **Pro**: 6 semanas de proyecto en ~10 días. Decisiones documentadas. Tests reales (no stubs). Seguridad de día 1.
- **Contra**: la primera vez es lento (definir los agentes, escribir prompts). Necesitas criterio para rechazar PRs malos del agente — si aceptas todo, generas deuda. En empresas con compliance fuerte (banca), todavía hay fricción.
- **Cuándo NO conviene**: features muy acopladas al dominio sin docs (el LLM alucina). Código sensible sin tests previos (el LLM mete cambios silenciosos). Equipos pequeños bien aceitados (el overhead del proceso no compensa).

---

## Capítulo 8 — Despliegue

### 8.1 Cloudflare Pages (web)

```bash
# web.yml job deploy
npx wrangler@4 pages deploy apps/web/dist \
  --project-name=notpelos --branch=main --commit-dirty=true
```

El artifact `web-dist` se sube en el job `ci` y se descarga en `deploy`. Wrangler usa `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` de secrets. Despliegue ~30s.

### 8.2 Cloudflare Worker

`wrangler.toml` declara el binding `GITHUB_CACHE` (KV). `wrangler deploy` empaqueta el TS, lo sube. KV namespace creado vía `wrangler kv:namespace create`.

### 8.3 Fly.io (api)

```bash
# api.yml job deploy
flyctl deploy --remote-only --wait-timeout 300
```

`--remote-only` = el build de Docker corre en el builder de Fly, no en el runner de Actions. Más rápido y no consume layers del cache local.

### 8.4 Env vars de Astro (`PUBLIC_*`)

```yaml
# web.yml:56
env:
  PUBLIC_WORKER_URL: "https://notpelos-api.xpelos23.workers.dev"
  PUBLIC_API_URL: "https://notpelos-cv-api.fly.dev"
```

Astro expone al cliente **solo** vars con prefijo `PUBLIC_`. Cualquier `WORKER_TOKEN=` quedaría en build sin filtrarse al bundle. Estas se inyectan en build, no en runtime — son strings literales en el JS final.

### 8.5 Modo degradado

`Terminal.tsx:769` — si `download cv.pdf` falla (timeout 5s, API dormida), abre `/cv-static-{lang}.pdf` (artifact pre-generado en build). El usuario nunca ve un error técnico.

`Terminal.tsx:850` — si Worker responde mal, `repos` muestra "worker no disponible (modo degradado)" en rojo y el comando termina limpio.

---

## Capítulo 9 — Tests

### 9.1 Vitest unit + integration (web, worker)

`apps/web/src/lib/__tests__/` — parser, fs, markdown, i18n detect, cada comando del terminal. ~80 tests.

`apps/worker/src/test/` — cors, whitelist, rateLimit, profile, repos. Con `@cloudflare/vitest-pool-workers`, corren en el runtime real del worker.

### 9.2 JUnit + MockMvc (api)

`apps/api/src/test/java/` — `CvPdfControllerTest`, `RateLimitTest`, `CorsTest`, `VisitsControllerTest`. MockMvc + Spring Security Test.

### 9.3 Playwright e2e (91 tests Chromium)

`apps/web/e2e/` — 13 specs:
- `terminal-basic`, `terminal-navigation`, `terminal-history`, `terminal-autocomplete`
- `terminal-i18n`, `terminal-sound`, `terminal-konami`, `terminal-easter-eggs`
- `terminal-ai`, `terminal-offline`, `terminal-recruiter-navigation`
- `recruiter-view`, `a11y` (con `@axe-core/playwright`)

### 9.4 axe-core para a11y

`e2e/a11y.spec.ts` corre axe contra `/` y `/cv`. Falla si hay violaciones serias o críticas. Es el linter del WCAG.

### 9.5 Lighthouse CI

`lighthouse.yml` corre `treosh/lighthouse-ci-action` contra el preview build. Targets: performance ≥95, a11y ≥95, best-practices ≥95, SEO ≥95.

---

## Capítulo 10 — Próximos pasos (cuando el CV evolucione)

Cosas que dejaría para un v2 si surgiera interés real:

1. **CSP con hashes** (`experimental.csp` de Astro 6+). Elimina `'unsafe-inline'`. Es trivial pero requiere actualizar el script JSON-LD del recruiter view.
2. **Durable Objects** para rate-limit estricto en el Worker (atomicidad). Solo si llego a 100+ req/s sostenidos.
3. **View Transitions API** de Astro entre `/` y `/cv` para una salida visual del terminal con fade. Coste: 0 KB extra, nativo del framework.
4. **PostHog o Plausible** self-hosted para analytics anónimo sin cookies. Compatible con CSP.
5. **Server Islands** (Astro 5+) para el contador de visitas — render en server, sin hidratar el contador completo.
6. **Astro DB** para una página `/uses` con la lista de hardware/software, generada desde una tabla.
7. **Migrar Worker a Hono** si los handlers crecen más de 5. Hono da routing tipado, validación y middlewares con casi cero overhead.
8. **OpenTelemetry** en el API → Grafana Cloud free tier. Demuestra observabilidad.
9. **GitHub Action que abra issue automático en CVE alta**. Ya tenemos pnpm audit + CodeQL; añadir Dependabot + alert routing.
10. **Pact tests** entre Worker y Web (consumer-driven contracts). Útil cuando crezca el surface de la API.

---

## Cierre

Este doc + `INTERVIEW-PREP.md` cubren lo que necesitas saber para defender el proyecto. Si una pregunta te bloquea, vuelve al capítulo correspondiente y lee el "Dónde está" — el código es tu chuleta real.

Recursos para profundizar:
- [docs.astro.build](https://docs.astro.build) — content collections, islands, view transitions.
- [developers.cloudflare.com/workers](https://developers.cloudflare.com/workers/) — KV, Durable Objects, isolates.
- [bucket4j.com](https://bucket4j.com/) — algoritmos de token bucket.
- [docs.spring.io/spring-security](https://docs.spring.io/spring-security/reference/) — el manual real, no tutoriales sueltos.
- [web.dev/articles/csp](https://web.dev/articles/csp) — CSP nivel 2/3 con ejemplos.
