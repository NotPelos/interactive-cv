/**
 * Handler: GET /api/github/repos
 *
 * Proxies GitHub's /users/NotPelos/repos?per_page=100&sort=updated,
 * caches 1h in KV, returns top 30 repos with minimal fields.
 */

import type { Env } from "../lib/cors.js";
import { getFromCache, putInCache } from "../lib/cache.js";
import { fetchFromGitHub } from "../lib/github.js";
import { UpstreamError } from "./profile.js";

const CACHE_KEY = "github:repos:NotPelos";
const MAX_REPOS = 30;

export interface GitHubRepoSubset {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  topics: string[];
}

function extractRepo(raw: Record<string, unknown>): GitHubRepoSubset {
  const topics = Array.isArray(raw["topics"])
    ? (raw["topics"] as unknown[]).filter((t): t is string => typeof t === "string")
    : [];

  return {
    name: String(raw["name"] ?? ""),
    description: raw["description"] != null ? String(raw["description"]) : null,
    html_url: String(raw["html_url"] ?? ""),
    language: raw["language"] != null ? String(raw["language"]) : null,
    stargazers_count: Number(raw["stargazers_count"] ?? 0),
    forks_count: Number(raw["forks_count"] ?? 0),
    updated_at: String(raw["updated_at"] ?? ""),
    topics,
  };
}

export async function handleRepos(
  _request: Request,
  env: Env
): Promise<{ data: GitHubRepoSubset[]; cacheHit: boolean }> {
  // 1. Check KV cache
  const cached = await getFromCache<GitHubRepoSubset[]>(env.GITHUB_CACHE, CACHE_KEY);
  if (cached.hit && cached.data !== null) {
    return { data: cached.data, cacheHit: true };
  }

  // 2. Fetch from GitHub — sorted by update date, up to 100 results
  const upstream = await fetchFromGitHub(
    "/users/NotPelos/repos?per_page=100&sort=updated",
    env
  );
  if (!upstream.ok) {
    throw new UpstreamError(upstream.status);
  }

  const raw = (await upstream.json()) as Record<string, unknown>[];
  // Top 30 by updated_at (already sorted by GitHub)
  const data = raw.slice(0, MAX_REPOS).map(extractRepo);

  // 3. Store in cache
  await putInCache(env.GITHUB_CACHE, CACHE_KEY, data);

  return { data, cacheHit: false };
}
