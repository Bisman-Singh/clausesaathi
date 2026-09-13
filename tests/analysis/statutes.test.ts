import { describe, expect, it, vi } from "vitest";
import { attachStatutes } from "@/lib/analysis/statutes";
import type { Risk } from "@/lib/analysis/schemas";
import type { IndiaCodeClient, StatuteHit } from "@/lib/statute/indiacode";

const hit: StatuteHit = {
  ref: "contract-act/74",
  title: "Compensation for breach of contract where penalty stipulated for",
  act: "The Indian Contract Act, 1872",
  snippet: "When a contract has been broken…",
  url: "https://indiacode.ecourtsindia.com/contract-act/section/74/",
};

const risk = (n: number, statuteQuery: string | null): Risk => ({
  title: `Risk ${n}`,
  severity: "medium",
  clauseId: `c${n}`,
  explanation: "because",
  statuteQuery,
});

describe("attachStatutes", () => {
  it("looks up a statute for risks with a query and skips the rest", async () => {
    const client: IndiaCodeClient = {
      search: vi.fn(async () => [hit]),
      getSection: vi.fn(),
    };
    const result = await attachStatutes(
      [risk(1, "penalty clause"), risk(2, null), risk(3, "  ")],
      client,
      { state: null },
    );
    expect(result[0]?.statute).toEqual({
      act: hit.act,
      title: hit.title,
      snippet: hit.snippet,
      url: hit.url,
    });
    expect(result[1]?.statute).toBeNull();
    expect(result[2]?.statute).toBeNull();
    expect(client.search).toHaveBeenCalledTimes(1);
    expect(client.search).toHaveBeenCalledWith("penalty clause", 10);
  });

  it("searches with the state first and keeps a state match, else falls back to a plain search", async () => {
    const own: StatuteHit = {
      ...hit,
      act: "The Kerala Buildings (Lease and Rent Control) Act, 1965",
    };
    const client: IndiaCodeClient = {
      search: vi.fn(async (query: string) => (query.endsWith("Kerala") ? [own] : [hit])),
      getSection: vi.fn(),
    };
    const [first] = await attachStatutes([risk(1, "rent control")], client, { state: "Kerala" });
    expect(first?.statute?.act).toBe(own.act);
    expect(client.search).toHaveBeenCalledWith("rent control Kerala", 10);

    const central: IndiaCodeClient = {
      search: vi.fn(async () => [hit]),
      getSection: vi.fn(),
    };
    const [second] = await attachStatutes([risk(1, "penalty")], central, { state: "Kerala" });
    expect(second?.statute?.act).toBe(hit.act);
    expect(central.search).toHaveBeenCalledTimes(1);

    const empty: IndiaCodeClient = {
      search: vi.fn(async (query: string) => (query.endsWith("Kerala") ? [] : [hit])),
      getSection: vi.fn(),
    };
    const [third] = await attachStatutes([risk(1, "penalty")], empty, { state: "Kerala" });
    expect(third?.statute?.act).toBe(hit.act);
    expect(empty.search).toHaveBeenCalledTimes(2);
  });

  it("names the domain's central act in a last search when only other states' acts come up", async () => {
    const delhi: StatuteHit = { ...hit, act: "The Delhi Rent Control Act, 1958" };
    const tp: StatuteHit = { ...hit, act: "The Transfer of Property Act, 1882" };
    const client: IndiaCodeClient = {
      search: vi.fn(async (query: string) =>
        query.includes("Transfer of Property") ? [tp] : [delhi],
      ),
      getSection: vi.fn(),
    };
    const [risk1] = await attachStatutes([risk(1, "security deposit")], client, {
      state: "Karnataka",
      centralAct: "Transfer of Property Act",
    });
    expect(risk1?.statute?.act).toBe(tp.act);
    expect(client.search).toHaveBeenCalledTimes(3);
    expect(client.search).toHaveBeenLastCalledWith("security deposit Transfer of Property Act", 10);
  });

  it("caps the number of lookups per analysis", async () => {
    const client: IndiaCodeClient = { search: vi.fn(async () => [hit]), getSection: vi.fn() };
    const result = await attachStatutes([risk(1, "a"), risk(2, "b"), risk(3, "c")], client, {
      state: null,
      maxLookups: 2,
    });
    expect(result.map((r) => r.statute !== null)).toEqual([true, true, false]);
  });

  it("spends the budget on the most serious risks first, keeping output order", async () => {
    const client: IndiaCodeClient = { search: vi.fn(async () => [hit]), getSection: vi.fn() };
    const risks = [
      { ...risk(1, "a"), severity: "low" as const },
      { ...risk(2, "b"), severity: "high" as const },
      { ...risk(3, "c"), severity: "medium" as const },
    ];
    const result = await attachStatutes(risks, client, { state: null, maxLookups: 2 });
    expect(result.map((r) => r.statute !== null)).toEqual([false, true, true]);
  });

  it("tolerates empty results and failed lookups", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const client: IndiaCodeClient = {
      search: vi.fn().mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("down")),
      getSection: vi.fn(),
    };
    const result = await attachStatutes([risk(1, "a"), risk(2, "b")], client, { state: null });
    expect(result.map((r) => r.statute)).toEqual([null, null]);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
