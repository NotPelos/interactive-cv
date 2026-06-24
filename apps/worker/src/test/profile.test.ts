import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleProfile } from "../handlers/profile.js";
import { createMockEnv } from "./helpers/mockEnv.js";

const MOCK_GITHUB_PROFILE = {
  login: "NotPelos",
  name: "Ismael Sánchez",
  bio: "Backend dev",
  public_repos: 12,
  followers: 5,
  following: 3,
  avatar_url: "https://avatars.githubusercontent.com/u/99999?v=4",
  html_url: "https://github.com/NotPelos",
  // Extra field that should be stripped
  node_id: "should-be-stripped",
};

describe("Profile handler", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns cached data on cache hit without fetching GitHub", async () => {
    const env = createMockEnv();
    const cached = {
      login: "NotPelos",
      name: "Cached Name",
      bio: null,
      public_repos: 0,
      followers: 0,
      avatar_url: "",
      html_url: "",
    };
    await env.GITHUB_CACHE.put("github:profile:NotPelos", JSON.stringify(cached));

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await handleProfile(new Request("http://worker/"), env);

    expect(result.cacheHit).toBe(true);
    expect(result.data.login).toBe("NotPelos");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches from GitHub on cache miss and caches result", async () => {
    const env = createMockEnv();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_GITHUB_PROFILE), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    const result = await handleProfile(new Request("http://worker/"), env);

    expect(result.cacheHit).toBe(false);
    expect(result.data.login).toBe("NotPelos");
    expect(result.data.name).toBe("Ismael Sánchez");
    expect(result.data.bio).toBe("Backend dev");
    expect(result.data.public_repos).toBe(12);
    expect(result.data.followers).toBe(5);

    // Stripped fields should not be present
    expect(Object.keys(result.data)).not.toContain("node_id");
    expect(Object.keys(result.data)).not.toContain("following");
  });

  it("strips unknown fields from the response subset", async () => {
    const env = createMockEnv();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_GITHUB_PROFILE), { status: 200 })
    );

    const result = await handleProfile(new Request("http://worker/"), env);

    const keys = Object.keys(result.data);
    expect(keys.sort()).toEqual(
      ["login", "name", "bio", "public_repos", "followers", "avatar_url", "html_url"].sort()
    );
  });

  it("throws UpstreamError when GitHub returns 4xx", async () => {
    const env = createMockEnv();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Not Found", { status: 404 })
    );

    await expect(handleProfile(new Request("http://worker/"), env)).rejects.toThrow();
  });

  it("caches the result so the next call is a hit", async () => {
    const env = createMockEnv();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(MOCK_GITHUB_PROFILE), { status: 200 })
    );

    const first = await handleProfile(new Request("http://worker/"), env);
    expect(first.cacheHit).toBe(false);

    // Second call should hit cache (no more fetch calls needed).
    // mockClear resets the call count on the existing spy without removing it,
    // so we can assert that the second handleProfile call does not invoke fetch.
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    fetchSpy.mockClear();
    const second = await handleProfile(new Request("http://worker/"), env);
    expect(second.cacheHit).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
