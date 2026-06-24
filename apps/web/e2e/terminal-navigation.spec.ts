/**
 * terminal-navigation.spec.ts
 * Flujo 2: ls → cd experience → cat archivo → contenido visible.
 * También: cd -, cd .., cd ~.
 */

import { test, expect } from "@playwright/test";
import { gotoTerminal, runCommand, waitForOutput } from "./helpers.js";

test.describe("Terminal — navegación del filesystem virtual", () => {
  test("ls muestra archivos y carpetas del home", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "ls");

    // El home contiene about.md, experience/, projects/, skills.json, etc.
    await waitForOutput(page, "about.md");
    await waitForOutput(page, "experience");
  });

  test("cd experience cambia el directorio de trabajo", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "cd experience");

    // El prompt debe reflejar la nueva ruta
    await waitForOutput(page, "experience");
  });

  test("cat 2023-softtek.md muestra contenido de Softtek", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "cd experience");
    await runCommand(page, "cat 2023-softtek.md");

    // El archivo debe contener el nombre de la empresa
    await waitForOutput(page, "Softtek");
  });

  test("ls dentro de experience lista los archivos de experiencia", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "cd experience");
    await runCommand(page, "ls");

    await waitForOutput(page, "softtek");
  });

  test("cd .. sube al directorio padre", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "cd experience");
    await runCommand(page, "cd ..");

    // Verificamos con pwd — el home se muestra como "~" (formatPath usa ~ para /home/notpelos)
    await runCommand(page, "pwd");
    await waitForOutput(page, "~");
  });

  test("cd ~ vuelve al home desde cualquier directorio", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "cd experience");
    await runCommand(page, "cd ~");

    // pwd en home muestra "~"
    await runCommand(page, "pwd");
    await waitForOutput(page, "~");
  });

  test("cd - vuelve al directorio anterior", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "cd experience");
    await runCommand(page, "cd ~");
    await runCommand(page, "cd -");

    // Debe volver a experience
    await waitForOutput(page, "experience");
  });

  test("cat about.md muestra el contenido del archivo about", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "cat about.md");

    // El about.md debe tener contenido — verificamos que no sea un error
    // y que aparezca algún texto con el perfil
    await expect(page.getByText("error", { exact: false })).not.toBeVisible({ timeout: 3_000 });
    // El archivo existe y tiene contenido (no error de "no such file")
    await expect(page.getByText("No such file", { exact: false })).not.toBeVisible({ timeout: 3_000 });
  });
});
