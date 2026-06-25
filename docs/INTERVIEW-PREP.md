# Interview Prep — 40 preguntas sobre el proyecto

> Q&A directo para defender cada decisión técnica en entrevistas. Respuestas de 3-6 líneas, código relevante, y la "trampa común" que el entrevistador suele lanzar como follow-up.

---

## Astro / Frontend (8)

### 1. ¿Por qué elegiste Astro y no Next.js o SvelteKit?

Porque el 90% del sitio es contenido estático (vista recruiter) y solo el terminal necesita JS. Next/SvelteKit son SPA por defecto: hidratan todo el árbol. Astro es SSG por defecto y solo hidrata las "islands" que marco explícitamente con `client:*`. El resultado: `/cv` envía 0 KB de JS y `/` envía solo el bundle del terminal (Preact + comandos, ~30 KB gzipped).

- **Código**: `apps/web/astro.config.mjs` (integraciones), `apps/web/src/pages/index.astro:101` (única island).
- **Trampa común**: "¿Y si tuvieras una dashboard con muchos componentes interactivos?". Respuesta: Astro deja de ser óptimo cuando >50% del DOM es interactivo. Para una dashboard usaría Next o Remix. Astro brilla en sitios content-heavy con interactividad puntual.

### 2. ¿Qué es exactamente una "island"?

Un componente con JavaScript que se hidrata en cliente, embebido en una página que por lo demás es HTML estático. Astro renderiza la página en build, marca la posición de la island con un custom element `<astro-island>`, serializa las props como JSON en un atributo, y carga el JS solo de esa isla cuando se cumple la directiva (`client:load`, `client:idle`, `client:visible`, `client:media`, `client:only`).

- **Código**: `apps/web/src/pages/index.astro:101` (`<Terminal client:load />`).
- **Trampa común**: "¿Y la comunicación entre islands?". No la hay nativa: hay que usar nanostores, eventos del DOM o el shared store que tú montes. Astro no es un framework de estado.

### 3. ¿Content collections vs leer Markdown raw con `fs.readdir`?

Content collections validan el frontmatter contra un schema Zod **en build time** y generan tipos TypeScript. Si añado un MD con campo mal escrito, el build falla con un error claro. Con `fs.readdir` tendrías validación runtime (tarde) y `any` por todas partes. Es la diferencia entre Bean Validation en compile-time vs runtime.

- **Código**: `apps/web/src/content.config.ts` (schemas), `apps/web/src/pages/index.astro:22-26` (getCollection).
- **Trampa común**: "¿Cuándo se valida?". Build time, con el loader `glob({ pattern, base })`. Cero coste en runtime: el JSON ya validado va al bundle.

### 4. ¿Cómo funciona `client:load`?

Astro inserta un script inline que importa el componente Preact (`Terminal.tsx`) y llama a `render(component, container)` apenas el navegador parsea el HTML. Las props pasan serializadas como JSON en `<astro-island props="...">`. Es eager hydration: si quisiera retrasar usaría `client:idle` (espera `requestIdleCallback`) o `client:visible` (IntersectionObserver).

- **Código**: `apps/web/src/pages/index.astro:101`.
- **Trampa común**: "¿Y si el componente tarda en cargar?". El placeholder es el HTML del SSR. Si usas `client:only` no hay SSR → ojo con FOUC y SEO.

### 5. ¿Qué problema hay con StrictMode y hidratación?

StrictMode/dev double-invoca efectos en montaje para detectar side-effects impuros. Si dentro del `useEffect` haces algo no idempotente (ej: dispatch a un reducer que aumenta contador), te ejecuta dos veces. Yo lo resolví en `Terminal.tsx:637` con un `hasBootedRef` que actúa como guard: el boot neofetch solo dispatcha una vez aunque el efecto corra dos.

- **Código**: `apps/web/src/components/Terminal.tsx:675` (boot effect con `hasBootedRef`).
- **Trampa común**: "¿Por qué no usaste `useState` para el flag?". Porque cambiar un state dispara re-render. `useRef` muta sin re-renderizar.

### 6. ¿Cómo se inyectan las env vars en Astro?

Las variables con prefijo `PUBLIC_*` se exponen al cliente y se **inyectan en build** como strings literales (no runtime). En `index.astro:16-19` leo `import.meta.env.PUBLIC_WORKER_URL`. El CI las inyecta en el job de build (`web.yml:56`). Cualquier var sin `PUBLIC_` queda servidor-only y nunca se cuela al bundle.

- **Código**: `apps/web/src/pages/index.astro:16`, `.github/workflows/web.yml:56`.
- **Trampa común**: "¿Y para rotar URLs sin redeploy?". No se puede: están en el bundle. Si rotas, redeployas. Para rotación caliente necesitarías fetch a un config endpoint.

### 7. ¿Cómo manejas SEO en una SPA-like?

No es SPA: `/cv` es HTML 100% estático con `<title>`, `<meta description>`, OpenGraph, hreflang ES/EN, JSON-LD Person, y canonical. Lo construye Astro en build a partir de las content collections. Google indexa sin ejecutar JS. El `RecruiterLayout.astro` tiene todo el `<head>` y delega contenido al `<slot />`.

- **Código**: `apps/web/src/layouts/RecruiterLayout.astro:30-89`.
- **Trampa común**: "¿Y si quisieras SEO en `/` (terminal)?". El boot inicial renderiza HTML con título correcto + descripción. El terminal es JS, pero el HTML inicial es indexable.

### 8. ¿Qué hace `set:html` y por qué lo escapas?

`set:html={value}` inyecta HTML crudo (equivalente a dangerouslySetInnerHTML). Lo uso para el JSON-LD del recruiter view. Aunque el contenido es estático y construido por mí, le aplico `.replace(/</g, "\\u003c")` como defensa-en-profundidad contra `</script>` injection. Es disciplina, no necesidad real aquí.

- **Código**: `apps/web/src/layouts/RecruiterLayout.astro:67-88`.
- **Trampa común**: "Si es estático, ¿para qué escapas?". Porque mañana alguien meterá una variable de content collection ahí. Mejor que el escape ya esté.

---

## Preact / Terminal (6)

### 9. ¿Por qué Preact y no React?

Bundle. React + ReactDOM ≈ 45 KB gzipped. Preact ≈ 10 KB. Para un componente con `useReducer + useEffect + useRef` la API es idéntica. El precio: algunas libs del ecosistema React asumen `react-dom` y rompen — por eso `preact({ compat: false })` en `astro.config.mjs`. Si necesitara compat añadiría @preact/compat (~20 KB), pero entonces React Lite ya no compensaría.

- **Código**: `apps/web/astro.config.mjs:10`, `apps/web/src/components/Terminal.tsx:1` (`/** @jsxImportSource preact */`).
- **Trampa común**: "¿No es prematura optimización?". Para un CV donde el LCP es la métrica principal, 35 KB son medio Lighthouse score.

### 10. ¿Cómo evitas side-effects en el reducer?

Los reducers son puros: solo describen "qué pasaría". Los side-effects van a `useEffect`. Para navegar, el reducer escribe `state.pendingNavigation = url` y un useEffect lo consume y ejecuta `window.location.href`. Mismo patrón con `pendingFetchPayload` para downloadPdf y fetchRepos. Esto sobrevive a StrictMode double-invoke y a re-renders sorpresa.

- **Código**: `apps/web/src/components/Terminal.tsx:366-374` (reducer setea), `Terminal.tsx:756-766` (effect consume).
- **Trampa común**: "¿Y si dispatchas dos navegaciones seguidas?". El siguiente reducer-pass resetea `pendingNavigation` (ver `SET_INPUT` que lo limpia). El efecto cancela el setTimeout previo en cleanup.

### 11. ¿Por qué discriminated unions en `CommandResult`?

Porque TypeScript me obliga, vía narrowing en `if (result.effect === "navigate")`, a tratar cada caso con sus campos correctos. `result.url` solo existe en el branch navigate, `result.lang` solo en setLang. Es exhaustividad estructural — el equivalente JS de un `sealed interface` Java con switch exhaustivo. Imposible olvidar un effect cuando añado uno.

- **Código**: `apps/web/src/lib/commands/types.ts:68-75`, `apps/web/src/components/Terminal.tsx:353-435` (switch sobre el effect).
- **Trampa común**: "¿Y si añades un effect nuevo?". El reducer no lo maneja → cae al return default que solo aplica `lines`. Para forzar exhaustividad podría meter un `assertNever(effect)`. Mejora pendiente.

### 12. ¿Cómo manejas i18n cuando hay SSR + cliente?

El idioma se detecta en cliente (`detectLang` en `lib/i18n/detect.ts`): localStorage → navigator.language → fallback. El SSR siempre renderiza `defaultLang` ("es"); el efecto de montaje (`Terminal.tsx:655`) detecta el idioma real y dispatcha `SET_LANG` si difiere. Hay un parpadeo mínimo aceptable. Para evitarlo del todo necesitaría SSR-side detection vía Accept-Language header → adapter SSR. No vale la pena.

- **Código**: `apps/web/src/lib/i18n/detect.ts`, `apps/web/src/components/Terminal.tsx:655-665`.
- **Trampa común**: "¿Y si el user no tiene JS?". El recruiter view `/cv` y `/cv/en` son páginas separadas sin JS, con `<link rel="alternate" hreflang>` entre ellas. Cubierto.

### 13. ¿Cómo funciona el filesystem virtual?

Es un árbol inmutable `Record<string, FsNode>` donde `FsNode = file | directory`. Se construye en build a partir de las content collections (`lib/fs/seed.ts`). Comandos como `cd`, `ls`, `cat` lo leen vía helpers (`resolvePath`, `getNode`). Para añadir un archivo en runtime (caso: `repos` inyecta `/var/log/github/repos.json`) clonamos solo el path al destino — no mutamos.

- **Código**: `apps/web/src/lib/fs/index.ts`, `apps/web/src/components/Terminal.tsx:156-193` (`injectFsNode`).
- **Trampa común**: "¿Por qué inmutable?". El reducer es puro y el `state.fs` es comparado por referencia en deps de `useEffect`. Mutar rompería esa garantía.

### 14. ¿Cómo lazy-creas el AudioContext?

Los navegadores exigen que `new AudioContext()` se llame dentro de un user gesture (click o keydown) o queda en estado `suspended`. Mantengo `audioCtxRef.current = null` hasta el primer keydown; ahí lo creo. Si el contexto sale en `suspended` (Safari iOS), llamo `resume()` antes de tocar el primer sonido — es idempotente. En `useEffect` de cleanup llamo `close()` al desmontar.

- **Código**: `apps/web/src/components/Terminal.tsx:546-578` (`createAudioContext`, `playTypeClick`), `Terminal.tsx:643` (cleanup).
- **Trampa común**: "¿Y la latencia?". Web Audio mide ~5-10ms desde scheduling. Usamos `setValueAtTime(now)` para sincronizar con el keydown — imperceptible.

---

## Worker / Edge (6)

### 15. ¿En qué se diferencia un Worker de Cloudflare de una Lambda de AWS?

Worker corre en V8 isolates: cold start ~5ms, sin Node API (no `fs`, no `net` crudo, sí `fetch` y Web APIs). Lambda corre en containers: cold start 100ms-2s, Node completo, pay per invocation con duración. Workers están distribuidos en cientos de PoPs (edge) — latencia 5-20ms globalmente. Lambda vive en regiones — latencia 50-200ms para usuarios lejanos.

- **Código**: `apps/worker/src/index.ts` (export `fetch` handler, no `exports.handler`).
- **Trampa común**: "¿Cuándo elegirías Lambda?". Procesamiento >50ms CPU, necesidad de libs Node (Sharp, Puppeteer), integración profunda con AWS (RDS, SQS). Workers brillan en proxies, transformaciones ligeras y edge cache.

### 16. ¿Por qué KV y no Durable Objects?

KV es key-value eventual-consistent global, lectura ~5ms, escritura ~60s en propagar. Suficiente para caché de 1h y rate-limit best-effort. Durable Objects da consistencia fuerte por shard (atomicidad real, transacciones) pero cuesta más y añade complejidad. Para un proxy showcase con 30 req/min de pico no merece la pena.

- **Código**: `apps/worker/src/lib/cache.ts`, `apps/worker/src/lib/rateLimit.ts:11-22` (comentario admitiendo TOCTOU).
- **Trampa común**: "¿Y la atomicidad del rate-limit?". No la hay. Lo documento explícitamente: N requests simultáneas pueden todas leer 0 y todas escribir 1. Para atomicidad real migro a Durable Objects o el `rateLimiting` binding nativo.

### 17. Explica el bug del TTL deslizante que arreglaste.

KV permite `expirationTtl` en cada `put`. La implementación naïve hacía `kv.put(key, count + 1, { expirationTtl: 60 })` en cada hit. Cada put renovaba 60s la expiración → un atacante constante quedaba bloqueado permanentemente. Lo arreglé anclando la ventana al primer hit vía metadata (`firstHitMs`), y recalculando `remainingTtl = 60 - elapsed` en cada put.

- **Código**: `apps/worker/src/lib/rateLimit.ts:60-91`.
- **Trampa común**: "¿Cómo detectaste el bug?". Un test que simulaba 30 hits espaciados y comprobaba que el siguiente request `allowed=true` tras esperar 60s. El test fallaba; el código lo arreglé y el test pasó.

### 18. ¿Por qué `Vary: Origin` incluso en respuestas 403/405?

Sin `Vary: Origin`, una caché intermedia (CDN, proxy corporativo) puede indexar la respuesta solo por URL. Si rechazo origen `evil.com` con 403 y la caché la guarda, podría servirla luego al origen legítimo `notpelos.pages.dev`. `Vary: Origin` obliga a la caché a diferenciar por header `Origin` y nunca cruzar respuestas.

- **Código**: `apps/worker/src/lib/cors.ts:36-38`, `apps/worker/src/lib/cors.ts:58` (en 403 preflight).
- **Trampa común**: "¿Por qué `Allow-Headers: Content-Type` y no `*`?". Principio de menor privilegio. Si mañana añado un header sensible, lo incluyo explícitamente. `*` es laxa y desactiva la introspección por el browser.

### 19. ¿Cómo gestionas el preflight OPTIONS?

`handlePreflight` (`cors.ts:51`) valida el `Origin` contra el allowed. Si match: 200 con todos los headers CORS y `Access-Control-Max-Age: 86400` (24h de caché del preflight). Si no match: 403 con `Vary: Origin`. El handler principal (`index.ts:38`) corta el flujo en OPTIONS antes de pasar a la lógica de negocio.

- **Código**: `apps/worker/src/index.ts:38`, `apps/worker/src/lib/cors.ts:51`.
- **Trampa común**: "¿Y si quiero permitir múltiples orígenes?". El header `Access-Control-Allow-Origin` solo acepta uno (o `*`). Para multi-origin, valido el incoming Origin contra un Set y reflejo ese mismo valor. Por ahora solo permito uno.

### 20. ¿Por qué whitelist de paths en vez de lista negra?

Defensa en profundidad. Si añado un handler nuevo y olvido validarlo, la whitelist devuelve 404 → atacante no descubre que existe. Lista negra requiere recordar denegar cada path nuevo. Es la misma filosofía que `denyAll` en Spring Security: cierro por defecto, abro explícitamente.

- **Código**: `apps/worker/src/index.ts:27` (`const ALLOWED_PATHS = new Set([...])`).
- **Trampa común**: "¿Y el 404 hace echo del path?". No. Devuelvo `"Not Found"` plain sin incluir el path solicitado. No info leak.

---

## Spring Boot / Backend (8)

### 21. ¿Por qué `denyAll` por defecto en Spring Security?

Filosofía de lista blanca. Cualquier endpoint nuevo nace cerrado y debe abrirse explícitamente — fuerza revisión. El reverso (`permitAll` + denegar manualmente) es el patrón que filtra accidentalmente `/actuator/env` con secretos cuando alguien sube spring-boot-starter-actuator sin pensar.

- **Código**: `apps/api/src/main/java/dev/notpelos/cv/config/SecurityConfig.java:33-49`.
- **Trampa común**: "¿Y los endpoints públicos legítimos?". Listados uno a uno: `/error`, `/actuator/health`, `/actuator/info`, `/swagger-ui/**`, `/api/cv/pdf`, `/api/visits`. Si añado uno, code change → review obligatoria.

### 22. ¿Qué resuelve Bucket4j + Caffeine que un `ConcurrentHashMap` no?

Memoria acotada. `ConcurrentHashMap<String, Bucket>` crece sin tope: un atacante con N IPs spoofeadas llena el heap → OOM en JVM con 384 MB. Caffeine acota a 10k entradas con eviction LRU + idle 10 min. Bucket4j da el algoritmo de token bucket (60 tokens/min, refill greedy) sin estado adicional.

- **Código**: `apps/api/src/main/java/dev/notpelos/cv/config/RateLimitConfig.java:40-44`.
- **Trampa común**: "¿Y para escalar horizontalmente?". El estado es in-process: dos instancias = dos buckets independientes. Para escalar migro a `bucket4j-redis` o `bucket4j-hazelcast` con backend distribuido.

### 23. ¿Cómo está configurado Spring Security sin autenticación?

Sin filtros de autenticación, stateless (`SessionCreationPolicy.STATELESS`), CSRF disabled (no hay forms ni cookies de sesión). CORS via `CorsConfigurationSource`. Authz por path: permitAll en los pocos públicos, denyAll en el resto. Headers de seguridad: nosniff, X-Frame-Options DENY, HSTS 1 año + includeSubDomains.

- **Código**: `apps/api/src/main/java/dev/notpelos/cv/config/SecurityConfig.java:22-58`.
- **Trampa común**: "Si no hay sesiones, ¿por qué necesitas Spring Security?". Por los headers, el CORS centralizado y el `denyAll` global. Si lo quitara, cualquier nuevo endpoint sería público por defecto.

### 24. ¿Por qué Dockerfile multi-stage?

Stage 1 (build): JDK Alpine + Maven, compila el jar. Stage 2 (runtime): solo JRE Alpine + el jar resultante. Imagen final ~120 MB vs ~400 MB con JDK incluido. El `addgroup -S cvapp && adduser -S cvapp && USER cvapp` corre la app como non-root: un RCE no escala a root del contenedor.

- **Código**: `apps/api/Dockerfile:4-40`.
- **Trampa común**: "¿Por qué Alpine y no slim?". Alpine usa musl libc → ~5 MB menor, pero hay edge cases con DNS en algunas libs nativas. Para una app Spring Boot pura sin JNI raro, Alpine es seguro. Si tuviera dependencias con código nativo crítico (snappy-java, jansi), usaría `eclipse-temurin:21-jre`.

### 25. ¿Cómo migrarías esto a Kubernetes?

Helm chart con un `Deployment` (replicas según métricas), `Service` ClusterIP, `Ingress` con cert-manager. Rate-limit migrado a Redis (`bucket4j-redis`) — el estado debe ser compartido entre pods. Configuración via `ConfigMap` (CORS allowed origin) + `Secret` (ALLOWED_ORIGIN si fuera sensible). Liveness probe `/actuator/health/liveness`, readiness `/actuator/health/readiness`. HPA en CPU + RPS. Logs a stdout, Fluent Bit → Loki.

- **Código**: hipotético; no implementado.
- **Trampa común**: "¿Por qué no lo hiciste así de entrada?". Coste y complejidad. Fly.io free tier cubre el uso real (5-20 visitas/día). Si llegara a 1000 req/s sostenidos, migraría — pero antes optimizaría el rate-limit y el cache.

### 26. ¿Por qué OpenPDF y no iText?

iText 2 era LGPL — bifurcado como OpenPDF (lo que usamos). iText 5+ es AGPL: copyleft fuerte que contaminaría cualquier código closed-source que linkee. OpenPDF mantiene la API LGPL-compatible y está activamente mantenido. Para un CV showcase no es crítico, pero la disciplina de licencias puntúa en entrevista enterprise.

- **Código**: `apps/api/pom.xml:76-80`, `apps/api/src/main/java/dev/notpelos/cv/service/PdfGenerator.java`.
- **Trampa común**: "¿Y Apache PDFBox?". No tiene layout engine: pintas cajas a mano calculando coordenadas. Para texto fluido con secciones, tablas y headers necesitas algo declarativo como OpenPDF o XSL-FO.

### 27. ¿Cómo extraes la IP real del cliente detrás de Fly.io?

Fly añade `Fly-Client-IP` con la IP real. Si está, la uso. Si no, fallback a `X-Forwarded-For` (primer entry del comma-separated list — el cliente). Último recurso, `request.getRemoteAddr()`. Nunca la logueo: solo se usa como key del rate-limit bucket.

- **Código**: `apps/api/src/main/java/dev/notpelos/cv/controller/CvPdfController.java:114-125`.
- **Trampa común**: "¿Y si un atacante falsifica `Fly-Client-IP`?". Fly elimina/sobrescribe headers del cliente que choquen con los suyos en el proxy. El header solo lo setea Fly. Confiar en headers de proxy es válido solo si controlas el proxy.

### 28. ¿Por qué Actuator solo expone `health` e `info`?

Exponer `/actuator/env`, `/beans` o `/heapdump` filtra secretos, mapas de inyección y estructura interna. `health` con `show-details: never` evita revelar versiones de DB. `info` solo si lo configuro. Es el endpoint #1 en pentest reports de Spring apps mal configuradas.

- **Código**: `apps/api/src/main/resources/application.yml:15-25`.
- **Trampa común**: "¿Y para debugging en prod?". `/actuator/health` con detalles **solo** vía rol autenticado (`show-details: when-authorized` + bean `HealthEndpointAccessControl`). Para `/heapdump` voy por flyctl ssh + jmap manual.

---

## CI/CD + Seguridad (6)

### 29. ¿Qué hace path filtering en GitHub Actions?

`on.push.paths` limita el trigger a cambios en rutas específicas. `web.yml` solo dispara con cambios en `apps/web/**`, lockfile o el propio workflow. Un PR que solo toca `docs/` no corre 6 workflows pesados — feedback rápido y ahorro de minutos.

- **Código**: `.github/workflows/web.yml:5-17`.
- **Trampa común**: "¿Y si el cambio cruza dos áreas?". Disparan ambos workflows en paralelo. `concurrency` con grupo distinto por workflow evita conflictos.

### 30. ¿Por qué branch protection con required status checks?

Imposibilita merger a main sin que pasen CI, CodeQL, Lighthouse y e2e. Imposibilita merge sin review aprobada. La protección es independiente del autor: yo mismo no puedo saltármela en force-push. Es la primera línea de defensa contra "se me coló un commit sin tests".

- **Código**: configurado en GitHub repo settings (no en repo); documentado en `docs/DEPLOYMENT.md`.
- **Trampa común**: "¿Y los hotfixes urgentes?". Las protecciones admiten "Allow administrators to bypass" puntual. Pero queda en el audit log. Disciplina: si es urgente, mereces que quede traza.

### 31. ¿Qué hacen `pnpm.overrides`?

Fuerzan versiones mínimas en dependencias transitivas. Si Astro 6.4 trae `vite@6.0.0` con CVE, y la fix está en `6.4.3`, yo escribo `"vite": ">=6.4.3"` en overrides y pnpm resuelve esa versión para toda la cadena. No tengo que esperar al upstream a publicar un parche de Astro.

- **Código**: `package.json:14-20`.
- **Trampa común**: "¿Y si rompes compatibilidad?". Lockfile + CI lo detectan: el build falla. Override es minimum, no exact — si la lib funciona en 6.4.3+, está bien.

### 32. ¿Cómo manejas secretos?

Tres categorías:
- **Build-time public** (`PUBLIC_WORKER_URL`, `PUBLIC_API_URL`): hardcoded en workflow YAML porque son URLs públicas, no secretos.
- **Deploy tokens** (CLOUDFLARE_API_TOKEN, FLY_API_TOKEN): GitHub Secrets, inyectados solo en jobs de deploy.
- **Runtime secrets** del API (ALLOWED_ORIGIN): `flyctl secrets set` — el secreto vive en Fly, no en repo ni en deploy YAML. Rotable sin redeploy.

- **Código**: `.github/workflows/web.yml:89-90`, `apps/api/fly.toml:11-13` (comentario sobre secrets).
- **Trampa común**: "¿Y un gitleaks pre-commit?". Pendiente. El CodeQL semanal lo cubre parcialmente; gitleaks como pre-commit hook está en el roadmap.

### 33. ¿Cuándo es aceptable `'unsafe-inline'` en CSP?

Cuando no hay XSS sink y el escape es estructural. En nuestro caso Preact (y Astro) emiten scripts inline para hidratar islands. XSS está mitigado porque (a) todo input del user pasa por `textContent` o JSX interpolation con escape automático, (b) cero `innerHTML`, `eval`, `new Function()` en el bundle (verificado por ESLint security plugin). El TODO documentado es migrar a `experimental.csp` con hashes (Astro 6+).

- **Código**: `apps/web/public/_headers:9` (CSP), comentario en `_headers:1-7` explicando.
- **Trampa común**: "Eso es debilitar la CSP". Sí. El strict-dynamic + nonce es lo ideal. Es deuda técnica documentada con plan de remediación, no "no lo sé arreglar".

### 34. ¿Qué cubre CodeQL semanal que no cubre el push trigger?

El push trigger valida cada cambio. El cron semanal detecta nuevas CVEs en deps que no han cambiado en tu repo — GitHub publica reglas nuevas continuamente, y un código que era safe el martes puede tener una alert el lunes siguiente. El cron asegura un escaneo periódico aunque el repo esté quieto.

- **Código**: `.github/workflows/security.yml:8-9`.
- **Trampa común**: "¿Por qué no `cancel-in-progress: false`?". Justamente eso tiene security.yml — los scans nunca se cancelan, deben completarse para registrar SARIF. Los otros workflows sí cancelan para ahorrar minutos.

---

## Arquitectura + decisiones (6)

### 35. ¿Por qué free tier extremo a extremo y no servidor propio?

Tres razones:
1. **Coste real**: 0€/mes. Mi CV no genera revenue; pagar 5€/mes de VPS sería autoindulgente.
2. **Demuestra criterio**: edge compute (Worker) + serverless container (Fly auto-stop) son tecnologías relevantes en 2026 y muestran que sé elegir herramientas modernas.
3. **Resiliencia**: Cloudflare Pages tiene SLA mejor que cualquier VPS que yo administre.

- **Trampa común**: "¿Y si Fly cierra el free tier?". Migro a Render, Railway, o un VPS Hetzner 5€/mes. La app es Docker estándar, portable.

### 36. ¿Cómo escalarías esto a 1M requests/día?

1M/día ≈ 11 req/s promedio, pico ~50-100 req/s. Sin cambios estructurales:
- **Worker**: ya escala automático en el edge. 100k req/día free, después $0.50/M.
- **Pages**: estático, escala infinito.
- **API Fly**: subir a 2 instancias `shared-cpu-2x` (~$10/mes), migrar rate-limit a `bucket4j-redis` con Upstash Redis free, añadir HPA-equivalent vía `flyctl autoscale`.

Cuello real: PDF generation es CPU-bound (200-400ms). Si ese pico crece, cacheo PDFs por `(lang, contentHash)` en KV y solo regenero cuando cambia content.

- **Trampa común**: "¿Y observabilidad?". OpenTelemetry → Grafana Cloud free tier. Métricas: req/s por endpoint, p99 latency, error rate. Hoy solo tengo logs estructurados JSON.

### 37. ¿Qué cambiarías si empezaras de nuevo?

1. **CSP con hashes desde día 1** (`experimental.csp` de Astro 6+) — me ahorra el TODO actual.
2. **Test contracts entre Worker y Web** (Pact o similar) — hoy son tests aislados, no contract.
3. **Una sola PNG para OG image generada en build** desde un componente Astro, no script imperativo en `scripts/generate-og.mjs`.
4. **JSON-LD via componente reutilizable** en vez de inline en `RecruiterLayout`.
5. **PdfGenerator con visitor pattern sobre commonmark AST** para Markdown rendering real, no `replace("**", "")`.

- **Trampa común**: "¿Y vibe coding lo replicarías?". Sí, pero con más checkpoints manuales. Hubo PRs donde el agente se inventó nombres de funciones; los reviewers los cazaron, pero costó tiempo.

### 38. ¿Qué deuda técnica queda?

- CSP `'unsafe-inline'` (deuda documentada en SECURITY.md).
- OWASP Dependency-Check en `api.yml` está con `continue-on-error: true` (workflow.yml:54). Falta configurar suppression file completo.
- Rate-limit del Worker es best-effort (KV TOCTOU). Migrar a Durable Objects cuando RPS lo justifique.
- `stripMarkdownBold` en PdfGenerator es un regex hack; necesita visitor pattern sobre AST commonmark.
- gitleaks pre-commit hook no configurado.
- Sin métricas / tracing en API (solo logs).

Todo en `docs/SECURITY.md` y javadoc inline. Ningún ítem es "no sé qué hacer", todos son "no me ha tocado priorizarlo".

- **Trampa común**: "Si entras a un equipo nuevo, ¿cómo discriminas deuda válida vs mala?". Deuda válida está documentada y tiene un trigger de pago. Mala es invisible.

### 39. ¿Cómo justificas vibe coding ante un manager escéptico?

No vendo "IA escribe código". Vendo:
1. **Documentación estructurada** (`CLAUDE.md`, `docs/AGENTS.md`) que cualquier dev humano podría seguir.
2. **Reviewers bloqueantes**: code-reviewer + security-auditor revisan antes de merge. Si fallan, vuelve al ciclo.
3. **Tests obligatorios**: 91 e2e + ~80 unit + JUnit. La cobertura no baja del 80% en lógica crítica.
4. **Decisiones humanas**: el orquestador (yo) define el sprint, valida los trade-offs, rechaza PRs malos.

El resultado: 6 semanas de trabajo en ~10 días, con documentación y tests que un dev solo difícilmente habría producido en el mismo tiempo. Auditoria completa en `docs/`.

- **Trampa común**: "¿Y si el agente alucina?". Pasa. El reviewer lo caza. Si no lo caza, lo cazan los tests. Si no los cazan los tests, lo caza el e2e. Y si tampoco, lo caza pnpm audit / CodeQL. Capas, no fe.

### 40. ¿Qué partes del proyecto son lo más fuerte y lo más débil?

**Fuerte**:
- **Arquitectura del Terminal**: discriminated unions, reducer puro, side-effects en effects. Es código defendible en cualquier entrevista de senior frontend.
- **Seguridad del API**: denyAll, Bucket4j + Caffeine, actuator restringido, headers. Refleja conciencia OWASP.
- **CI/CD**: 6 workflows con path filters, concurrency, permissions mínimas, branch protection. Es DevOps real, no copy-paste.

**Débil**:
- **Tests del Worker**: 5 specs, no cubren todos los edge cases del rate-limit deslizante. Faltan tests de carga concurrente.
- **Observabilidad**: cero. Solo logs JSON. Sin métricas, sin tracing, sin alerting.
- **Accesibilidad del Terminal**: el `role="log"` + `aria-live="polite"` cubre lo básico, pero un screen reader real navegando comandos no es ideal. La vista recruiter sí pasa axe.
- **PdfGenerator**: regex hack en lugar de visitor sobre AST. Es el archivo que más rápido refactorizaría.

- **Trampa común**: "Si tuvieras que pulir UNA cosa, ¿cuál?". Observabilidad. Es lo que primero te piden al pasar de proyecto personal a producción real.

---

## Apéndice — Mapa rápido para entrevista en vivo

Si te bloqueas, dónde mirar:

| Tema | Archivo principal |
|---|---|
| Astro config | `apps/web/astro.config.mjs` |
| Content schemas | `apps/web/src/content.config.ts` |
| Terminal core | `apps/web/src/components/Terminal.tsx` |
| Tipos discriminados | `apps/web/src/lib/commands/types.ts` |
| Parser | `apps/web/src/lib/parser.ts` |
| FS virtual | `apps/web/src/lib/fs/index.ts`, `seed.ts` |
| i18n | `apps/web/src/lib/i18n/detect.ts` |
| CSP | `apps/web/public/_headers` |
| Worker handler | `apps/worker/src/index.ts` |
| Rate-limit edge | `apps/worker/src/lib/rateLimit.ts` |
| CORS | `apps/worker/src/lib/cors.ts` |
| Spring Security | `apps/api/.../config/SecurityConfig.java` |
| Rate-limit API | `apps/api/.../config/RateLimitConfig.java` |
| PDF | `apps/api/.../service/PdfGenerator.java` |
| Controller PDF | `apps/api/.../controller/CvPdfController.java` |
| Dockerfile | `apps/api/Dockerfile` |
| Fly config | `apps/api/fly.toml` |
| CI web | `.github/workflows/web.yml` |
| CI security | `.github/workflows/security.yml` |
