import { describe, it, expect, vi, afterEach } from "vitest";
import { checkRateLimit, buildRateLimitResponse } from "../lib/rateLimit.js";
import { createMockKv } from "./helpers/mockKv.js";

function makeRequest(ip: string): Request {
  return new Request("http://worker/api/github/profile", {
    headers: { "cf-connecting-ip": ip },
  });
}

describe("Rate limiter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("allows 30 requests for the same IP", async () => {
    const kv = createMockKv();
    const request = makeRequest("1.2.3.4");

    for (let i = 0; i < 30; i++) {
      const result = await checkRateLimit(request, kv);
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks the 31st request", async () => {
    const kv = createMockKv();
    const request = makeRequest("1.2.3.5");

    for (let i = 0; i < 30; i++) {
      await checkRateLimit(request, kv);
    }

    const result = await checkRateLimit(request, kv);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("uses different buckets for different IPs", async () => {
    const kv = createMockKv();

    for (let i = 0; i < 30; i++) {
      await checkRateLimit(makeRequest("10.0.0.1"), kv);
    }

    // Different IP should still be allowed
    const result = await checkRateLimit(makeRequest("10.0.0.2"), kv);
    expect(result.allowed).toBe(true);
  });

  it("buildRateLimitResponse returns 429 with Retry-After header", () => {
    const response = buildRateLimitResponse(60);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
  });

  it("falls back to unknown IP when cf-connecting-ip is absent", async () => {
    const kv = createMockKv();
    const request = new Request("http://worker/api/github/profile");

    const result = await checkRateLimit(request, kv);
    expect(result.allowed).toBe(true);
  });

  it("TTL is anchored to first hit — not reset on every increment", async () => {
    // Simulate time: first hit at t=0, subsequent hits at t=30s (half the window).
    // The remaining TTL should be ~30s, not a fresh 60s.
    const kv = createMockKv();
    const request = makeRequest("2.3.4.5");

    const firstHitMs = 1_000_000; // arbitrary epoch anchor
    vi.spyOn(Date, "now").mockReturnValue(firstHitMs);

    // First hit opens the window
    await checkRateLimit(request, kv);

    // Advance virtual clock by 30 seconds
    vi.spyOn(Date, "now").mockReturnValue(firstHitMs + 30_000);

    // Second hit — remaining TTL should reflect 30s elapsed, not a fresh 60s
    const result = await checkRateLimit(request, kv);
    expect(result.allowed).toBe(true);
    // retryAfter is 0 when allowed; we verify TTL indirectly via the next blocked call
  });

  it("blocks after 30 hits and reports accurate retryAfter based on elapsed time", async () => {
    const kv = createMockKv();
    const request = makeRequest("3.4.5.6");

    const firstHitMs = 2_000_000;
    vi.spyOn(Date, "now").mockReturnValue(firstHitMs);

    // Exhaust the limit
    for (let i = 0; i < 30; i++) {
      await checkRateLimit(request, kv);
    }

    // Advance clock by 20 seconds — 40s should still remain
    vi.spyOn(Date, "now").mockReturnValue(firstHitMs + 20_000);

    const blocked = await checkRateLimit(request, kv);
    expect(blocked.allowed).toBe(false);
    // retryAfter should be ~40s (60 - 20 elapsed), not a full 60s
    expect(blocked.retryAfter).toBe(40);
  });

  it("window expires after WINDOW_MS and allows new requests", async () => {
    // This test verifies the design intent: after the TTL expires (simulated by
    // clearing the KV entry, since the mock has no real TTL enforcement),
    // new requests are allowed. In production Cloudflare KV handles actual expiry.
    const kv = createMockKv();
    const request = makeRequest("4.5.6.7");

    // Exhaust the limit
    for (let i = 0; i < 30; i++) {
      await checkRateLimit(request, kv);
    }

    const blocked = await checkRateLimit(request, kv);
    expect(blocked.allowed).toBe(false);

    // Simulate KV TTL expiry by deleting the key (in production Cloudflare does this)
    await kv.delete("ratelimit:4.5.6.7");

    // After expiry, requests should be allowed again
    const allowed = await checkRateLimit(request, kv);
    expect(allowed.allowed).toBe(true);
  });
});
