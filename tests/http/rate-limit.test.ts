import { describe, expect, it } from "vitest";
import { AI_RATE_LIMIT, RateLimiter } from "@/lib/http/rate-limit";

describe("RateLimiter", () => {
  it("allows up to the limit inside the window, then refuses", () => {
    let now = 0;
    const limiter = new RateLimiter(2, 1000, () => now);
    expect(limiter.allow("a")).toBe(true);
    expect(limiter.allow("a")).toBe(true);
    expect(limiter.allow("a")).toBe(false);
    expect(limiter.allow("b")).toBe(true);
    now = 1001;
    expect(limiter.allow("a")).toBe(true);
  });

  it("prunes idle keys once the table grows large", () => {
    let now = 0;
    const limiter = new RateLimiter(1, 10, () => now);
    for (let i = 0; i < 1000; i += 1) limiter.allow(`k${i}`);
    now = 100;
    expect(limiter.allow("fresh")).toBe(true);
    expect(limiter.allow("k1")).toBe(true);
  });

  it("exposes the AI limit configuration", () => {
    expect(AI_RATE_LIMIT).toEqual({ limit: 10, windowMs: 60_000 });
  });
});
