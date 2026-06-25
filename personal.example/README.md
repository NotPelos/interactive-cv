# personal.example/

Muestra la estructura esperada para la carpeta `personal/`.

Para usar este framework como fork:

1. Copia esta carpeta como `personal/`:
   ```bash
   cp -r personal.example/ personal/
   ```

2. Edita `personal/profile.config.ts` con tus datos.

3. Añade tu foto como `personal/avatar/avatar-raw.png` (PNG, min 240×240 px).

4. Rellena los archivos en `personal/content/` con tu CV.

5. Ejecuta:
   ```bash
   pnpm install
   pnpm --filter web sync
   pnpm --filter web dev
   ```

La estructura de content collections debe seguir los schemas definidos en
`apps/web/src/content.config.ts`.
