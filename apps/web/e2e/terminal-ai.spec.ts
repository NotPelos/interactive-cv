/**
 * terminal-ai.spec.ts
 * ai contratar → keyword "hire". ai pregunta-sin-trigger → fallback.
 */

import { test } from "@playwright/test";
import { gotoTerminal, runCommand, waitForOutput } from "./helpers.js";

test.describe("Terminal — comando ai (asistente fake)", () => {
  test("ai contratar responde con la pista de contratación en español", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "ai contratar");

    // El trigger "contratar" devuelve: "¿Contratarme? Rápido: `cat about.md`..."
    await waitForOutput(page, "about.md");
  });

  test("ai hire responde en inglés con keyword hire", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "lang en");
    await waitForOutput(page, "English");

    await runCommand(page, "ai hire");
    // En inglés: "Hire me? Quick path: `cat about.md`..."
    await waitForOutput(page, "about.md");
  });

  test("ai java responde con referencia a experience", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "ai java");

    await waitForOutput(page, "experience");
  });

  test("ai pregunta-aleatoria-sin-trigger muestra el fallback", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "ai zxqkjfhwlp");

    // Fallback: "No tengo respuesta enlatada para eso..."
    await waitForOutput(page, "fake");
  });

  test("ai sin argumentos muestra hint de uso", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "ai");

    await waitForOutput(page, "hazme una pregunta");
  });

  test("ai remoto responde sobre trabajo remoto", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "ai remoto");

    await waitForOutput(page, "preferida");
  });

  test("ai matrix dispara la pista del Konami code", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "ai matrix");

    await waitForOutput(page, "Konami");
  });
});
