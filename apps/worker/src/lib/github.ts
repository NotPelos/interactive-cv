/**
 * Thin GitHub API fetch wrapper.
 *
 * If GITHUB_TOKEN is set in env, it is sent as `Authorization: token <PAT>`
 * which raises GitHub's rate limit from 60 req/h (anonymous) to 5000 req/h.
 * The token must be stored as a Cloudflare Worker secret — never in code.
 */

import type { Env } from "./cors.js";

const GITHUB_API = "https://api.github.com";
const USER_AGENT = "notpelos-cv-worker/1.0";

export async function fetchFromGitHub(path: string, env: Env): Promise<Response> {
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Optional PAT — raises upstream rate limit to 5000 req/h
  if (env.GITHUB_TOKEN) {
    headers["Authorization"] = `token ${env.GITHUB_TOKEN}`;
  }

  return fetch(`${GITHUB_API}${path}`, { headers });
}
