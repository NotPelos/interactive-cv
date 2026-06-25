/**
 * sync-content.mjs — copia contenido desde personal/ al árbol de build.
 *
 * Se ejecuta automáticamente via `predev` y `prebuild` en apps/web/package.json.
 * También se puede invocar directamente:
 *   node apps/web/scripts/sync-content.mjs
 *   pnpm --filter web sync
 *
 * Requiere que personal/ exista en la raíz del monorepo. Si no existe, falla
 * con mensaje claro indicando cómo conseguirlo (fork o clonar cv-content).
 */

import { existsSync, cpSync, copyFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import { execFileSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Rutas relativas al script (apps/web/scripts/)
const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const PERSONAL_DIR = join(REPO_ROOT, "personal");
const WEB_DIR = join(__dirname, "..");
const SRC_DIR = join(WEB_DIR, "src");
const SOURCE_DIR = join(WEB_DIR, "source");
const PUBLIC_DIR = join(WEB_DIR, "public");

// ---------------------------------------------------------------------------
// 1. Verificar que personal/ existe
// ---------------------------------------------------------------------------

if (!existsSync(PERSONAL_DIR)) {
  console.error(`
ERROR: personal/ directory not found at ${PERSONAL_DIR}

To fix this, choose one of:
  a) Clone the private content repo:
       git clone git@github.com:NotPelos/cv-content.git personal
  b) Fork this repo and create your own personal/ following personal.example/
  c) In CI: ensure the "Checkout cv-content" step ran and CV_CONTENT_PAT is set.
`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 2. Verificar que profile.config.ts existe dentro de personal/
// ---------------------------------------------------------------------------

const profileSrc = join(PERSONAL_DIR, "profile.config.ts");
if (!existsSync(profileSrc)) {
  console.error(`
ERROR: personal/profile.config.ts not found.

Copy the template and fill in your data:
  cp apps/web/src/profile.template.ts personal/profile.config.ts
`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 3. Copiar personal/content/* → apps/web/src/content/*
// ---------------------------------------------------------------------------

const contentSrc = join(PERSONAL_DIR, "content");
const contentDst = join(SRC_DIR, "content");

if (!existsSync(contentSrc)) {
  console.error(`ERROR: personal/content/ directory not found.`);
  process.exit(1);
}

mkdirSync(contentDst, { recursive: true });
cpSync(contentSrc, contentDst, { recursive: true, force: true });
console.log(`[sync] content: ${contentSrc} → ${contentDst}`);

// ---------------------------------------------------------------------------
// 4. Copiar personal/avatar/avatar-raw.png → apps/web/source/avatar-raw.png
// ---------------------------------------------------------------------------

const avatarSrc = join(PERSONAL_DIR, "avatar", "avatar-raw.png");
if (existsSync(avatarSrc)) {
  mkdirSync(SOURCE_DIR, { recursive: true });
  copyFileSync(avatarSrc, join(SOURCE_DIR, "avatar-raw.png"));
  console.log(`[sync] avatar-raw.png copiado a source/`);
} else {
  console.warn(`[sync] WARN: personal/avatar/avatar-raw.png no encontrado — se omite avatar.`);
}

// ---------------------------------------------------------------------------
// 5. Regenerar avatares con generate-avatar.mjs (solo si avatar-raw.png existe)
// ---------------------------------------------------------------------------

if (existsSync(join(SOURCE_DIR, "avatar-raw.png"))) {
  try {
    execFileSync(process.execPath, [join(WEB_DIR, "scripts", "generate-avatar.mjs")], {
      stdio: "inherit",
    });
    console.log(`[sync] avatares regenerados.`);
  } catch {
    console.warn(`[sync] WARN: fallo al regenerar avatares — continúa sin ellos.`);
  }
}

// ---------------------------------------------------------------------------
// 6. Regenerar OG image con generate-og.mjs
//    Leemos profile.config.ts como texto y extraemos los valores con regex
//    para no necesitar tsc en este paso (el script es ESM puro).
// ---------------------------------------------------------------------------

function extractProfileField(src, field) {
  // Busca: field: "value" o field: 'value'
  const pattern = new RegExp(`${field}\\s*:\\s*["']([^"']+)["']`);
  const m = src.match(pattern);
  return m ? m[1] : undefined;
}

let ogEnv = { ...process.env };
if (existsSync(profileSrc)) {
  const { readFileSync } = await import("fs");
  const profileText = readFileSync(profileSrc, "utf8");

  const fullName    = extractProfileField(profileText, "fullName");
  const promptUser  = extractProfileField(profileText, "promptUser");
  const domain      = extractProfileField(profileText, "domain");
  const githubUser  = extractProfileField(profileText, "githubUser");

  if (fullName)   ogEnv["OG_FULL_NAME"]   = fullName;
  if (promptUser) ogEnv["OG_PROMPT_USER"] = promptUser;
  if (domain)     ogEnv["OG_DOMAIN"]      = domain;
  if (githubUser) ogEnv["OG_GITHUB_USER"] = githubUser;
}

try {
  execFileSync(process.execPath, [join(WEB_DIR, "scripts", "generate-og.mjs")], {
    stdio: "inherit",
    env: ogEnv,
  });
  console.log(`[sync] OG image regenerada.`);
} catch {
  console.warn(`[sync] WARN: fallo al regenerar OG image — continúa sin ella.`);
}

// ---------------------------------------------------------------------------
// 7. Copiar personal/profile.config.ts → apps/web/src/profile.ts
//    (sobreescribe el fallback; profile.ts está en .gitignore)
// ---------------------------------------------------------------------------

copyFileSync(profileSrc, join(SRC_DIR, "profile.ts"));
console.log(`[sync] profile.ts actualizado desde personal/profile.config.ts`);

console.log(`[sync] listo.`);
