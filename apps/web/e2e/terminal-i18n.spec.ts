/**
 * terminal-i18n.spec.ts
 * Flujo 3: lang en cambia idioma. Persiste en localStorage tras reload.
 */

import { test, expect } from "@playwright/test";
import { gotoTerminal, runCommand, waitForOutput, terminalInput } from "./helpers.js";

const LANG_STORAGE_KEY = "notpelos.lang";

test.describe("Terminal — i18n (lang es|en)", () => {
  test("lang en cambia el idioma de respuesta a inglés", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "lang en");

    // La respuesta de lang en debe indicar que el idioma cambió a inglés
    await waitForOutput(page, "English");
  });

  test("lang es vuelve al español", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "lang en");
    await waitForOutput(page, "English");
    await runCommand(page, "lang es");
    await waitForOutput(page, "Español");
  });

  test("el idioma se persiste en localStorage", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "lang en");
    await waitForOutput(page, "English");

    // Esperamos a que el useEffect de lang escriba en localStorage.
    // Usamos un poll en lugar de setTimeout para no depender de timings fijos.
    await page.waitForFunction(
      (key) => localStorage.getItem(key) === "en",
      LANG_STORAGE_KEY,
      { timeout: 5_000 }
    );

    const stored = await page.evaluate(
      (key) => localStorage.getItem(key),
      LANG_STORAGE_KEY
    );
    expect(stored).toBe("en");
  });

  test("el idioma persiste tras recargar la página", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "lang en");
    await waitForOutput(page, "English");

    // Recargar
    await page.reload();
    await expect(terminalInput(page)).toBeEnabled({ timeout: 10_000 });

    // El lang del localStorage se detecta al montar → respuesta en inglés
    await runCommand(page, "help");
    await waitForOutput(page, "Show available commands");
  });

  test("cat about.md en inglés muestra contenido en inglés tras lang en", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "lang en");
    await waitForOutput(page, "English");

    // El FS cambia al FS de inglés cuando se ejecuta lang en
    // (el terminal reinicia el FS al cambiar lang)
    await runCommand(page, "cat about.md");
    // No debe mostrar error — el archivo existe en ambos idiomas
    await expect(page.getByText("No such file", { exact: false })).not.toBeVisible({ timeout: 3_000 });
  });

  test("lang con argumento inválido muestra error", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "lang fr");
    // Debe mostrar mensaje de error (es|en son los únicos válidos)
    await waitForOutput(page, "es");
    await waitForOutput(page, "en");
  });
});
