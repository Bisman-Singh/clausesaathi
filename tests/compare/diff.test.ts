import { describe, expect, it } from "vitest";
import {
  diffDocuments,
  titleKey,
  diffWords,
  similarity,
  summarizeChanges,
} from "@/lib/compare/diff";
import { segmentDocument } from "@/lib/document/segment";

describe("similarity", () => {
  it("is 1 for identical text and 0 for disjoint text", () => {
    expect(similarity("The tenant pays rent monthly.", "The tenant pays rent monthly.")).toBe(1);
    expect(similarity("alpha beta gamma", "delta epsilon zeta")).toBe(0);
  });

  it("handles empty and single-word inputs", () => {
    expect(similarity("", "")).toBe(1);
    expect(similarity("", "x")).toBe(0);
    expect(similarity("rent", "rent")).toBe(1);
    expect(similarity("rent", "deposit")).toBe(0);
    expect(similarity("  ", "!!")).toBe(0);
  });

  it("is high for a small edit and low for a rewrite", () => {
    const base = "The security deposit is refundable within thirty days of vacating the premises.";
    expect(similarity(base, base.replace("thirty", "sixty"))).toBeGreaterThan(0.8);
    expect(similarity(base, "The landlord may enter with twenty four hours notice.")).toBeLessThan(
      0.2,
    );
  });
});

describe("diffWords", () => {
  it("marks added, removed and unchanged runs", () => {
    expect(diffWords("pay rent by the 5th", "pay rent before the 10th")).toEqual([
      { type: "same", text: "pay rent" },
      { type: "removed", text: "by" },
      { type: "added", text: "before" },
      { type: "same", text: "the" },
      { type: "removed", text: "5th" },
      { type: "added", text: "10th" },
    ]);
  });

  it("prefers an addition when it preserves more common words", () => {
    expect(diffWords("the deposit", "the full deposit")).toEqual([
      { type: "same", text: "the" },
      { type: "added", text: "full" },
      { type: "same", text: "deposit" },
    ]);
  });

  it("handles pure additions and pure removals", () => {
    expect(diffWords("", "new clause")).toEqual([{ type: "added", text: "new clause" }]);
    expect(diffWords("old clause", "")).toEqual([{ type: "removed", text: "old clause" }]);
  });
});

describe("diffDocuments", () => {
  const v1 = segmentDocument(
    "AGREEMENT\n\n1. Rent\nThe tenant pays Rs. 18,000 by the 5th of each month.\n\n2. Deposit\nA deposit of two months rent is refundable within thirty days of vacating.\n\n3. Pets\nNo pets are allowed on the premises at any time.",
  );
  const v2 = segmentDocument(
    "AGREEMENT\n\n1. Deposit\nA deposit of two months rent is refundable within sixty days of vacating.\n\n2. Rent\nThe tenant pays Rs. 18,000 by the 5th of each month.\n\n3. Maintenance\nThe landlord repairs structural faults within fifteen days of notice.",
  );

  it("aligns by content rather than position and classifies each clause", () => {
    const changes = diffDocuments(v1, v2);
    expect(changes.map((c) => c.kind)).toEqual(["modified", "unchanged", "added", "removed"]);
    const modified = changes[0];
    expect(modified?.before?.heading).toBe("2. Deposit");
    expect(modified?.after?.heading).toBe("1. Deposit");
    expect(modified?.segments).toEqual(
      expect.arrayContaining([
        { type: "removed", text: "thirty" },
        { type: "added", text: "sixty" },
      ]),
    );
    expect(changes[3]?.before?.heading).toBe("3. Pets");
    expect(summarizeChanges(changes)).toEqual({ unchanged: 1, modified: 1, added: 1, removed: 1 });
  });

  it("skips the word diff for very long modified clauses", () => {
    const long = Array.from({ length: 400 }, (_, i) => `word${i}`).join(" ");
    const changes = diffDocuments(
      segmentDocument(`${long} end`),
      segmentDocument(`${long} finish`),
    );
    expect(changes[0]?.kind).toBe("modified");
    expect(changes[0]?.segments).toBeNull();
  });

  it("lets each earlier clause match at most one later clause", () => {
    const one = segmentDocument("The tenant pays rent monthly by bank transfer.");
    const two = segmentDocument(
      "The tenant pays rent monthly by bank transfer.\n\nThe tenant pays rent monthly by bank transfer too.",
    );
    const kinds = diffDocuments(one, two).map((c) => c.kind);
    expect(kinds).toEqual(["unchanged", "added"]);
  });

  it("treats a rewrite under the same title as a change, not a removal plus an addition", () => {
    const old = segmentDocument(
      "6. Maintenance\nThe Tenant bears all repairs, including structural repairs, at their own cost.\n\n8. Disputes\nAny dispute goes to arbitration by a sole arbitrator appointed by the Landlord.",
    );
    const fresh = segmentDocument(
      "5. Maintenance\nThe Landlord bears structural repairs. The Tenant bears minor repairs up to Rs. 2,000.\n\n7. Disputes\nAny dispute shall be referred to the courts at Bengaluru.\n\nNo heading here at all.",
    );
    const changes = diffDocuments(old, fresh);
    expect(changes.map((c) => c.kind)).toEqual(["modified", "modified", "added"]);
    expect(changes[0]?.before?.heading).toBe("6. Maintenance");
    expect(changes[1]?.before?.heading).toBe("8. Disputes");
  });

  it("strips numbering from titles and ignores empty headings", () => {
    expect(titleKey("6. Maintenance")).toBe("maintenance");
    expect(titleKey("Clause 12.1: Notice period")).toBe("notice period");
    expect(titleKey("MAINTENANCE")).toBe("maintenance");
    expect(titleKey(null)).toBeNull();
    expect(titleKey("3. ")).toBeNull();
    expect(titleKey("   ")).toBeNull();
  });

  it("handles empty documents", () => {
    expect(diffDocuments(segmentDocument(""), segmentDocument("Only new."))).toEqual([
      expect.objectContaining({ kind: "added" }),
    ]);
  });
});
