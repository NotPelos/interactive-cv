/**
 * Visits handler — best-effort visit counter backed by Cloudflare KV.
 *
 * Endpoints:
 *   GET /api/visits      → returns { total, today } (read-only, no increment)
 *   GET /api/visits/hit  → increments once per IP+day, returns { total, today }
 *
 * KV keys:
 *   visits:total                counter (all-time)
 *   visits:day:YYYY-MM-DD       counter (today, UTC)
 *   visits:seen:<hash>          dedupe flag (TTL 48h). Hash already embeds day.
 *   visits:writes:YYYY-MM-DD    write-budget counter for KV protection (TTL 48h)
 *
 * Dedupe: SHA-256(salt || ip || YYYY-MM-DD) — salt in VISIT_SALT secret.
 *
 * Write-budget cap: Cloudflare free-tier KV allows 1000 writes/day globally.
 * Since GITHUB_CACHE hosts the rate limiter and GitHub cache too, an IP-rotating
 * attacker could exhaust the budget and break other endpoints. Once WRITE_CAP
 * is reached in a UTC day, /hit degrades to read-only until midnight.
 *
 * Concurrency: KV is eventually-consistent. Two simultaneous first-hits from
 * the same IP could both increment. Acceptable trade-off for MVP; migrate to
 * Durable Objects if traffic ever justifies it.
 */

import type { Env } from "../lib/cors.js";

const KEY_TOTAL = "visits:total";
const DAY_PREFIX = "visits:day:";
const SEEN_PREFIX = "visits:seen:";
const WRITES_PREFIX = "visits:writes:";
// 48h keeps the seen flag alive if the visitor returns just after UTC midnight
// (they'd count as a first hit again on the new day, but the extra 24h prevents
// double-counting from clock skew on either side of the boundary).
const SEEN_TTL_SECONDS = 60 * 60 * 48;
// Leaves headroom for rate-limit (~30/min per IP) and GitHub cache (~2 writes/h)
// under Cloudflare KV's 1000 writes/day free-tier ceiling.
const WRITE_CAP_PER_DAY = 500;

export interface VisitsResponse {
  total: number;
  today: number;
}

function todayUtc(): string {
  // YYYY-MM-DD in UTC. Workers run in UTC; this is deterministic.
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const arr = Array.from(new Uint8Array(digest));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function readCounts(kv: KVNamespace, day: string): Promise<VisitsResponse> {
  const [totalRaw, todayRaw] = await Promise.all([
    kv.get(KEY_TOTAL, "text"),
    kv.get(DAY_PREFIX + day, "text"),
  ]);
  const parse = (v: string | null): number => {
    if (v === null) return 0;
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  return { total: parse(totalRaw), today: parse(todayRaw) };
}

export async function handleVisitsRead(env: Env): Promise<VisitsResponse> {
  return readCounts(env.GITHUB_CACHE, todayUtc());
}

export async function handleVisitsHit(
  request: Request,
  env: Env
): Promise<VisitsResponse> {
  const kv = env.GITHUB_CACHE;
  const day = todayUtc();

  // Missing salt → operate in read-only mode (fail closed on increment).
  const salt = env.VISIT_SALT;
  if (!salt) {
    return readCounts(kv, day);
  }

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  // seenHash already embeds the day; no need to append it to the KV key.
  const seenHash = await sha256Hex(`${salt}|${ip}|${day}`);
  const seenKey = SEEN_PREFIX + seenHash;

  const alreadySeen = await kv.get(seenKey, "text");
  if (alreadySeen !== null) {
    return readCounts(kv, day);
  }

  // Guard against KV write-budget exhaustion. If today's write count has hit
  // the cap, silently degrade to read-only for the rest of the UTC day.
  const writesKey = WRITES_PREFIX + day;
  const writesRaw = await kv.get(writesKey, "text");
  const writesToday = writesRaw !== null ? parseInt(writesRaw, 10) : 0;
  if (Number.isFinite(writesToday) && writesToday >= WRITE_CAP_PER_DAY) {
    return readCounts(kv, day);
  }

  // First hit today for this IP: increment counters, mark seen, bump write meter.
  const current = await readCounts(kv, day);
  const nextTotal = current.total + 1;
  const nextToday = current.today + 1;
  const nextWrites = (Number.isFinite(writesToday) ? writesToday : 0) + 4;

  await Promise.all([
    kv.put(KEY_TOTAL, String(nextTotal)),
    kv.put(DAY_PREFIX + day, String(nextToday)),
    kv.put(seenKey, "1", { expirationTtl: SEEN_TTL_SECONDS }),
    kv.put(writesKey, String(nextWrites), { expirationTtl: SEEN_TTL_SECONDS }),
  ]);

  return { total: nextTotal, today: nextToday };
}
