/**
 * terminal-history.spec.ts
 * Flujo 6 parcial: teclas ↑↓ navegan el historial de comandos.
 */

import { test, expect } from "@playwright/test";
import { gotoTerminal, runCommand, terminalInput } from "./helpers.js";

test.describe("Terminal — historial de comandos", () => {
  test("flecha ↑ recupera el último comando ejecutado", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "help");
    await runCommand(page, "pwd");

    const input = terminalInput(page);
    await input.press("ArrowUp");

    // El input debe mostrar el último comando (pwd)
    await expect(input).toHaveValue("pwd", { timeout: 3_000 });
  });

  test("flecha ↑ dos veces recupera el penúltimo comando", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "help");
    await runCommand(page, "pwd");

    const input = terminalInput(page);
    // Primera pulsación — debe ir a "pwd"
    await input.press("ArrowUp");
    await expect(input).toHaveValue("pwd", { timeout: 3_000 });

    // Segunda pulsación — debe ir a "help"
    await input.press("ArrowUp");
    await expect(input).toHaveValue("help", { timeout: 3_000 });
  });

  test("flecha ↓ después de ↑ avanza en el historial", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "help");
    await runCommand(page, "pwd");

    const input = terminalInput(page);
    // Navegar hacia atrás hasta "help"
    await input.press("ArrowUp");
    await expect(input).toHaveValue("pwd", { timeout: 3_000 });
    await input.press("ArrowUp");
    await expect(input).toHaveValue("help", { timeout: 3_000 });

    // Ahora avanzar — debe volver a "pwd"
    await input.press("ArrowDown");
    await expect(input).toHaveValue("pwd", { timeout: 3_000 });
  });

  test("flecha ↓ al final del historial limpia el input", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "pwd");

    const input = terminalInput(page);
    await input.press("ArrowUp"); // pwd
    await input.press("ArrowDown"); // vacío

    await expect(input).toHaveValue("", { timeout: 3_000 });
  });

  test("los comandos duplicados consecutivos no se añaden dos veces al historial", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "pwd");
    await runCommand(page, "pwd");

    const input = terminalInput(page);
    await input.press("ArrowUp");
    await expect(input).toHaveValue("pwd", { timeout: 3_000 });

    await input.press("ArrowUp");
    // Debería seguir siendo "pwd" porque no hay entrada anterior distinta
    await expect(input).toHaveValue("pwd", { timeout: 3_000 });
  });
});
