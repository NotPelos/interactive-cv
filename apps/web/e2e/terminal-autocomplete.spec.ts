/**
 * terminal-autocomplete.spec.ts
 * Flujo 6 parcial: Tab autocompleta comandos y rutas.
 */

import { test, expect } from "@playwright/test";
import { gotoTerminal, terminalInput } from "./helpers.js";

test.describe("Terminal — autocompletado con Tab", () => {
  test("Tab completa un comando único que empieza por el prefijo escrito", async ({ page }) => {
    await gotoTerminal(page);
    const input = terminalInput(page);

    // "neo" es prefijo único de "neofetch"
    await input.fill("neo");
    await input.press("Tab");

    await expect(input).toHaveValue("neofetch ", { timeout: 3_000 });
  });

  test("Tab sobre 'cd ex' autocompleta a 'cd experience/'", async ({ page }) => {
    await gotoTerminal(page);
    const input = terminalInput(page);

    await input.fill("cd ex");
    await input.press("Tab");

    await expect(input).toHaveValue("cd experience/", { timeout: 3_000 });
  });

  test("Tab con prefijo ambiguo muestra las opciones disponibles", async ({ page }) => {
    await gotoTerminal(page);
    const input = terminalInput(page);

    // "l" puede ser "ls", "lang" — debe mostrar opciones, no completar
    await input.fill("l");
    await input.press("Tab");

    // El input no debería haber completado a un único valor
    // sino mostrar las opciones en el output.
    // Usamos .first() para evitar strict-mode con múltiples matches.
    await expect(page.getByText("ls", { exact: false }).first()).toBeVisible({ timeout: 3_000 });
    await expect(page.getByText("lang", { exact: false }).first()).toBeVisible({ timeout: 3_000 });
  });

  test("Tab con un solo match de ruta completa el path con trailing slash si es directorio", async ({ page }) => {
    await gotoTerminal(page);
    const input = terminalInput(page);

    // "cd pro" -> "cd projects/"
    await input.fill("cd pro");
    await input.press("Tab");

    const value = await input.inputValue();
    expect(value).toMatch(/projects\//);
  });
});
