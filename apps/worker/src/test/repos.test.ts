import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleRepos } from "../handlers/repos.js";
import { createMockEnv } from "./helpers/mockEnv.js";

function makeGitHubRepo(n: number): Record<string, unknown> {
  return {
    id: n,
    node_id: `node_${n}`,
    name: `repo-${n}`,
    full_name: `NotPelos/repo-${n}`,
    description: `Description ${n}`,
    html_url: `https://github.com/NotPelos/repo-${n}`,
    language: "Java",
    stargazers_count: n,
    forks_count: 0,
    updated_at: `2024-0${Math.min(n, 9)}-01T00:00:00Z`,
    topics: ["java", "spring-boot"],
    // Fields that should be stripped
    private: false,
    owner: { login: "NotPelos" },
    default_branch: "main",
  };
}

describe("Repos handler", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns cached repos on cache hit", async () => {
    const env = createMockEnv();
    const cached = [makeGitHubRepo(1)].map((r) => ({
      name: r["name"],
      description: r["description"],
      html_url: r["html_url"],
      language: r["language"],
      stargazers_count: r["stargazers_count"],
      forks_count: r["forks_count"],
      updated_at: r["updated_at"],
      topics: r["topics"],
    }));

    await env.GITHUB_CACHE.put("github:repos:NotPelos", JSON.stringify(cached));

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await handleRepos(new Request("http://worker/"), env);

    expect(result.cacheHit).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches from GitHub and returns top 30 repos on cache miss", async () => {
    const env = createMockEnv();

    // GitHub returns 50 repos — we must truncate to 30
    const githubRepos = Array.from({ length: 50 }, (_, i) => makeGitHubRepo(i + 1));
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(githubRepos), { status: 200 })
    );

    const result = await handleRepos(new Request("http://worker/"), env);

    expect(result.cacheHit).toBe(false);
    expect(result.data).toHaveLength(30);
  });

  it("strips unknown fields from each repo", async () => {
    const env = createMockEnv();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([makeGitHubRepo(1)]), { status: 200 })
    );

    const result = await handleRepos(new Request("http://worker/"), env);
    const repo = result.data[0];

    expect(repo).toBeDefined();
    if (!repo) return;

    const keys = Object.keys(repo);
    expect(keys.sort()).toEqual(
      [
        "name",
        "description",
        "html_url",
        "language",
        "stargazers_count",
        "forks_count",
        "updated_at",
        "topics",
      ].sort()
    );
    expect(keys).not.toContain("id");
    expect(keys).not.toContain("owner");
    expect(keys).not.toContain("private");
  });

  it("handles repos with null language and description", async () => {
    const env = createMockEnv();
    const repo = { ...makeGitHubRepo(1), language: null, description: null };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify([repo]), { status: 200 })
    );

    const result = await handleRepos(new Request("http://worker/"), env);
    expect(result.data[0]?.language).toBeNull();
    expect(result.data[0]?.description).toBeNull();
  });

  it("throws UpstreamError on GitHub 5xx", async () => {
    const env = createMockEnv();

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Internal Server Error", { status: 500 })
    );

    await expect(handleRepos(new Request("http://worker/"), env)).rejects.toThrow();
  });
});
