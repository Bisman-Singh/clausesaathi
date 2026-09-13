import { describe, expect, it } from "vitest";
import { LruCache } from "@/lib/cache/lru";

describe("LruCache", () => {
  it("returns stored values and reports size", () => {
    const cache = new LruCache<number>(2, 1000, () => 0);
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);
    expect(cache.get("missing")).toBeUndefined();
    expect(cache.size).toBe(1);
  });

  it("evicts the least recently used entry once full", () => {
    const cache = new LruCache<number>(2, 1000, () => 0);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.get("a");
    cache.set("c", 3);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(1);
    expect(cache.get("c")).toBe(3);
  });

  it("expires entries after the ttl", () => {
    let now = 0;
    const cache = new LruCache<string>(5, 100, () => now);
    cache.set("k", "v");
    now = 99;
    expect(cache.get("k")).toBe("v");
    now = 100;
    expect(cache.get("k")).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it("overwrites an existing key without growing", () => {
    const cache = new LruCache<number>(1, 1000, () => 0);
    cache.set("a", 1);
    cache.set("a", 2);
    expect(cache.size).toBe(1);
    expect(cache.get("a")).toBe(2);
  });
});
