/**
 * terminal-sound.spec.ts
 * sound on cambia estado y persiste en localStorage.
 */

import { test, expect } from "@playwright/test";
import { gotoTerminal, runCommand, waitForOutput, terminalInput } from "./helpers.js";

const SOUND_STORAGE_KEY = "notpelos.sound";

test.describe("Terminal — comando sound", () => {
  test("sound on activa el sonido y lo persiste en localStorage", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "sound on");

    await waitForOutput(page, "activado");

    // sound.ts llama writeSoundStorage() de forma síncrona en el command.run() —
    // pero el effect setSound es asíncrono. Usamos waitForFunction para poll seguro.
    await page.waitForFunction(
      (key) => localStorage.getItem(key) === "on",
      SOUND_STORAGE_KEY,
      { timeout: 5_000 }
    );
    const stored = await page.evaluate(
      (key) => localStorage.getItem(key),
      SOUND_STORAGE_KEY
    );
    expect(stored).toBe("on");
  });

  test("sound off desactiva el sonido y lo persiste", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "sound on");
    await waitForOutput(page, "activado");

    await runCommand(page, "sound off");
    await waitForOutput(page, "desactivado");

    await page.waitForFunction(
      (key) => localStorage.getItem(key) === "off",
      SOUND_STORAGE_KEY,
      { timeout: 5_000 }
    );
    const stored = await page.evaluate(
      (key) => localStorage.getItem(key),
      SOUND_STORAGE_KEY
    );
    expect(stored).toBe("off");
  });

  test("sound sin args muestra el estado actual", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "sound");

    // Sin args muestra estado actual (por defecto off)
    await waitForOutput(page, "desactivado");
  });

  test("el estado de sound persiste tras recargar la página", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "sound on");
    await waitForOutput(page, "activado");

    await page.reload();
    await expect(terminalInput(page)).toBeEnabled({ timeout: 10_000 });

    // Verificar que localStorage mantiene el valor
    const stored = await page.evaluate(
      (key) => localStorage.getItem(key),
      SOUND_STORAGE_KEY
    );
    expect(stored).toBe("on");
  });

  test("sound con argumento inválido muestra error", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "sound maybe");

    await waitForOutput(page, "inválida");
  });
});
