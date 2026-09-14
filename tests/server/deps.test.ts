import { afterEach, describe, expect, it, vi } from "vitest";

const REDIS_ENV = {
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "test-token",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("server deps", () => {
  it("keeps everything in memory when no Redis is configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("KV_REST_API_URL", "");
    const deps = await import("@/lib/server/deps");
    // Class identity is checked by name: resetModules gives each import its own module instances.
    expect(deps.aiRateLimiter.constructor.name).toBe("RateLimiter");
    expect(deps.sharedRedis({})).toBeNull();
    expect(deps.sharedRedis({ KV_REST_API_URL: "https://kv.example.upstash.io" })).toBeNull();
    const built = deps.serverDeps();
    expect(deps.serverDeps()).toBe(built);
    deps.setServerDeps(null);
  });

  it("shares the rate limit and caches through Redis when its variables are present", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", REDIS_ENV.UPSTASH_REDIS_REST_URL);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", REDIS_ENV.UPSTASH_REDIS_REST_TOKEN);
    const deps = await import("@/lib/server/deps");
    expect(deps.aiRateLimiter.constructor.name).toBe("SharedRateLimiter");
    expect(
      deps.sharedRedis({
        KV_REST_API_URL: "https://kv.example.upstash.io",
        KV_REST_API_TOKEN: "t",
      }),
    ).not.toBeNull();
    expect(deps.serverDeps().statutes).toBeDefined();
    deps.setServerDeps(null);
  });
});
