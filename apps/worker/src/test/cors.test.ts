import { describe, it, expect, vi, beforeEach } from "vitest";
import worker from "../index.js";
import { createMockEnv } from "./helpers/mockEnv.js";

describe("CORS", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 200 on OPTIONS preflight from allowed origin", async () => {
    const env = createMockEnv();
    const request = new Request("http://worker/api/github/profile", {
      method: "OPTIONS",
      headers: { "Origin": "https://notpelos.pages.dev" },
    });

    const response = await worker.fetch(request, env);
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://notpelos.pages.dev"
    );
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET");
  });

  it("returns 403 on OPTIONS preflight from unknown origin", async () => {
    const env = createMockEnv();
    const request = new Request("http://worker/api/github/profile", {
      method: "OPTIONS",
      headers: { "Origin": "https://evil.com" },
    });

    const response = await worker.fetch(request, env);
    expect(response.status).toBe(403);
  });

  it("attaches CORS headers on successful GET", async () => {
    const env = createMockEnv();

    // Seed cache so no upstream fetch is needed
    await env.GITHUB_CACHE.put(
      "github:profile:NotPelos",
      JSON.stringify({
        login: "NotPelos",
        name: "Ismael",
        bio: null,
        public_repos: 5,
        followers: 10,
        avatar_url: "https://example.com/avatar.jpg",
        html_url: "https://github.com/NotPelos",
      })
    );

    const request = new Request("http://worker/api/github/profile", {
      method: "GET",
      headers: { "Origin": "https://notpelos.pages.dev" },
    });

    const response = await worker.fetch(request, env);
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://notpelos.pages.dev"
    );
  });

  it("respects ALLOWED_ORIGIN env override", async () => {
    const env = createMockEnv({ ALLOWED_ORIGIN: "http://localhost:4321" });
    const request = new Request("http://worker/api/github/profile", {
      method: "OPTIONS",
      headers: { "Origin": "http://localhost:4321" },
    });

    const response = await worker.fetch(request, env);
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:4321");
  });
});
