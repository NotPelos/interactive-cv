/**
 * CORS helper for the GitHub proxy Worker.
 *
 * Production origin is hardcoded; ALLOWED_ORIGIN env var overrides it
 * so `wrangler dev` can point to http://localhost:4321 without touching
 * production constants.
 */

export const PRODUCTION_ORIGIN = "https://notpelos.pages.dev";

export interface Env {
  GITHUB_CACHE: KVNamespace;
  /** Optional: override allowed origin (used in local dev). */
  ALLOWED_ORIGIN?: string;
  /** Optional: GitHub PAT to raise upstream rate limit to 5000/h. */
  GITHUB_TOKEN?: string;
  /** Optional: salt used to hash visitor IPs for per-day dedupe. Missing → visits endpoint stays read-only. */
  VISIT_SALT?: string;
}

export function getAllowedOrigin(env: Env): string {
  return env.ALLOWED_ORIGIN ?? PRODUCTION_ORIGIN;
}

export function isOriginAllowed(origin: string | null, allowedOrigin: string): boolean {
  return origin === allowedOrigin;
}

/** Headers common to every response — includes CORS + security basics. */
export function buildCorsHeaders(allowedOrigin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET",
    // Explicit header allowlist — principle of minimum privilege.
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    // Vary: Origin must be present on ALL responses (including 403/405) so
    // intermediate caches do not serve a cached 403 to a legitimate origin.
    "Vary": "Origin",
    // Defensive security headers — mirrors the Spring Boot side
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  };
}

/**
 * Handles CORS preflight (OPTIONS).
 * Returns 200 if origin is allowed, 403 otherwise.
 *
 * Vary: Origin is included on the 403 response to prevent intermediate caches
 * from incorrectly serving a cached 403 to a legitimate origin.
 */
export function handlePreflight(request: Request, env: Env): Response {
  const origin = request.headers.get("Origin");
  const allowedOrigin = getAllowedOrigin(env);

  if (!isOriginAllowed(origin, allowedOrigin)) {
    return new Response("Forbidden", {
      status: 403,
      headers: { "Vary": "Origin" },
    });
  }

  return new Response(null, {
    status: 200,
    headers: buildCorsHeaders(allowedOrigin),
  });
}

/** Attaches CORS headers to an existing Response. */
export function withCors(response: Response, env: Env): Response {
  const origin = getAllowedOrigin(env);
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(buildCorsHeaders(origin))) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
