import { describe, expect, it } from "vitest";
import {
  ELIGIBILITY_CATEGORIES,
  LEGAL_AID_SECTION_URL,
  assessEligibility,
} from "@/lib/legal-aid/eligibility";

describe("assessEligibility", () => {
  it("is not eligible when nothing applies", () => {
    expect(assessEligibility({})).toEqual({ likelyEligible: false, matched: [] });
    expect(assessEligibility({ sc_st: false })).toEqual({ likelyEligible: false, matched: [] });
  });

  it("is likely eligible when any category applies, in section order", () => {
    expect(assessEligibility({ income_below_limit: true, woman_or_child: true })).toEqual({
      likelyEligible: true,
      matched: ["woman_or_child", "income_below_limit"],
    });
  });

  it("covers the eight clauses of Section 12 and links to the statute text", () => {
    expect(ELIGIBILITY_CATEGORIES.map((c) => c.clause)).toEqual([
      "(a)",
      "(b)",
      "(c)",
      "(d)",
      "(e)",
      "(f)",
      "(g)",
      "(h)",
    ]);
    expect(LEGAL_AID_SECTION_URL).toContain("legal-services-authorities-act-1987/section/12");
  });
});
