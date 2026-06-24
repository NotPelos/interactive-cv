/**
 * terminal-recruiter-navigation.spec.ts
 * Flujo 4: comando recruiter navega a /cv. Botón 👔 también.
 */

import { test, expect } from "@playwright/test";
import { gotoTerminal, runCommand, waitForOutput } from "./helpers.js";

test.describe("Terminal — navegación a vista recruiter", () => {
  test("comando recruiter navega a /cv", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "recruiter");

    // El comando muestra el mensaje de transición y luego navega
    await waitForOutput(page, "abriendo vista recruiter");

    // La navegación ocurre tras un delay de 400ms (Timer en pendingNavigation effect)
    await page.waitForURL("/cv", { timeout: 5_000 });
    await expect(page).toHaveURL("/cv");
  });

  test("el botón 👔 recruiter en el header navega a /cv", async ({ page }) => {
    await gotoTerminal(page);

    // El botón está en el header con href="/cv"
    const recruiterLink = page.getByRole("link", { name: /recruiter/i });
    await expect(recruiterLink).toBeVisible({ timeout: 5_000 });
    await recruiterLink.click();

    await page.waitForURL("/cv", { timeout: 5_000 });
    await expect(page).toHaveURL("/cv");
  });

  test("recruiter en inglés navega a /cv/en", async ({ page }) => {
    await gotoTerminal(page);
    await runCommand(page, "lang en");
    await waitForOutput(page, "English");

    await runCommand(page, "recruiter");
    await waitForOutput(page, "recruiter view");

    await page.waitForURL("/cv/en", { timeout: 5_000 });
    await expect(page).toHaveURL("/cv/en");
  });
});
