/**
 * Cloudflare Worker — API for NotPelos interactive CV.
 *
 * Routes (whitelist — anything else is 404):
 *   GET /api/github/profile  → proxies /users/NotPelos, 1h KV cache
 *   GET /api/github/repos    → proxies /users/NotPelos/repos, 1h KV cache, top 30
 *   GET /api/visits          → read visit counters { total, today }
 *   GET /api/visits/hit      → increment (once per IP+day), return counters
 *
 * Security:
 *   - Strict path whitelist (no echo of unknown paths)
 *   - Methods: GET only (OPTIONS for preflight)
 *   - CORS: ALLOWED_ORIGIN env var (defaults to https://notpelos.pages.dev)
 *   - Rate limit: 30 req/min per IP via KV counters
 */

import type { Env } from "./lib/cors.js";
import {
  getAllowedOrigin,
  handlePreflight,
  isOriginAllowed,
  withCors,
} from "./lib/cors.js";
import { checkRateLimit, buildRateLimitResponse } from "./lib/rateLimit.js";
import { handleProfile, UpstreamError } from "./handlers/profile.js";
import { handleRepos } from "./handlers/repos.js";
import { handleVisitsRead, handleVisitsHit } from "./handlers/visits.js";

// Allowed paths — strict whitelist. New paths require a code change.
const ALLOWED_PATHS = new Set([
  "/api/github/profile",
  "/api/github/repos",
  "/api/visits",
  "/api/visits/hit",
]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const origin = request.headers.get("Origin");
    const allowedOrigin = getAllowedOrigin(env);

    // --- Preflight ---
    if (method === "OPTIONS") {
      return handlePreflight(request, env);
    }

    // --- Method guard ---
    // Wrapped with withCors so Vary: Origin is present on 405 responses,
    // preventing intermediate caches from serving a cached 405 to other origins.
    if (method !== "GET") {
      return withCors(
        new Response("Method Not Allowed", {
          status: 405,
          headers: { "Allow": "GET", "Content-Type": "text/plain; charset=utf-8" },
        }),
        env
      );
    }

    // --- Whitelist guard (no path echo to avoid info leakage) ---
    if (!ALLOWED_PATHS.has(path)) {
      return new Response("Not Found", {
        status: 404,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // --- CORS origin check (only after path is confirmed valid) ---
    if (origin !== null && !isOriginAllowed(origin, allowedOrigin)) {
      return new Response("Forbidden", { status: 403 });
    }

    // --- Stricter check for /api/visits/hit: require Origin header ---
    // The visits/hit endpoint mutates KV, so we refuse requests with no Origin
    // (curl, scripts, servers). The browser always attaches Origin to fetch()
    // calls, so legitimate frontend traffic is unaffected. This prevents
    // trivial counter inflation by IP-rotating scripts.
    if (path === "/api/visits/hit" && origin === null) {
      return withCors(new Response("Forbidden", { status: 403 }), env);
    }

    // --- Rate limit ---
    // Wrapped defensively: if checkRateLimit throws (e.g. KV write rejected),
    // we fail open — better to serve a legit request than 1101 the whole worker.
    // The dispatch below still runs under its own try/catch.
    let rl: { allowed: boolean; retryAfter: number };
    try {
      rl = await checkRateLimit(request, env.GITHUB_CACHE);
    } catch (err) {
      console.log(
        JSON.stringify({ path, event: "rateLimit_error", msg: (err as Error).message })
      );
      rl = { allowed: true, retryAfter: 0 };
    }
    if (!rl.allowed) {
      const resp = buildRateLimitResponse(rl.retryAfter);
      return withCors(resp, env);
    }

    // --- Dispatch ---
    try {
      // Visit counter endpoints — no upstream, KV-only. No cache header.
      if (path === "/api/visits" || path === "/api/visits/hit") {
        const data =
          path === "/api/visits/hit"
            ? await handleVisitsHit(request, env)
            : await handleVisitsRead(env);
        console.log(JSON.stringify({ path, status: 200 }));
        return withCors(
          new Response(JSON.stringify(data), {
            status: 200,
            headers: {
              "Content-Type": "application/json; charset=utf-8",
              // Never cache — the counter must reflect current state each read.
              "Cache-Control": "no-store",
            },
          }),
          env
        );
      }

      let data: unknown;
      let cacheHit: boolean;

      if (path === "/api/github/profile") {
        ({ data, cacheHit } = await handleProfile(request, env));
      } else {
        // path === "/api/github/repos"
        ({ data, cacheHit } = await handleRepos(request, env));
      }

      // Log without PII: path + status + cache status
      console.log(JSON.stringify({ path, status: 200, cache: cacheHit ? "HIT" : "MISS" }));

      const response = new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "X-Cache": cacheHit ? "HIT" : "MISS",
        },
      });
      return withCors(response, env);
    } catch (err) {
      if (err instanceof UpstreamError) {
        console.log(JSON.stringify({ path, status: 502, upstreamStatus: err.status }));
        return withCors(
          new Response(JSON.stringify({ error: "Bad Gateway" }), {
            status: 502,
            headers: { "Content-Type": "application/json; charset=utf-8" },
          }),
          env
        );
      }
      console.log(JSON.stringify({ path, status: 500, error: "internal" }));
      return withCors(
        new Response(JSON.stringify({ error: "Internal Server Error" }), {
          status: 500,
          headers: { "Content-Type": "application/json; charset=utf-8" },
        }),
        env
      );
    }
  },
} satisfies ExportedHandler<Env>;
