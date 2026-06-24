/**
 * terminal-konami.spec.ts
 * Secuencia Konami → MatrixRain visible. Tras 10s desaparece.
 */

import { test, expect } from "@playwright/test";
import { gotoTerminal } from "./helpers.js";

// La secuencia Konami definida en Terminal.tsx:
// ArrowUp ArrowUp ArrowDown ArrowDown ArrowLeft ArrowRight ArrowLeft ArrowRight b a
const KONAMI_KEYS = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

async function triggerKonami(page: import("@playwright/test").Page): Promise<void> {
  for (const key of KONAMI_KEYS) {
    await page.keyboard.press(key);
  }
}

test.describe("Terminal — easter egg Konami code", () => {
  test("secuencia Konami activa el canvas de MatrixRain", async ({ page }) => {
    await gotoTerminal(page);
    // Esperar banner para asegurar que los useEffects han montado
    await page.getByText("Bienvenido", { exact: false }).waitFor({ timeout: 5_000 });

    // Trigger secuencia Konami
    await triggerKonami(page);

    // MatrixRain se renderiza como un canvas. El componente MatrixRain.tsx
    // monta un <canvas> cuando está activo.
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 5_000 });
  });

  test("MatrixRain desaparece automáticamente después de 10 segundos", async ({ page }) => {
    // Este test espera los 10s del timer interno — timeout ampliado
    test.setTimeout(35_000);

    await gotoTerminal(page);
    await triggerKonami(page);

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 5_000 });

    // Esperar que el timer de 10s dispare STOP_MATRIX
    await expect(canvas).not.toBeVisible({ timeout: 15_000 });
  });

  test("el terminal sigue funcionando durante MatrixRain", async ({ page }) => {
    await gotoTerminal(page);
    await page.getByText("Bienvenido", { exact: false }).waitFor({ timeout: 5_000 });
    await triggerKonami(page);

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 5_000 });

    // El input sigue disponible durante la lluvia
    const input = page.getByLabel("Terminal input");
    await expect(input).toBeEnabled({ timeout: 3_000 });
  });

  test("la secuencia Konami no se re-activa mientras MatrixRain está activo", async ({ page }) => {
    await gotoTerminal(page);

    // Esperar a que el banner esté visible — garantiza que los useEffects han montado
    await page.getByText("Bienvenido", { exact: false }).waitFor({ timeout: 5_000 });

    await triggerKonami(page);

    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 5_000 });

    // Intentar disparar de nuevo — el handler de la primera Konami ya limpió el buffer
    // y state.matrixActive previene re-trigger
    await triggerKonami(page);

    // Sigue habiendo un solo canvas (no se añade otro)
    await expect(canvas).toHaveCount(1, { timeout: 3_000 });
  });
});
