# Chuleta de Astro — para que defiendas el proyecto en entrevistas

> Mantenido por el agente `astro-tutor`. Crece conforme avancemos.

## Qué es Astro en 30 segundos

Framework web orientado a contenido. Genera **HTML estático por defecto** y solo manda JS donde lo pides explícitamente (islands architecture). Esto da Lighthouse alto sin trucos: no envías React a una landing que no lo necesita.

## Conceptos clave

### 1. SSG vs SSR vs Hybrid

- **SSG (Static Site Generation)**: HTML construido en `build`. Es el modo por defecto, perfecto para CVs.
- **SSR (Server Side Rendering)**: HTML construido por request. Necesita adapter (Cloudflare, Node, Vercel).
- **Hybrid**: parte estático, parte SSR. En nuestro proyecto: la vista recruiter es SSG; si añadiéramos algo dinámico (ej: contador en vivo) iría a una API route.

Astro detecta automáticamente. Tú marcas con `export const prerender = false` lo que quieres dinámico.

### 2. Islands

Una "isla" es un componente con JS que se hidrata en cliente. El resto de la página es HTML muerto.

```astro
---
import Terminal from '../components/Terminal.tsx';
---
<html>
  <h1>Esto es HTML puro, 0 JS</h1>
  <Terminal client:load />   <!-- esto sí envía JS -->
</html>
```

Directivas de cliente:
- `client:load` → hidrata al cargar (úsalo para el terminal).
- `client:idle` → cuando el browser está ocioso.
- `client:visible` → cuando entra en viewport (perfecto para componentes "abajo del fold").
- `client:media="(max-width: 800px)"` → solo si matchea.
- `client:only="react"` → solo cliente, sin SSR (para libs que rompen en server).

### 3. Content collections

Tipado fuerte para tu contenido MD/MDX. Defines un schema en `src/content/config.ts` con Zod y Astro valida cada archivo en build.

```ts
import { defineCollection, z } from 'astro:content';
const experience = defineCollection({
  type: 'content',
  schema: z.object({
    company: z.string(),
    role: z.string(),
    start: z.string(),
    end: z.string(),
    stack: z.array(z.string()),
    lang: z.enum(['es', 'en'])
  })
});
export const collections = { experience };
```

Luego en una página: `await getCollection('experience', e => e.data.lang === 'es')`.

**Para nuestro CV bilingüe** esto es oro: un archivo por puesto/idioma, validado, tipado, queryable.

### 4. File-based routing

`src/pages/index.astro` → `/`
`src/pages/cv.astro` → `/cv`
`src/pages/[lang]/index.astro` → `/es`, `/en`
`src/pages/api/visits.json.ts` → endpoint que devuelve JSON (necesita adapter SSR).

### 5. Layouts

Componentes que envuelven páginas. Reutilizas el `<head>`, navegación, footer.

### 6. Integraciones

`astro add tailwind`, `astro add sitemap`, `astro add cloudflare`. Se instalan y configuran solas.

## Por qué Astro para este CV (defensa en entrevista)

> "Elegí Astro porque la web es 90% contenido estático (CV, proyectos, sobre mí) y solo un 10% interactivo (la terminal). Con Next/SvelteKit estaría enviando un runtime completo para 800 líneas de TS. Astro me da HTML puro en la vista clásica, perfecto para SEO y reclutadores con conexión lenta, y carga JS solo en el componente terminal. El resultado es Lighthouse 99 sin optimización agresiva."

## Pitfalls que ya cubrimos

- **No usar `<script>` inline sin nonce** → CSP estricta no lo permitiría.
- **No mezclar JSX y `.astro`** para el mismo componente sin necesidad — `.astro` es lo nativo, JSX (`.tsx`) solo para islands con estado.
- **Cuidado con `client:only`** — desactiva SSR; sin contenido inicial para SEO.

## Comandos día a día

```bash
pnpm create astro@latest          # nuevo proyecto
pnpm dev                          # dev server
pnpm build                        # genera dist/
pnpm preview                      # preview del build
pnpm astro add <integration>      # añade integración
pnpm astro check                  # typecheck del proyecto
```

## Para profundizar (en orden)

1. Docs oficiales: https://docs.astro.build
2. View Transitions API (Astro las soporta nativo).
3. Server Islands (Astro 5+).
4. Astro DB.
5. Adapter de Cloudflare en detalle (Workers, KV).

## Preguntas tipo entrevista

- *¿Diferencia entre `client:load` y `client:idle`?* → ya arriba.
- *¿Astro hace tree-shaking?* → Sí, vía Vite (Astro está construido sobre Vite).
- *¿Cómo manejas i18n?* → Content collections + carpetas por idioma + `astro:i18n` (built-in desde 4.0).
- *¿Por qué no Next?* → Next renderiza React en server por defecto y envía hydration al cliente; Astro envía cero JS por defecto. Para contenido estático Astro gana en bundle.

Iré ampliando con cada cosa que implementemos.
