import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  reporter: [["html", { open: "never" }], ["list"]],
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // Single worker locally prevents test interference (localStorage isolation per-context
  // is fine but the dev server can be overloaded with parallel requests).
  // CI uses 1 worker too for stability.
  workers: 1,
  timeout: 45_000,
  use: {
    baseURL: "http://localhost:4321",
    trace: "on-first-retry",
    // Force Spanish locale so detectLang() returns "es" consistently across all tests.
    // Tests that explicitly switch to "en" with `lang en` will work regardless.
    locale: "es-ES",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    port: 4321,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
