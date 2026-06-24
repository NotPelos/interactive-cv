/**
 * Genera 6 variantes del avatar desde apps/web/source/avatar-raw.png
 * hacia apps/web/public/avatar/.
 *
 * Uso:
 *   node apps/web/scripts/generate-avatar.mjs
 *   pnpm --filter web avatar:generate
 *
 * Dependencia: sharp (devDependency de apps/web).
 */

import sharp from "sharp";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync, statSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(__dirname, "..", "source", "avatar-raw.png");
const OUTPUT_DIR = join(__dirname, "..", "public", "avatar");

mkdirSync(OUTPUT_DIR, { recursive: true });

/** @type {Array<{ size: number; base: string }>} */
const SIZES = [
  { size: 80,  base: "avatar-80"  },
  { size: 160, base: "avatar-160" },
  { size: 240, base: "avatar-240" },
];

async function generateVariant(size, base) {
  const pipeline = sharp(SOURCE).resize(size, size, { fit: "cover", position: "centre" });

  const webpPath = join(OUTPUT_DIR, `${base}.webp`);
  await pipeline.clone().webp({ quality: 85 }).toFile(webpPath);
  const webpKB = (statSync(webpPath).size / 1024).toFixed(1);

  const jpgPath = join(OUTPUT_DIR, `${base}.jpg`);
  await pipeline.clone().jpeg({ quality: 88, progressive: true }).toFile(jpgPath);
  const jpgKB = (statSync(jpgPath).size / 1024).toFixed(1);

  console.log(`  ${base}.webp  ${webpKB} KB`);
  console.log(`  ${base}.jpg   ${jpgKB} KB`);
}

async function main() {
  console.log(`Fuente: ${SOURCE}`);
  console.log(`Salida: ${OUTPUT_DIR}`);
  console.log("---");

  for (const { size, base } of SIZES) {
    await generateVariant(size, base);
  }

  console.log("---");
  console.log("Avatar generado con exito.");
}

main().catch((err) => {
  console.error("Error generando avatar:", err);
  process.exit(1);
});
