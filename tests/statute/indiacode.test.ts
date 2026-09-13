import { describe, expect, it, vi } from "vitest";
import {
  INDIACODE_BASE_URL,
  createIndiaCodeClient,
  parseStatuteRef,
  type FetchLike,
  isIndiaCodeUrl,
} from "@/lib/statute/indiacode";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const SEARCH_BODY = {
  total: 1,
  results: [
    {
      kind: "section",
      ref: "contract-act/73",
      title: "Compensation for loss or damage caused by breach of contract",
      act: "The Indian Contract Act, 1872",
      snippet: "When a contract has been broken…",
      url: `${INDIACODE_BASE_URL}/contract-act/section/73/`,
    },
  ],
};

const SECTION_BODY = {
  act: {
    id: "contract-act",
    short_title: "The Indian Contract Act, 1872",
    in_force: true,
    url: `${INDIACODE_BASE_URL}/contract-act/`,
  },
  section: {
    number: "73",
    heading: "Compensation for loss or damage caused by breach of contract",
    text: "When a contract has been broken, the party who suffers…",
    url: `${INDIACODE_BASE_URL}/contract-act/section/73/`,
  },
};

describe("createIndiaCodeClient", () => {
  it("searches sections and normalises hits", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockImplementation(async () => jsonResponse(SEARCH_BODY));
    const client = createIndiaCodeClient(fetchImpl);
    const hits = await client.search("breach of contract damages", 3);
    expect(hits).toEqual([
      {
        ref: "contract-act/73",
        title: SEARCH_BODY.results[0]?.title,
        act: "The Indian Contract Act, 1872",
        snippet: "When a contract has been broken…",
        url: `${INDIACODE_BASE_URL}/contract-act/section/73/`,
      },
    ]);
    const [url] = fetchImpl.mock.calls[0] as [string];
    expect(url).toBe(
      `${INDIACODE_BASE_URL}/api/v1/search?q=breach+of+contract+damages&kind=section&limit=3`,
    );
  });

  it("caches searches by query and limit", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockImplementation(async () => jsonResponse(SEARCH_BODY));
    const client = createIndiaCodeClient(fetchImpl);
    await client.search("  Breach  ");
    await client.search("breach");
    await client.search("breach", 5);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("falls back to the title when a hit has no act and no snippet", async () => {
    const body = {
      total: 1,
      results: [{ ...SEARCH_BODY.results[0], act: undefined, snippet: undefined }],
    };
    const client = createIndiaCodeClient(vi.fn<FetchLike>().mockResolvedValue(jsonResponse(body)));
    const [hit] = await client.search("x");
    expect(hit?.act).toBe(SEARCH_BODY.results[0]?.title);
    expect(hit?.snippet).toBe("");
  });

  it("returns no hits when the response does not match the schema", async () => {
    const client = createIndiaCodeClient(
      vi.fn<FetchLike>().mockResolvedValue(jsonResponse({ unexpected: true })),
    );
    expect(await client.search("anything")).toEqual([]);
  });

  it("throws on a non-2xx response", async () => {
    const client = createIndiaCodeClient(
      vi.fn<FetchLike>().mockResolvedValue(jsonResponse({}, 503)),
    );
    await expect(client.search("x")).rejects.toThrow("IndiaCode responded 503");
  });

  it("fetches a section, caches it and derives a url when missing", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockImplementation(async () => jsonResponse(SECTION_BODY));
    const client = createIndiaCodeClient(fetchImpl);
    const section = await client.getSection("contract-act", "73");
    expect(section).toMatchObject({
      actId: "contract-act",
      actTitle: "The Indian Contract Act, 1872",
      inForce: true,
      number: "73",
      heading: SECTION_BODY.section.heading,
      url: SECTION_BODY.section.url,
    });
    await client.getSection("contract-act", "73");
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const bare = {
      act: { id: "x", short_title: "X Act", url: `${INDIACODE_BASE_URL}/x/` },
      section: { number: "1", text: "Text." },
    };
    const bareClient = createIndiaCodeClient(
      vi.fn<FetchLike>().mockResolvedValue(jsonResponse(bare)),
    );
    expect(await bareClient.getSection("x", "1")).toMatchObject({
      inForce: true,
      heading: null,
      url: `${INDIACODE_BASE_URL}/x/section/1/`,
    });
  });

  it("returns null for a malformed section and caches the miss", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockImplementation(async () => jsonResponse({ nope: 1 }));
    const client = createIndiaCodeClient(fetchImpl);
    expect(await client.getSection("a", "1")).toBeNull();
    expect(await client.getSection("a", "1")).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("parseStatuteRef", () => {
  it("splits an act id and section number", () => {
    expect(parseStatuteRef("consumer-protection-act/2")).toEqual({
      actId: "consumer-protection-act",
      number: "2",
    });
  });

  it("only trusts https links on IndiaCode's own host", () => {
    expect(isIndiaCodeUrl(`${INDIACODE_BASE_URL}/contract-act/section/73/`)).toBe(true);
    expect(isIndiaCodeUrl("http://indiacode.ecourtsindia.com/x")).toBe(false);
    expect(isIndiaCodeUrl("https://evil.example/indiacode.ecourtsindia.com")).toBe(false);
    expect(isIndiaCodeUrl("javascript:alert(1)")).toBe(false);
    expect(isIndiaCodeUrl("not a url")).toBe(false);
  });

  it("rejects refs without a section", () => {
    expect(parseStatuteRef("contract-act")).toBeNull();
    expect(parseStatuteRef("contract-act/")).toBeNull();
    expect(parseStatuteRef("/73")).toBeNull();
  });
});
