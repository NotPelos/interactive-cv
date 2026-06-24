/**
 * terminal-easter-eggs.spec.ts
 * Flujo 7: easter eggs funcionan y no rompen el terminal.
 */

import { test, expect } from "@playwright/test";
import { gotoTerminal, runCommand, waitForOutput, terminalInput } from "./helpers.js";

test.describe("Terminal — easter eggs", () => {
  test("sudo muestra mensaje de permisos denegados sin romper el terminal", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "sudo rm -rf /");

    // El easter egg de sudo responde con un mensaje
    await waitForOutput(page, "root");

    // El terminal sigue funcionando
    await expect(terminalInput(page)).toBeEnabled({ timeout: 3_000 });
  });

  test("rm -rf / muestra animación de borrado fake sin borrar nada", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "rm -rf /");

    // Respuesta del easter egg rm
    await waitForOutput(page, "rm: removing");
    // El mensaje final indica que no se borró nada realmente
    await waitForOutput(page, "intento");

    // El terminal sigue funcionando
    await expect(terminalInput(page)).toBeEnabled({ timeout: 3_000 });
    // El filesystem sigue intacto — ls funciona
    await runCommand(page, "ls");
    await waitForOutput(page, "about.md");
  });

  test("vim muestra mensaje de easter egg", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "vim");
    await waitForOutput(page, "terminal");
    await expect(terminalInput(page)).toBeEnabled({ timeout: 3_000 });
  });

  test("emacs muestra mensaje de easter egg", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "emacs");
    await waitForOutput(page, "creencias");
    await expect(terminalInput(page)).toBeEnabled({ timeout: 3_000 });
  });

  test("hack muestra mensaje de easter egg", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "hack");
    await waitForOutput(page, "estás dentro");
    await expect(terminalInput(page)).toBeEnabled({ timeout: 3_000 });
  });

  test("exit muestra mensaje de easter egg sin cerrar la página", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "exit");
    await waitForOutput(page, "huir");
    // La página sigue activa
    await expect(page).toHaveURL("/");
    await expect(terminalInput(page)).toBeEnabled({ timeout: 3_000 });
  });

  test("los easter eggs NO aparecen en el output de help", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "help");
    await waitForOutput(page, "cat");

    // Capturar el texto completo del output
    const outputText = await page.locator("body").innerText();

    // Los easter eggs no deben estar listados en las columnas de help
    // (sí pueden aparecer en el banner de bienvenida como sugerencias)
    // Los comandos en help aparecen con padding: "  sudo        " pattern
    expect(outputText).not.toMatch(/^ {2}sudo\s/m);
    expect(outputText).not.toMatch(/^ {2}hack\s/m);
    expect(outputText).not.toMatch(/^ {2}vim\s/m);
    expect(outputText).not.toMatch(/^ {2}emacs\s/m);
    expect(outputText).not.toMatch(/^ {2}hello\s/m);
  });
});
