import { afterEach, describe, expect, it, vi } from "vitest";
import { memoryStore, sharedStore, type KeyValueClient } from "@/lib/cache/store";

afterEach(() => vi.restoreAllMocks());

describe("memoryStore", () => {
  it("remembers values for the ttl and forgets them after", async () => {
    let now = 0;
    const store = memoryStore<number>(2, 100, () => now);
    await store.set("a", 1);
    expect(await store.get("a")).toBe(1);
    now = 101;
    expect(await store.get("a")).toBeUndefined();
  });
});

describe("sharedStore", () => {
  function fakeClient(): KeyValueClient & { data: Map<string, unknown> } {
    const data = new Map<string, unknown>();
    return {
      data,
      get: async <T>(key: string) => (data.get(key) as T | undefined) ?? null,
      set: async (key, value) => void data.set(key, value),
    };
  }

  it("namespaces keys, keeps the ttl in milliseconds and round-trips null as a hit", async () => {
    const client = fakeClient();
    const set = vi.spyOn(client, "set");
    const store = sharedStore<string | null>(client, "p", 5_000);
    await store.set("k", "v");
    await store.set("none", null);
    expect(set).toHaveBeenCalledWith("p:k", { v: "v" }, { px: 5_000 });
    expect(await store.get("k")).toBe("v");
    expect(await store.get("none")).toBeNull();
    expect(await store.get("missing")).toBeUndefined();
  });

  it("treats a failing client as a miss and warns once", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const broken: KeyValueClient = {
      get: async () => Promise.reject(new Error("offline")),
      set: async () => Promise.reject(new Error("offline")),
    };
    const store = sharedStore<number>(broken, "p", 1_000);
    expect(await store.get("a")).toBeUndefined();
    await store.set("a", 1);
    expect(await store.get("a")).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
