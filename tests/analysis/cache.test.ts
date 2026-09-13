import { describe, expect, it } from "vitest";
import { analysisKey, createAnalysisCache } from "@/lib/analysis/cache";

describe("analysisKey", () => {
  it("is stable for the same input and different for any changed part", () => {
    const base = { text: "doc", situation: "s", locale: "en" as const, state: "Goa" };
    expect(analysisKey(base)).toBe(analysisKey({ ...base }));
    expect(analysisKey(base)).not.toBe(analysisKey({ ...base, state: null }));
    expect(analysisKey(base)).not.toBe(analysisKey({ ...base, locale: "hi" }));
    expect(analysisKey(base)).not.toBe(analysisKey({ ...base, situation: "t" }));
    expect(analysisKey(base)).toHaveLength(64);
  });
});

describe("createAnalysisCache", () => {
  it("forgets an entry after an hour", () => {
    let now = 0;
    const cache = createAnalysisCache(() => now);
    const value = { brief: {}, droppedCitations: 0, model: "m" } as never;
    cache.set("k", value);
    expect(cache.get("k")).toBe(value);
    now = 61 * 60 * 1000;
    expect(cache.get("k")).toBeUndefined();
    cache.set("k", value);
    cache.clear();
    expect(cache.get("k")).toBeUndefined();
  });
});
