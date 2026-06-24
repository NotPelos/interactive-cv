/**
 * In-memory KV mock for unit tests.
 * Implements the subset of KVNamespace used by our code, including
 * getWithMetadata with typed metadata support for the rate limiter.
 */

interface KvEntry {
  value: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any | null;
}

export function createMockKv(): KVNamespace {
  const store = new Map<string, KvEntry>();

  return {
    async get(key: string): Promise<string | null> {
      return store.get(key)?.value ?? null;
    },
    async put(
      key: string,
      value: string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      options?: { expirationTtl?: number; metadata?: any }
    ): Promise<void> {
      store.set(key, { value, metadata: options?.metadata ?? null });
    },
    async delete(key: string): Promise<void> {
      store.delete(key);
    },
    async list(): Promise<KVNamespaceListResult<unknown, string>> {
      return { keys: [], list_complete: true, cacheStatus: null };
    },
    async getWithMetadata<V = string, M = unknown>(
      key: string
    ): Promise<KVNamespaceGetWithMetadataResult<V, M>> {
      const entry = store.get(key);
      if (!entry) {
        return { value: null, metadata: null, cacheStatus: null };
      }
      return {
        value: entry.value as V,
        metadata: entry.metadata as M | null,
        cacheStatus: null,
      };
    },
  } as unknown as KVNamespace;
}

/** Pre-seed a mock KV with a JSON value. */
export async function seedKv(kv: KVNamespace, key: string, value: unknown): Promise<void> {
  await kv.put(key, JSON.stringify(value));
}
