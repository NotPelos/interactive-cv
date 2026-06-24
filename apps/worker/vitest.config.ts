import { defineConfig } from "vitest/config";

/**
 * Vitest config for Cloudflare Worker tests.
 *
 * We use the standard jsdom/node environment here (not @cloudflare/vitest-pool-workers)
 * because the pool-workers setup requires a deployed Worker or matching wrangler config
 * with real KV namespace IDs. For unit tests we mock the KV and fetch at the module level,
 * which works fine with the standard Vitest runner.
 *
 * Integration tests against the real Worker runtime would use pool-workers —
 * that's a follow-up task once the Worker is deployed.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/test/**"],
    },
  },
});
