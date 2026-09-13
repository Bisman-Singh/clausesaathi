import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, analyze, compare, errorKeyFor } from "@/lib/client/api";
import { clauseAnchor, clauseLabel } from "@/lib/client/clauses";
import { clearAnalysis, loadAnalysis, saveAnalysis } from "@/lib/client/storage";
import { segmentDocument } from "@/lib/document/segment";

afterEach(() => vi.unstubAllGlobals());

describe("api client", () => {
  it("posts JSON for text and multipart for files, and parses the body", async () => {
    const fetchMock = vi.fn(async () => Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    await analyze({ text: "t", situation: "s", locale: "en", state: "" });
    const [, jsonInit] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(jsonInit.body as string)).toEqual({
      text: "t",
      situation: "s",
      locale: "en",
      state: "",
    });
    await analyze({ file: new File(["x"], "a.pdf"), situation: "", locale: "hi", state: "Goa" });
    const [, formInit] = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(formInit.body).toBeInstanceOf(FormData);
    expect((formInit.body as FormData).get("state")).toBe("Goa");
    await analyze({ situation: "", locale: "en", state: "" });
    const [, emptyInit] = fetchMock.mock.calls[2] as unknown as [string, RequestInit];
    expect(JSON.parse(emptyInit.body as string).text).toBe("");
    await expect(compare("a", "b", "en")).resolves.toEqual({ ok: true });
  });

  it("turns error responses into ApiError, even without a JSON body", async () => {
    vi.stubGlobal("fetch", async () => new Response("nope", { status: 500 }));
    const error = await analyze({ text: "t", situation: "", locale: "en", state: "" }).catch(
      (e) => e,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe("unknown");
    expect(error.status).toBe(500);
  });

  it("maps error codes to translation keys", () => {
    expect(errorKeyFor(new ApiError("pdf_no_text", 400))).toBe("errorPdfNoText");
    expect(errorKeyFor(new ApiError("weird", 400))).toBe("errorGeneric");
    expect(errorKeyFor(new Error("x"))).toBe("errorGeneric");
  });
});

describe("storage", () => {
  const memory = new Map<string, string>();
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
  };
  const isNumber = (value: unknown): value is number => typeof value === "number";

  it("round-trips valid values and rejects invalid or missing ones", () => {
    saveAnalysis(42, storage);
    expect(loadAnalysis(isNumber, storage)).toBe(42);
    saveAnalysis("nope", storage);
    expect(loadAnalysis(isNumber, storage)).toBeNull();
    clearAnalysis(storage);
    expect(loadAnalysis(isNumber, storage)).toBeNull();
    memory.set("clausesaathi.analysis", "{broken");
    expect(loadAnalysis(isNumber, storage)).toBeNull();
  });

  it("swallows storage failures", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(() => saveAnalysis(1, throwing)).not.toThrow();
    expect(() => clearAnalysis(throwing)).not.toThrow();
    expect(loadAnalysis(isNumber, throwing)).toBeNull();
  });
});

describe("clause helpers", () => {
  const doc = segmentDocument("Title\n\n1. Rent\nPay monthly.\n\nPlain paragraph without heading.");

  it("builds anchors and human labels in both languages", () => {
    expect(clauseAnchor("c2")).toBe("clause-c2");
    expect(clauseLabel(doc, "c1", "en")).toBe("1. Rent");
    expect(clauseLabel(doc, "c2", "en")).toBe("Clause 2");
    expect(clauseLabel(doc, "c2", "hi")).toBe("धारा 2");
    expect(clauseLabel(doc, "c9", "en")).toBe("Clause 9");
  });
});
