import { LruCache } from "@/lib/cache/lru";

/**
 * A cache with one shape and two homes.
 *
 * In memory it is the process-local LRU; shared it is a Redis key space that
 * every serverless instance sees. Callers never know which they hold, so a
 * deployment without Redis works exactly as one with it, only per instance.
 * Only public or derived data goes through here (statute text, yes/no gate
 * verdicts); nothing that could reconstruct a user's document.
 */
export interface CacheStore<V> {
  get(key: string): Promise<V | undefined>;
  set(key: string, value: V): Promise<void>;
}

/** The subset of a Redis client the shared store needs; kept small so tests can fake it. */
export interface KeyValueClient {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, options: { px: number }): Promise<unknown>;
}

export function memoryStore<V>(entries: number, ttlMs: number, now?: () => number): CacheStore<V> {
  const cache = new LruCache<V>(entries, ttlMs, now);
  return {
    get: async (key) => cache.get(key),
    set: async (key, value) => cache.set(key, value),
  };
}

/** A stored value is wrapped so `null` survives the round trip as a hit, not a miss. */
interface Boxed<V> {
  v: V;
}

/**
 * Shared store over Redis. Every failure degrades to a miss with one warning,
 * so an unreachable cache costs a repeat fetch, never a failed request.
 */
export function sharedStore<V>(
  client: KeyValueClient,
  prefix: string,
  ttlMs: number,
): CacheStore<V> {
  let warned = false;
  const warn = (error: unknown) => {
    if (warned) return;
    warned = true;
    console.warn("shared cache unavailable, falling back to fetches", {
      prefix,
      error: String(error),
    });
  };
  return {
    async get(key) {
      try {
        const boxed = await client.get<Boxed<V>>(`${prefix}:${key}`);
        return boxed ? boxed.v : undefined;
      } catch (error) {
        warn(error);
        return undefined;
      }
    },
    async set(key, value) {
      try {
        await client.set(`${prefix}:${key}`, { v: value } satisfies Boxed<V>, { px: ttlMs });
      } catch (error) {
        warn(error);
      }
    },
  };
}
