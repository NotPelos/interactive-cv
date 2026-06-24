/**
 * Handler: GET /api/github/profile
 *
 * Proxies GitHub's /users/NotPelos endpoint, caches 1h in KV,
 * and returns only the fields the frontend needs.
 */

import type { Env } from "../lib/cors.js";
import { getFromCache, putInCache } from "../lib/cache.js";
import { fetchFromGitHub } from "../lib/github.js";

const CACHE_KEY = "github:profile:NotPelos";

export interface GitHubProfileSubset {
  login: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  avatar_url: string;
  html_url: string;
}

/** Fields we expose from the full GitHub profile payload. */
function extractFields(raw: Record<string, unknown>): GitHubProfileSubset {
  return {
    login: String(raw["login"] ?? ""),
    name: raw["name"] != null ? String(raw["name"]) : null,
    bio: raw["bio"] != null ? String(raw["bio"]) : null,
    public_repos: Number(raw["public_repos"] ?? 0),
    followers: Number(raw["followers"] ?? 0),
    avatar_url: String(raw["avatar_url"] ?? ""),
    html_url: String(raw["html_url"] ?? ""),
  };
}

export async function handleProfile(
  _request: Request,
  env: Env
): Promise<{ data: GitHubProfileSubset; cacheHit: boolean }> {
  // 1. Check KV cache
  const cached = await getFromCache<GitHubProfileSubset>(env.GITHUB_CACHE, CACHE_KEY);
  if (cached.hit && cached.data !== null) {
    return { data: cached.data, cacheHit: true };
  }

  // 2. Fetch from GitHub
  const upstream = await fetchFromGitHub("/users/NotPelos", env);
  if (!upstream.ok) {
    throw new UpstreamError(upstream.status);
  }

  const raw = (await upstream.json()) as Record<string, unknown>;
  const data = extractFields(raw);

  // 3. Store in cache
  await putInCache(env.GITHUB_CACHE, CACHE_KEY, data);

  return { data, cacheHit: false };
}

export class UpstreamError extends Error {
  constructor(public readonly status: number) {
    super(`GitHub upstream error: ${status}`);
  }
}
