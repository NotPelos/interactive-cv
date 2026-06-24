/**
 * Rate limiter using Cloudflare KV.
 *
 * Strategy: store a counter per IP with a fixed 60-second window anchored to
 * the FIRST hit. Subsequent increments preserve the original TTL so the window
 * does not slide. This prevents the "permanent block" bug where a continuous
 * stream of requests would reset expirationTtl on every kv.put(), making the
 * window effectively never expire.
 *
 * Metadata field `firstHitMs` records the epoch timestamp of the first request
 * so remaining TTL can be computed on every subsequent increment.
 *
 * TOCTOU note (best-effort, not strictly atomic):
 *   KV is eventually-consistent. N parallel requests arriving simultaneously may
 *   all read current=0, each write current=1, and each start a separate TTL.
 *   In practice this means the limit can be exceeded by ~N concurrent requests
 *   within the same millisecond window. For an MVP showcase proxy this is
 *   acceptable — exact atomicity would require Durable Objects.
 *
 * TODO (Fase 8): migrate to Durable Objects or Cloudflare's native
 *   `rateLimiting` binding for strict per-IP atomicity.
 */

import type { Env } from "./cors.js";

const RATE_LIMIT = 30; // requests per minute per IP
const WINDOW_MS = 60_000; // 60 seconds in milliseconds

/** Metadata stored alongside the KV counter value. */
type RateLimitMeta = { firstHitMs: number };

/**
 * Returns the client IP from Cloudflare's canonical header.
 * Falls back to a generic key if the header is absent (local dev).
 */
export function getClientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? "unknown";
}

function rateLimitKey(ip: string): string {
  // No PII logged — IPs are hashed only in usage; KV key itself stays opaque
  return `ratelimit:${ip}`;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
}

/**
 * Checks and increments the rate limit counter for an IP.
 *
 * On the first request in a window: creates the KV entry with a 60s TTL and
 * records `firstHitMs` in metadata so subsequent calls can compute the
 * remaining TTL without resetting the window.
 *
 * On subsequent requests: reads `firstHitMs` from metadata, computes the
 * elapsed time, and writes back with `remainingTtl = WINDOW_MS - elapsed`.
 * This keeps the expiry anchored to the first hit instead of sliding.
 */
export async function checkRateLimit(
  request: Request,
  kv: KVNamespace
): Promise<RateLimitResult> {
  const ip = getClientIp(request);
  const key = rateLimitKey(ip);

  const { value, metadata } = await kv.getWithMetadata<string, RateLimitMeta>(key);
  const current = value !== null ? parseInt(value, 10) : 0;

  if (current >= RATE_LIMIT) {
    // Compute how much of the window remains so Retry-After is accurate.
    const firstHitMs = metadata?.firstHitMs ?? Date.now();
    const elapsedMs = Date.now() - firstHitMs;
    const retryAfter = Math.max(1, Math.ceil((WINDOW_MS - elapsedMs) / 1000));
    return { allowed: false, remaining: 0, retryAfter };
  }

  // Anchor the window to the first hit timestamp.
  const firstHitMs = metadata?.firstHitMs ?? Date.now();
  const elapsedMs = Date.now() - firstHitMs;
  // remainingTtl must be >= 1s (KV minimum). If elapsed somehow exceeds the
  // window (clock skew / race), cap at 1s so the entry expires quickly.
  const remainingTtl = Math.max(1, Math.ceil((WINDOW_MS - elapsedMs) / 1000));

  await kv.put(key, String(current + 1), {
    expirationTtl: remainingTtl,
    metadata: { firstHitMs } satisfies RateLimitMeta,
  });

  return { allowed: true, remaining: RATE_LIMIT - (current + 1), retryAfter: 0 };
}

export function buildRateLimitResponse(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: "Too Many Requests", retryAfterSeconds: retryAfter }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    }
  );
}
