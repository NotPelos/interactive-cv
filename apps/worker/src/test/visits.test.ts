import { describe, it, expect, beforeEach } from "vitest";
import { handleVisitsRead, handleVisitsHit } from "../handlers/visits.js";
import { createMockKv } from "./helpers/mockKv.js";
import type { Env } from "../lib/cors.js";

function makeEnv(kv: KVNamespace, salt: string | undefined): Env {
  return {
    GITHUB_CACHE: kv,
    ...(salt !== undefined ? { VISIT_SALT: salt } : {}),
  } as Env;
}

function makeReq(ip: string): Request {
  return new Request("http://worker/api/visits/hit", {
    headers: { "cf-connecting-ip": ip },
  });
}

describe("Visits handler", () => {
  let kv: KVNamespace;

  beforeEach(() => {
    kv = createMockKv();
  });

  it("read returns zeros on empty KV", async () => {
    const env = makeEnv(kv, "salt");
    const result = await handleVisitsRead(env);
    expect(result).toEqual({ total: 0, today: 0 });
  });

  it("hit increments total and today on first visit", async () => {
    const env = makeEnv(kv, "salt");
    const result = await handleVisitsHit(makeReq("1.2.3.4"), env);
    expect(result.total).toBe(1);
    expect(result.today).toBe(1);
  });

  it("hit is idempotent for the same IP+day", async () => {
    const env = makeEnv(kv, "salt");
    await handleVisitsHit(makeReq("1.2.3.4"), env);
    await handleVisitsHit(makeReq("1.2.3.4"), env);
    const result = await handleVisitsHit(makeReq("1.2.3.4"), env);
    expect(result.total).toBe(1);
    expect(result.today).toBe(1);
  });

  it("different IPs increment independently", async () => {
    const env = makeEnv(kv, "salt");
    await handleVisitsHit(makeReq("1.1.1.1"), env);
    const result = await handleVisitsHit(makeReq("2.2.2.2"), env);
    expect(result.total).toBe(2);
    expect(result.today).toBe(2);
  });

  it("missing salt → hit degrades to read-only (no increment)", async () => {
    const env = makeEnv(kv, undefined);
    const result = await handleVisitsHit(makeReq("1.2.3.4"), env);
    expect(result).toEqual({ total: 0, today: 0 });

    // A subsequent read confirms nothing was written.
    const read = await handleVisitsRead(env);
    expect(read).toEqual({ total: 0, today: 0 });
  });

  it("read reflects previous hits without mutating them", async () => {
    const env = makeEnv(kv, "salt");
    await handleVisitsHit(makeReq("1.2.3.4"), env);
    await handleVisitsHit(makeReq("5.6.7.8"), env);

    const r1 = await handleVisitsRead(env);
    const r2 = await handleVisitsRead(env);
    expect(r1).toEqual({ total: 2, today: 2 });
    expect(r2).toEqual({ total: 2, today: 2 });
  });

  it("same IP with different salts produces different dedupe keys", async () => {
    // Rotating the salt would invalidate seen entries — new counts.
    const env1 = makeEnv(kv, "salt-a");
    await handleVisitsHit(makeReq("1.2.3.4"), env1);
    const env2 = makeEnv(kv, "salt-b");
    const result = await handleVisitsHit(makeReq("1.2.3.4"), env2);
    // Second call now sees a fresh seen key → increments again.
    expect(result.total).toBe(2);
    expect(result.today).toBe(2);
  });

  it("malformed KV value falls back to zero without crashing", async () => {
    await kv.put("visits:total", "not-a-number");
    const env = makeEnv(kv, "salt");
    const result = await handleVisitsHit(makeReq("1.2.3.4"), env);
    // The bad value is parsed as 0, then incremented to 1.
    expect(result.total).toBe(1);
    expect(result.today).toBe(1);
  });

  it("write-budget cap: once reached, /hit degrades to read-only", async () => {
    // Determine today's key using the same logic as the handler (UTC).
    const now = new Date();
    const day = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;

    // Simulate a filled write budget.
    await kv.put(`visits:writes:${day}`, "500");
    // Pre-seed some counts so we can verify they don't change.
    await kv.put("visits:total", "7");
    await kv.put(`visits:day:${day}`, "3");

    const env = makeEnv(kv, "salt");
    const result = await handleVisitsHit(makeReq("9.9.9.9"), env);

    expect(result.total).toBe(7);
    expect(result.today).toBe(3);
    // Confirm the seen flag was NOT written either — nothing new happened.
    const read = await handleVisitsRead(env);
    expect(read).toEqual({ total: 7, today: 3 });
  });

  it("write-budget counter increments with real hits", async () => {
    const env = makeEnv(kv, "salt");
    await handleVisitsHit(makeReq("1.1.1.1"), env);
    await handleVisitsHit(makeReq("2.2.2.2"), env);

    const now = new Date();
    const day = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
    const writes = await kv.get(`visits:writes:${day}`, "text");
    // Two hits × 4 writes each = 8.
    expect(writes).toBe("8");
  });
});
