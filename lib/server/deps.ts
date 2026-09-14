import "server-only";
import { Redis } from "@upstash/redis";
import { createModelFactory, envFromProcess } from "@/lib/ai/client";
import { createAnalysisCache } from "@/lib/analysis/cache";
import type { AnalyzeDeps } from "@/lib/analysis/analyze";
import { memoryStore, sharedStore, type CacheStore } from "@/lib/cache/store";
import { AI_RATE_LIMIT, RateLimiter, type RequestLimiter } from "@/lib/http/rate-limit";
import { createSharedRateLimiter } from "@/lib/http/shared-rate-limit";
import {
  createIndiaCodeClient,
  memoryIndiaCodeStores,
  type IndiaCodeStores,
} from "@/lib/statute/indiacode";

/**
 * Process-wide dependencies for API routes, built once per instance.
 *
 * Routes never construct providers themselves; they ask for these, which
 * keeps every route a thin, testable adapter over the library code.
 *
 * With Upstash Redis configured (the Vercel marketplace injects the
 * variables), the rate limit, statute cache and topic-gate cache are shared
 * by every instance. Without it, each instance keeps its own, and nothing
 * else changes. The brief cache stays in memory either way: its entries are
 * derived from the user's document and do not leave the process.
 */

const HOUR_MS = 60 * 60 * 1000;

/** The Upstash client when its variables are present, whichever name Vercel or Upstash gave them. */
export function sharedRedis(env: Record<string, string | undefined> = process.env): Redis | null {
  const url = env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

const redis = sharedRedis();

export const aiRateLimiter: RequestLimiter = redis
  ? createSharedRateLimiter(redis, AI_RATE_LIMIT.limit, AI_RATE_LIMIT.windowMs)
  : new RateLimiter(AI_RATE_LIMIT.limit, AI_RATE_LIMIT.windowMs);

/** Topic-gate verdicts by document and question hash, an hour each; the samples' questions repeat all day. */
export const gateCache: CacheStore<boolean> = redis
  ? sharedStore(redis, "clausesaathi:gate", HOUR_MS)
  : memoryStore(500, HOUR_MS);

function statuteStores(): IndiaCodeStores {
  if (!redis) return memoryIndiaCodeStores();
  return {
    search: sharedStore(redis, "clausesaathi:statute:search", HOUR_MS),
    section: sharedStore(redis, "clausesaathi:statute:section", HOUR_MS),
  };
}

let deps: AnalyzeDeps | null = null;

export function serverDeps(): AnalyzeDeps {
  if (!deps) {
    const env = envFromProcess();
    deps = {
      factory: createModelFactory(env),
      env,
      statutes: createIndiaCodeClient(fetch, statuteStores()),
    };
  }
  return deps;
}

/** Replace the shared dependencies. Used by tests; harmless in production. */
export function setServerDeps(next: AnalyzeDeps | null): void {
  deps = next;
}

/** Recent briefs by content hash, so repeated documents (the samples above all) cost no model call. */
export const analysisCache = createAnalysisCache();
