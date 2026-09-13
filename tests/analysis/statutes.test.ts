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
      null,
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
    expect(client.search).toHaveBeenCalledWith("penalty clause", 5);
  });

  it("caps the number of lookups per analysis", async () => {
    const client: IndiaCodeClient = { search: vi.fn(async () => [hit]), getSection: vi.fn() };
    const result = await attachStatutes(
      [risk(1, "a"), risk(2, "b"), risk(3, "c")],
      client,
      null,
      2,
    );
    expect(result.map((r) => r.statute !== null)).toEqual([true, true, false]);
  });

  it("tolerates empty results and failed lookups", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const client: IndiaCodeClient = {
      search: vi.fn().mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("down")),
      getSection: vi.fn(),
    };
    const result = await attachStatutes([risk(1, "a"), risk(2, "b")], client, null);
    expect(result.map((r) => r.statute)).toEqual([null, null]);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
