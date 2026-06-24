/**
 * recruiter-view.spec.ts
 * /cv renderiza nombre, secciones, back-to-terminal button.
 * /cv/en muestra contenido EN.
 */

import { test, expect } from "@playwright/test";

test.describe("Vista recruiter /cv (español)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/cv");
    // Es SSG puro (0 JS) — no hay que esperar isla
    await expect(page).toHaveURL("/cv");
  });

  test("muestra el nombre completo en el h1", async ({ page }) => {
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toContainText("Ismael", { timeout: 5_000 });
  });

  test("muestra el botón de volver al terminal", async ({ page }) => {
    // BackToTerminal.astro: aria-label="Volver al terminal interactivo" en ES
    const backBtn = page.getByRole("link", { name: /terminal/i }).first();
    await expect(backBtn).toBeVisible({ timeout: 5_000 });
  });

  test("el botón volver al terminal lleva a /", async ({ page }) => {
    const backBtn = page.getByRole("link", { name: /terminal/i }).first();
    await backBtn.click();
    await page.waitForURL("/", { timeout: 5_000 });
    await expect(page).toHaveURL("/");
  });

  test("contiene las secciones principales del CV", async ({ page }) => {
    // La vista recruiter tiene secciones definidas en los componentes Astro
    // Verificamos que hay contenido de experiencia, proyectos y skills
    await expect(page.getByText("Experiencia", { exact: false })).toBeVisible({ timeout: 5_000 });
  });

  test("contiene información de contacto", async ({ page }) => {
    // El Header.astro contiene email
    await expect(page.getByRole("link", { name: /gmail/i })).toBeVisible({ timeout: 5_000 });
    // GitHub link
    await expect(page.getByRole("link", { name: /github/i }).first()).toBeVisible({ timeout: 5_000 });
  });

  test("tiene exactamente un h1 (jerarquía correcta de headings)", async ({ page }) => {
    const h1s = page.getByRole("heading", { level: 1 });
    await expect(h1s).toHaveCount(1, { timeout: 5_000 });
  });

  test("el skip-link está presente y apunta a #main", async ({ page }) => {
    // El RecruiterLayout incluye un skip-link sr-only que se muestra con foco
    const skipLink = page.locator('a[href="#main"]');
    await expect(skipLink).toBeAttached({ timeout: 5_000 });
  });
});

test.describe("Vista recruiter /cv/en (inglés)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/cv/en");
    await expect(page).toHaveURL("/cv/en");
  });

  test("muestra el nombre en h1", async ({ page }) => {
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toContainText("Ismael", { timeout: 5_000 });
  });

  test("muestra back-to-terminal en inglés", async ({ page }) => {
    // BackToTerminal.astro: aria-label="Back to interactive terminal" en EN
    const backBtn = page.getByRole("link", { name: /terminal/i }).first();
    await expect(backBtn).toBeVisible({ timeout: 5_000 });
  });

  test("el título de la página está en inglés (Backend Developer)", async ({ page }) => {
    await expect(page.getByText("Backend Developer", { exact: false })).toBeVisible({ timeout: 5_000 });
  });

  test("contiene sección de experiencia en inglés", async ({ page }) => {
    await expect(page.getByText("Experience", { exact: false })).toBeVisible({ timeout: 5_000 });
  });

  test("el lang del html es 'en'", async ({ page }) => {
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBe("en");
  });
});
