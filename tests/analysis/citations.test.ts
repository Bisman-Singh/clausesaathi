import { describe, expect, it } from "vitest";
import { verifyCitations } from "@/lib/analysis/citations";
import type { DocumentBrief } from "@/lib/analysis/schemas";

const brief: DocumentBrief = {
  documentType: "Rent agreement",
  parties: ["Landlord", "Tenant"],
  summary: [{ text: "Eleven month tenancy.", clauseIds: ["c1", "c9"] }],
  keyTerms: [
    { term: "Lock-in", meaning: "Cannot leave early.", clauseId: "c2" },
    { term: "Ghost", meaning: "Not real.", clauseId: "c99" },
  ],
  obligations: [
    { party: "Tenant", action: "Pay rent", clauseId: "c2", deadline: { kind: "unspecified" } },
    { party: "Tenant", action: "Fly", clauseId: "c42", deadline: { kind: "unspecified" } },
  ],
  risks: [
    { title: "Deposit", severity: "high", clauseId: "c3", explanation: "x", statuteQuery: null },
    { title: "Fake", severity: "low", clauseId: "c77", explanation: "y", statuteQuery: null },
  ],
  inconsistencies: [
    { description: "Rent differs", clauseIds: ["c2", "c50"] },
    { description: "Nothing real", clauseIds: ["c60"] },
  ],
  nextSteps: [],
  questionsForLawyer: [],
  checklist: [],
};

describe("verifyCitations", () => {
  it("drops items whose clause does not exist and counts every bad id", () => {
    const { brief: verified, dropped } = verifyCitations(brief, new Set(["c1", "c2", "c3"]));
    expect(verified.summary[0]?.clauseIds).toEqual(["c1"]);
    expect(verified.keyTerms.map((t) => t.term)).toEqual(["Lock-in"]);
    expect(verified.obligations.map((o) => o.action)).toEqual(["Pay rent"]);
    expect(verified.risks.map((r) => r.title)).toEqual(["Deposit"]);
    expect(verified.inconsistencies).toEqual([{ description: "Rent differs", clauseIds: ["c2"] }]);
    expect(dropped).toBe(6);
  });

  it("leaves a fully valid brief untouched", () => {
    const ids = new Set(["c1", "c2", "c3", "c9", "c42", "c50", "c60", "c77", "c99"]);
    const { brief: verified, dropped } = verifyCitations(brief, ids);
    expect(verified).toEqual(brief);
    expect(dropped).toBe(0);
  });
});
