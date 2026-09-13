import { describe, expect, it } from "vitest";
import { toBrief, toDeadline, type DocumentBriefWire } from "@/lib/analysis/schemas";

const wire: DocumentBriefWire = {
  documentType: "  Rent agreement  ",
  parties: ["Landlord", "Tenant"],
  summary: [{ text: "x".repeat(500), clauseIds: ["c1", "bogus", "c2"] }],
  keyTerms: [{ term: "Lock-in", meaning: "Cannot leave early.", clauseId: "c3" }],
  obligations: [
    {
      party: "Tenant",
      action: "Pay rent",
      clauseId: "c2",
      deadline: { kind: "relative", days: 30.4, from: "the notice date", date: null },
    },
  ],
  risks: [
    {
      title: "Deposit",
      severity: "high",
      clauseId: "c3",
      explanation: "Large deposit.",
      statuteQuery: null,
    },
  ],
  inconsistencies: [],
  nextSteps: Array.from({ length: 10 }, (_, i) => `step ${i}`),
  questionsForLawyer: [],
  checklist: [],
};

describe("toDeadline", () => {
  it("keeps well-formed relative and absolute deadlines", () => {
    expect(toDeadline({ kind: "relative", days: 30.4, from: "notice", date: null })).toEqual({
      kind: "relative",
      days: 30,
      from: "notice",
    });
    expect(toDeadline({ kind: "absolute", days: null, from: null, date: "2026-10-01" })).toEqual({
      kind: "absolute",
      date: "2026-10-01",
    });
  });

  it("degrades incomplete or malformed deadlines to unspecified", () => {
    expect(toDeadline({ kind: "relative", days: null, from: "notice", date: null })).toEqual({
      kind: "unspecified",
    });
    expect(toDeadline({ kind: "relative", days: 3, from: "", date: null })).toEqual({
      kind: "unspecified",
    });
    expect(toDeadline({ kind: "absolute", days: null, from: null, date: "1/10/2026" })).toEqual({
      kind: "unspecified",
    });
    expect(toDeadline({ kind: "unspecified", days: 5, from: "x", date: "2026-01-01" })).toEqual({
      kind: "unspecified",
    });
  });
});

describe("toBrief", () => {
  it("trims, bounds and converts a wire brief into the strict shape", () => {
    const brief = toBrief(wire);
    expect(brief.documentType).toBe("Rent agreement");
    expect(brief.summary[0]?.text).toHaveLength(400);
    expect(brief.summary[0]?.clauseIds).toEqual(["c1", "c2"]);
    expect(brief.nextSteps).toHaveLength(8);
    expect(brief.obligations[0]?.deadline).toEqual({
      kind: "relative",
      days: 30,
      from: "the notice date",
    });
  });

  it("rejects a brief with no summary or a malformed clause id", () => {
    expect(() => toBrief({ ...wire, summary: [] })).toThrow();
    const risk = { ...wire.risks[0], clauseId: "clause 3" } as DocumentBriefWire["risks"][number];
    expect(() => toBrief({ ...wire, risks: [risk] })).toThrow();
  });
});
