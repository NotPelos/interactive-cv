/**
 * KV-backed cache helpers for GitHub API responses.
 *
 * TTL: 1 hour (3600 s). GitHub returns ETag/Last-Modified but KV
 * doesn't support conditional requests natively — a fixed TTL is
 * simpler and sufficient for a portfolio showcase.
 */

const CACHE_TTL_SECONDS = 3600; // 1 hour

export interface CacheResult<T> {
  data: T | null;
  hit: boolean;
}

export async function getFromCache<T>(kv: KVNamespace, key: string): Promise<CacheResult<T>> {
  const raw = await kv.get(key);
  if (raw === null) {
    return { data: null, hit: false };
  }
  try {
    return { data: JSON.parse(raw) as T, hit: true };
  } catch {
    // Corrupt entry — treat as miss
    return { data: null, hit: false };
  }
}

export async function putInCache<T>(kv: KVNamespace, key: string, data: T): Promise<void> {
  await kv.put(key, JSON.stringify(data), { expirationTtl: CACHE_TTL_SECONDS });
}
