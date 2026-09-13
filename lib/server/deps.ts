import { createModelFactory, envFromProcess } from "@/lib/ai/client";
import type { AnalyzeDeps } from "@/lib/analysis/analyze";
import { AI_RATE_LIMIT, RateLimiter } from "@/lib/http/rate-limit";
import { createIndiaCodeClient } from "@/lib/statute/indiacode";

/**
 * Process-wide dependencies for API routes, built once per instance.
 *
 * Routes never construct providers themselves; they ask for these, which
 * keeps every route a thin, testable adapter over the library code.
 */

let deps: AnalyzeDeps | null = null;

export function serverDeps(): AnalyzeDeps {
  if (!deps) {
    const env = envFromProcess();
    deps = { factory: createModelFactory(env), env, statutes: createIndiaCodeClient() };
  }
  return deps;
}

/** Replace the shared dependencies. Used by tests; harmless in production. */
export function setServerDeps(next: AnalyzeDeps | null): void {
  deps = next;
}

export const aiRateLimiter = new RateLimiter(AI_RATE_LIMIT.limit, AI_RATE_LIMIT.windowMs);
