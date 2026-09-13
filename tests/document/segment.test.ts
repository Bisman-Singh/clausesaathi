import { describe, expect, it } from "vitest";
import { LIMITS } from "@/lib/constants";
import { normalizeText, renderForModel, segmentDocument } from "@/lib/document/segment";

const RENT_AGREEMENT = `RENTAL AGREEMENT

This agreement is made on 1 April 2026 between the Landlord and the Tenant.

1. Term
The tenancy runs for eleven months starting 1 April 2026.

2. Rent and deposit
The Tenant pays Rs. 18,000 on or before the 5th of every month.
A security deposit of Rs. 54,000 is payable at signing.

3. Notice
Either party may end this agreement by giving thirty days written notice.`;

describe("normalizeText", () => {
  it("converts Windows line endings, trims trailing spaces and collapses blank runs", () => {
    expect(normalizeText("a  \r\n\r\n\r\n\r\nb c ")).toBe("a\n\nb c");
  });
});

describe("segmentDocument", () => {
  it("detects a title and numbered clauses with headings", () => {
    const doc = segmentDocument(RENT_AGREEMENT);
    expect(doc.title).toBe("RENTAL AGREEMENT");
    expect(doc.clauses.map((c) => c.heading)).toEqual([
      null,
      "1. Term",
      "2. Rent and deposit",
      "3. Notice",
    ]);
    expect(doc.clauses[2]?.text).toContain("security deposit");
    expect(doc.clauses.map((c) => c.id)).toEqual(["c1", "c2", "c3", "c4"]);
    expect(doc.wordCount).toBeGreaterThan(40);
    expect(doc.charCount).toBe(normalizeText(RENT_AGREEMENT).length);
  });

  it("treats a numbered single line as heading label plus text", () => {
    const doc = segmentDocument("Terms\n\n4. The deposit is refundable within thirty days.");
    expect(doc.clauses[0]).toMatchObject({
      heading: "4.",
      text: "The deposit is refundable within thirty days.",
    });
  });

  it("keeps a first block that looks like a clause as a clause, not a title", () => {
    const doc = segmentDocument("1. Definitions\nWords mean what they say.\n\nSecond block here.");
    expect(doc.title).toBeNull();
    expect(doc.clauses).toHaveLength(2);
    expect(doc.clauses[0]?.heading).toBe("1. Definitions");
  });

  it("ignores long or sentence-like first lines as titles", () => {
    const doc = segmentDocument(
      "This first block is a full sentence that ends with a period.\n\nAnother paragraph follows here.",
    );
    expect(doc.title).toBeNull();
    expect(doc.clauses[0]?.heading).toBeNull();
  });

  it("recognises upper-case title lines inside a block", () => {
    const doc = segmentDocument("Intro\n\nINDEMNITY\nThe tenant indemnifies the landlord.");
    expect(doc.clauses[0]).toMatchObject({ heading: "INDEMNITY" });
  });

  it("does not mistake words for letter or roman labels, or wrapped sentences for titles", () => {
    const doc = segmentDocument(
      "Civil suits may be filed in Delhi.\n\nA tenant must pay rent on time.\n\nI agree to the terms.\n\nThe Tenant shall pay rent monthly and\nin advance by the fifth day.\n\na) The first sub-clause.",
    );
    expect(doc.clauses.map((clause) => clause.heading)).toEqual([null, null, null, null, "a)"]);
    expect(doc.clauses[0]?.text).toBe("Civil suits may be filed in Delhi.");
    expect(doc.clauses[3]?.text).toContain("The Tenant shall pay rent monthly and");
    expect(doc.clauses[4]?.text).toBe("The first sub-clause.");
  });

  it("returns an empty document for blank input", () => {
    expect(segmentDocument("   \n\n  ")).toEqual({
      title: null,
      clauses: [],
      charCount: 0,
      wordCount: 0,
    });
  });

  it("merges blocks beyond the clause limit into the final clause", () => {
    const many = Array.from({ length: LIMITS.MAX_CLAUSES + 20 }, (_, i) => `Paragraph ${i}.`).join(
      "\n\n",
    );
    const doc = segmentDocument(many);
    expect(doc.clauses).toHaveLength(LIMITS.MAX_CLAUSES);
    expect(doc.clauses.at(-1)?.text).toContain(`Paragraph ${LIMITS.MAX_CLAUSES + 19}.`);
  });
});

describe("renderForModel", () => {
  it("prefixes every clause with its id and heading", () => {
    const rendered = renderForModel(segmentDocument(RENT_AGREEMENT));
    expect(rendered).toContain("[c2] 1. Term\nThe tenancy runs");
    expect(rendered.startsWith("[c1]\nThis agreement")).toBe(true);
  });
});
