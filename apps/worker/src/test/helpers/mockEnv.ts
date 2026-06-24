import type { Env } from "../../lib/cors.js";
import { createMockKv } from "./mockKv.js";

export function createMockEnv(overrides: Partial<Env> = {}): Env {
  return {
    GITHUB_CACHE: createMockKv(),
    ALLOWED_ORIGIN: "https://notpelos.pages.dev",
    ...overrides,
  };
}
