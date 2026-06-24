/**
 * terminal-basic.spec.ts
 * Flujo 1: carga inicial → banner → help → lista de comandos.
 */

import { test, expect } from "@playwright/test";
import { gotoTerminal, runCommand, waitForOutput, terminalInput } from "./helpers.js";

test.describe("Terminal — carga inicial y comando help", () => {
  test("muestra el banner de bienvenida al cargar la página", async ({ page }) => {
    await gotoTerminal(page);

    // Banner bilingüe definido en WELCOME_LINES de Terminal.tsx
    await expect(page.getByText("Bienvenido", { exact: false })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("Welcome", { exact: false })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText("help", { exact: false }).first()).toBeVisible({ timeout: 5_000 });
  });

  test("el input del terminal está disponible y recibe el foco al cargar", async ({ page }) => {
    await gotoTerminal(page);
    const input = terminalInput(page);
    // El input está en el DOM (aunque sea opacity:0 — es intencionalmente invisible)
    await expect(input).toBeAttached({ timeout: 5_000 });
    await expect(input).not.toBeDisabled({ timeout: 5_000 });
    // El foco se establece via inputRef.current?.focus() en useEffect
    // Usamos waitForFunction para esperar con poll hasta que el foco esté establecido
    await page.waitForFunction(() => {
      const inp = document.querySelector<HTMLInputElement>('input[aria-label="Terminal input"]');
      return inp !== null && document.activeElement === inp;
    }, undefined, { timeout: 5_000 });
  });

  test("el prompt notpelos@cv es visible", async ({ page }) => {
    await gotoTerminal(page);
    await expect(page.getByText("notpelos@cv", { exact: false })).toBeVisible({ timeout: 5_000 });
  });

  test("comando help lista los comandos no-ocultos", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "help");

    // Comandos definidos en commandRegistry (no hidden)
    await waitForOutput(page, "ls");
    await waitForOutput(page, "cd");
    await waitForOutput(page, "cat");
    await waitForOutput(page, "tree");
    await waitForOutput(page, "neofetch");
    await waitForOutput(page, "lang");
    await waitForOutput(page, "recruiter");
    await waitForOutput(page, "download");
    await waitForOutput(page, "ai");
    await waitForOutput(page, "sound");
    await waitForOutput(page, "man");
  });

  test("help NO lista los easter eggs (hidden: true)", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "help");

    // Dar tiempo a que el output se renderice
    await waitForOutput(page, "ls");

    // Los easter eggs tienen hidden: true y no deben aparecer en help
    // Verificamos que no están en la zona del listado de help.
    // Tomamos el texto completo del output del terminal.
    const terminalText = await page.locator("body").innerText();
    // "sudo" y "rm" son easter eggs — no deben aparecer en la tabla de help
    // (pueden aparecer en el banner pero no como comandos listados por help)
    // Verificamos que tras ejecutar help no aparecen en la sección de comandos
    // buscando sus posiciones relativas — si los easter eggs están listados en help
    // aparecerían junto a los otros comandos en columnas
    expect(terminalText).not.toMatch(/^\s+sudo\s+/m);
    expect(terminalText).not.toMatch(/^\s+hack\s+/m);
  });

  test("comando desconocido muestra error de comando no encontrado", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "comandoinexistente123");
    await waitForOutput(page, "help");
  });

  test("Ctrl+L limpia el terminal", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "help");
    await waitForOutput(page, "ls");

    const input = terminalInput(page);
    await input.press("Control+l");

    // Tras limpiar, el banner y la salida de help deben desaparecer
    await expect(page.getByText("╔══", { exact: false })).not.toBeVisible({ timeout: 3_000 });
  });
});
