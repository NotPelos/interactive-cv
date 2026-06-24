/**
 * terminal-offline.spec.ts
 * Tests offline-friendly: download y repos en modo degradado.
 * El dev server NO tiene PUBLIC_API_URL ni PUBLIC_WORKER_URL configurados,
 * por lo que ambos endpoints son strings vacíos → modo degradado inmediato.
 */

import { test, expect } from "@playwright/test";
import { gotoTerminal, runCommand, waitForOutput, terminalInput } from "./helpers.js";

test.describe("Terminal — modo degradado (sin backend ni worker)", () => {
  test("download cv.pdf en modo degradado abre el PDF estático y muestra aviso", async ({ page }) => {
    await gotoTerminal(page);

    // Interceptar window.open para no abrir una pestaña real en el test
    await page.evaluate(() => {
      window.open = (url?: string | URL) => {
        (window as unknown as { __openedUrl: string | undefined }).__openedUrl = url?.toString();
        return null;
      };
    });

    await runCommand(page, "download cv.pdf");

    // Con API vacía → "API not configured — opening static PDF…"
    await waitForOutput(page, "static PDF");

    // El terminal sigue funcionando
    await expect(terminalInput(page)).toBeEnabled({ timeout: 3_000 });
  });

  test("repos en modo degradado muestra mensaje de modo degradado", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "repos");

    // Con worker vacío → "repos: worker no disponible (modo degradado)"
    await waitForOutput(page, "modo degradado");

    // El terminal sigue operativo — pwd en home muestra "~"
    await expect(terminalInput(page)).not.toBeDisabled({ timeout: 5_000 });
    await runCommand(page, "pwd");
    await waitForOutput(page, "~");
  });

  test("download con argumento incorrecto muestra error", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "download cv.docx");

    await waitForOutput(page, "solo");
    await expect(terminalInput(page)).toBeEnabled({ timeout: 3_000 });
  });

  test("repos en degradado no corrompe el filesystem virtual", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "repos");
    await waitForOutput(page, "modo degradado");

    // El FS sigue intacto — ls funciona y muestra los archivos del home
    await runCommand(page, "ls");
    // about.md existe en la raíz del home
    await expect(page.getByText("about.md", { exact: false }).first()).toBeVisible({ timeout: 8_000 });
  });
});
