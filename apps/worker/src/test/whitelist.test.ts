import { describe, it, expect } from "vitest";
import worker from "../index.js";
import { createMockEnv } from "./helpers/mockEnv.js";

describe("Path whitelist", () => {
  it("returns 404 for unknown path without echoing it", async () => {
    const env = createMockEnv();
    const request = new Request("http://worker/api/github/unknown");
    const response = await worker.fetch(request, env);

    expect(response.status).toBe(404);
    const body = await response.text();
    // Must not echo the path back (info leakage)
    expect(body).not.toContain("unknown");
  });

  it("returns 404 for root path", async () => {
    const env = createMockEnv();
    const request = new Request("http://worker/");
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(404);
  });

  it("returns 404 for /api/github/ with trailing slash", async () => {
    const env = createMockEnv();
    const request = new Request("http://worker/api/github/");
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(404);
  });

  it("returns 405 for POST to a valid path", async () => {
    const env = createMockEnv();
    const request = new Request("http://worker/api/github/profile", { method: "POST" });
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET");
  });

  it("returns 200 for /api/github/profile (valid path)", async () => {
    const env = createMockEnv();
    // Seed cache so no real fetch needed
    await env.GITHUB_CACHE.put(
      "github:profile:NotPelos",
      JSON.stringify({
        login: "NotPelos",
        name: null,
        bio: null,
        public_repos: 0,
        followers: 0,
        avatar_url: "",
        html_url: "",
      })
    );
    const request = new Request("http://worker/api/github/profile");
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(200);
  });

  it("returns 200 for /api/github/repos (valid path)", async () => {
    const env = createMockEnv();
    await env.GITHUB_CACHE.put("github:repos:NotPelos", JSON.stringify([]));
    const request = new Request("http://worker/api/github/repos");
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(200);
  });

  it("returns 200 for /api/visits (read)", async () => {
    const env = createMockEnv();
    const request = new Request("http://worker/api/visits");
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { total: number; today: number };
    expect(body).toEqual({ total: 0, today: 0 });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 200 for /api/visits/hit (increment) with browser Origin", async () => {
    const env = createMockEnv();
    (env as unknown as { VISIT_SALT: string }).VISIT_SALT = "test-salt";
    const request = new Request("http://worker/api/visits/hit", {
      headers: {
        "cf-connecting-ip": "9.9.9.9",
        Origin: "https://notpelos.pages.dev",
      },
    });
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { total: number; today: number };
    expect(body.total).toBe(1);
    expect(body.today).toBe(1);
  });

  it("returns 403 for /api/visits/hit without Origin (blocks curl/scripts)", async () => {
    const env = createMockEnv();
    (env as unknown as { VISIT_SALT: string }).VISIT_SALT = "test-salt";
    const request = new Request("http://worker/api/visits/hit", {
      headers: { "cf-connecting-ip": "8.8.8.8" },
    });
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(403);
    // Verify no side effect: counter still zero.
    const readReq = new Request("http://worker/api/visits");
    const readResp = await worker.fetch(readReq, env);
    const body = (await readResp.json()) as { total: number; today: number };
    expect(body).toEqual({ total: 0, today: 0 });
  });

  it("still allows /api/visits (read) without Origin", async () => {
    const env = createMockEnv();
    const request = new Request("http://worker/api/visits");
    const response = await worker.fetch(request, env);
    expect(response.status).toBe(200);
  });
});
