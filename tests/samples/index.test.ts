import { describe, expect, it } from "vitest";
import { LIMITS } from "@/lib/constants";
import { segmentDocument } from "@/lib/document/segment";
import { RENT_AGREEMENT_V1, RENT_AGREEMENT_V2, SAMPLES, findSample } from "@/lib/samples";

describe("sample documents", () => {
  it("are within limits, segment into several clauses and have unique ids", () => {
    const ids = new Set(SAMPLES.map((s) => s.id));
    expect(ids.size).toBe(SAMPLES.length);
    for (const sample of SAMPLES) {
      expect(sample.text.length).toBeLessThan(LIMITS.MAX_DOCUMENT_CHARS);
      expect(sample.text.length).toBeGreaterThan(LIMITS.MIN_DOCUMENT_CHARS);
      expect(segmentDocument(sample.text).clauses.length).toBeGreaterThan(4);
      expect(sample.title.en.length).toBeGreaterThan(0);
      expect(sample.title.hi.length).toBeGreaterThan(0);
    }
  });

  it("finds samples by id and provides two rent agreement versions to compare", () => {
    expect(findSample("rent-agreement")?.text).toBe(RENT_AGREEMENT_V1);
    expect(findSample("missing")).toBeUndefined();
    expect(RENT_AGREEMENT_V2).not.toBe(RENT_AGREEMENT_V1);
  });
});
