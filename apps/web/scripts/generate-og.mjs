/**
 * Genera apps/web/public/og-image.png (1200×630) con estética Tokyo Night.
 *
 * Uso:
 *   node apps/web/scripts/generate-og.mjs
 *   pnpm --filter web og:generate
 *
 * Personalización via variables de entorno (sync-content.mjs las inyecta):
 *   OG_FULL_NAME     — nombre completo del owner (default: "Your Name")
 *   OG_PROMPT_USER   — "user@host" del prompt (default: "user@cv")
 *   OG_DOMAIN        — dominio (default: "youralias.pages.dev")
 *   OG_GITHUB_USER   — usuario de GitHub (default: "youralias")
 *
 * Dependencia: sharp (devDependency de apps/web). Usa librsvg bundleado
 * en sharp para renderizar el SVG con texto — sin deps externas adicionales.
 */

import sharp from "sharp";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "..", "public");
const OUTPUT_FILE = join(OUTPUT_DIR, "og-image.png");
const FAVICON_FILE = join(OUTPUT_DIR, "favicon.svg");

const W = 1200;
const H = 630;

// Datos del owner — leídos de variables de entorno para que el script sea agnóstico.
// sync-content.mjs las inyecta antes de llamar a este script.
const OG_FULL_NAME   = process.env["OG_FULL_NAME"]   ?? "Your Name";
const OG_PROMPT_USER = process.env["OG_PROMPT_USER"] ?? "user@cv";
const OG_DOMAIN      = process.env["OG_DOMAIN"]      ?? "youralias.pages.dev";
const OG_GITHUB_USER = process.env["OG_GITHUB_USER"] ?? "youralias";

// Paleta Tokyo Night
const COLORS = {
  bg: "#1a1b26",
  elevated: "#24283b",
  border: "#414868",
  text: "#c0caf5",
  muted: "#565f89",
  blue: "#7aa2f7",
  magenta: "#bb9af7",
  green: "#9ece6a",
  red: "#f7768e",
};

/**
 * Escapa caracteres especiales XML para uso seguro en SVG.
 * Nunca se usa con input de usuario — solo con strings literales del build.
 */
function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Genera el bloque SVG del prompt de terminal con posiciones dinámicas.
 * Permite que OG_PROMPT_USER tenga cualquier longitud.
 * Monospace a 22px: ~13.2 px/char (bold ~13.5, estimamos uniforme).
 */
function renderPromptHeader(startX, y) {
  const charW = 13.2;
  const promptText = OG_PROMPT_USER;
  const promptW = Math.ceil(promptText.length * charW);
  const colonX = startX + promptW;
  const tildeX = colonX + charW;
  const dollarX = tildeX + charW;
  const cmdX = dollarX + charW * 2; // "$ " son 2 chars

  return /* xml */ `<text x="${startX}" y="${y}" font-family="monospace" font-size="22" fill="${COLORS.blue}" font-weight="700">${escapeXml(promptText)}</text>
  <text x="${colonX}" y="${y}" font-family="monospace" font-size="22" fill="${COLORS.muted}">:</text>
  <text x="${tildeX}" y="${y}" font-family="monospace" font-size="22" fill="${COLORS.magenta}" font-weight="700">~</text>
  <text x="${dollarX}" y="${y}" font-family="monospace" font-size="22" fill="${COLORS.muted}">$ </text>
  <text x="${cmdX}" y="${y}" font-family="monospace" font-size="22" fill="${COLORS.green}">cat about.md</text>`;
}

// SVG de la OG image (1200×630)
// Fuente: monospace genérico (librsvg no carga woff2; usa el stack sans-serif del sistema).
// En producción la imagen es un PNG estático — la fuente en el PNG no importa
// siempre que el resultado sea legible y coherente con la paleta.
const ogSvg = /* xml */ `<svg
  width="${W}"
  height="${H}"
  viewBox="0 0 ${W} ${H}"
  xmlns="http://www.w3.org/2000/svg"
>
  <!-- Fondo principal -->
  <rect width="${W}" height="${H}" fill="${COLORS.bg}" />

  <!-- Borde sutil alrededor de toda la imagen -->
  <rect
    x="1" y="1"
    width="${W - 2}" height="${H - 2}"
    fill="none"
    stroke="${COLORS.border}"
    stroke-width="2"
  />

  <!-- Panel elevado central -->
  <rect
    x="60" y="100"
    width="${W - 120}" height="${H - 180}"
    rx="8" ry="8"
    fill="${COLORS.elevated}"
    stroke="${COLORS.border}"
    stroke-width="1"
  />

  <!-- Barra de título del panel (estilo ventana de terminal) -->
  <rect
    x="60" y="100"
    width="${W - 120}" height="44"
    rx="8" ry="8"
    fill="${COLORS.border}"
  />
  <!-- Rectángulo extra para cuadrar las esquinas inferiores de la barra -->
  <rect
    x="60" y="122"
    width="${W - 120}" height="22"
    fill="${COLORS.border}"
  />

  <!-- Dots de ventana (rojo, amarillo, verde) -->
  <circle cx="96"  cy="122" r="8" fill="${COLORS.red}" />
  <circle cx="120" cy="122" r="8" fill="#e0af68" />
  <circle cx="144" cy="122" r="8" fill="${COLORS.green}" />

  <!-- Título de la barra: ruta del terminal -->
  <text
    x="${W / 2}" y="130"
    text-anchor="middle"
    dominant-baseline="middle"
    font-family="monospace"
    font-size="14"
    fill="${COLORS.muted}"
    letter-spacing="0.5"
  >${escapeXml(OG_DOMAIN)} — cv</text>

  <!-- Prompt header: user@cv:~$ cat about.md -->
  ${renderPromptHeader(96, 210)}

  <!-- Nombre grande -->
  <text
    x="96" y="310"
    font-family="monospace"
    font-size="52"
    font-weight="500"
    fill="${COLORS.text}"
    letter-spacing="-0.5"
  >${escapeXml(OG_FULL_NAME)}</text>

  <!-- Título / Stack -->
  <text
    x="96" y="375"
    font-family="monospace"
    font-size="26"
    font-weight="400"
    fill="${COLORS.blue}"
    letter-spacing="0.5"
  >Backend Developer · Java · Spring Boot · Microservices</text>

  <!-- Separador -->
  <line
    x1="96" y1="410"
    x2="${W - 96}" y2="410"
    stroke="${COLORS.border}"
    stroke-width="1"
  />

  <!-- Skills pills -->
  ${renderPills(96, 440, ["Java 21", "Spring Boot 3", "Kafka", "Docker", "PostgreSQL", "TypeScript"])}

  <!-- GitHub handle — esquina inferior derecha -->
  <text
    x="${W - 72}" y="${H - 42}"
    text-anchor="end"
    font-family="monospace"
    font-size="16"
    fill="${COLORS.muted}"
  >github.com/${escapeXml(OG_GITHUB_USER)}</text>

  <!-- Cursor parpadeante (estático en PNG) -->
  <rect
    x="96" y="490"
    width="14" height="24"
    fill="${COLORS.text}"
    opacity="0.85"
  />
</svg>`;

/**
 * Genera grupos SVG de pills para las skills.
 * x, y: posición de inicio. items: array de strings.
 */
function renderPills(x, y, items) {
  const pillH = 32;
  const paddingX = 14;
  const gap = 12;
  const fontSize = 15;
  // Ancho aproximado por carácter (monospace ~9.6px a 15px)
  const charW = 9.6;

  let currentX = x;
  return items
    .map((label) => {
      const pillW = Math.ceil(label.length * charW) + paddingX * 2;
      const group = /* xml */ `
    <rect
      x="${currentX}" y="${y}"
      width="${pillW}" height="${pillH}"
      rx="4" ry="4"
      fill="none"
      stroke="${COLORS.border}"
      stroke-width="1.5"
    />
    <text
      x="${currentX + pillW / 2}" y="${y + pillH / 2}"
      text-anchor="middle"
      dominant-baseline="middle"
      font-family="monospace"
      font-size="${fontSize}"
      fill="${COLORS.text}"
    >${escapeXml(label)}</text>`;
      currentX += pillW + gap;
      return group;
    })
    .join("\n");
}

// SVG del favicon (32×32, diseño ">_" en azul Tokyo Night)
const faviconSvg = /* xml */ `<svg
  width="32" height="32"
  viewBox="0 0 32 32"
  xmlns="http://www.w3.org/2000/svg"
>
  <rect width="32" height="32" rx="4" fill="${COLORS.bg}" />
  <!-- ">" -->
  <text
    x="5" y="23"
    font-family="monospace"
    font-size="18"
    font-weight="700"
    fill="${COLORS.blue}"
  >&gt;_</text>
</svg>`;

async function main() {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Genera og-image.png
  const svgBuffer = Buffer.from(ogSvg);
  await sharp(svgBuffer)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(OUTPUT_FILE);

  const stats = (await import("fs")).statSync(OUTPUT_FILE);
  console.log(`og-image.png generado: ${OUTPUT_FILE}`);
  console.log(`  Tamaño: ${(stats.size / 1024).toFixed(1)} KB`);
  console.log(`  Dimensiones: ${W}x${H} px`);

  // Genera favicon.svg (SVG estático — no necesita sharp)
  const { writeFileSync } = await import("fs");
  writeFileSync(FAVICON_FILE, faviconSvg, "utf8");
  console.log(`favicon.svg generado: ${FAVICON_FILE}`);
}

main().catch((err) => {
  console.error("Error generando assets:", err);
  process.exit(1);
});
