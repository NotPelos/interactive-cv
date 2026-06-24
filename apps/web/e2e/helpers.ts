/**
 * Shared helpers for Playwright e2e tests.
 * All selectors use ARIA roles or aria-label attributes — no brittle CSS class selectors.
 */

import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * The hidden input that receives keyboard events in the terminal.
 * Uses the aria-label attribute directly via CSS attribute selector.
 * Note: getByLabel() in Playwright resolves <label> element associations;
 * for aria-label on a plain input we use the attribute selector.
 */
export function terminalInput(page: Page): Locator {
  return page.locator('input[aria-label="Terminal input"]');
}

/**
 * Type a command into the terminal and press Enter.
 * Fills the hidden input and dispatches Enter.
 */
export async function runCommand(page: Page, command: string): Promise<void> {
  const input = terminalInput(page);
  await input.fill(command);
  await input.press("Enter");
}

/**
 * Wait until the terminal output area contains the given text.
 * Uses `.first()` to avoid strict-mode violations when text appears multiple times.
 */
export async function waitForOutput(page: Page, text: string, timeout = 8_000): Promise<void> {
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible({ timeout });
}

/**
 * Navigate to the home page and wait for the terminal island to hydrate.
 * client:load means the island renders on the client — we wait for the input to appear in DOM.
 */
export async function gotoTerminal(page: Page): Promise<void> {
  await page.goto("/");
  // Wait for the Preact island to hydrate: the hidden input appears in the DOM
  await expect(terminalInput(page)).toBeAttached({ timeout: 15_000 });
  // Also wait for it to be enabled (not disabled during navigation)
  await expect(terminalInput(page)).not.toBeDisabled({ timeout: 10_000 });
}
