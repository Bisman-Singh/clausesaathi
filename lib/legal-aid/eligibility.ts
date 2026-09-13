import { INDIACODE_BASE_URL } from "@/lib/statute/indiacode";

/**
 * Free legal aid under Section 12 of the Legal Services Authorities Act, 1987.
 *
 * The categories below follow the section's clauses (a) to (h). Income limits
 * are set by each State Legal Services Authority and change, so the app links
 * to the statute and to NALSA rather than stating a figure.
 */

export const LEGAL_AID_SECTION_URL = `${INDIACODE_BASE_URL}/legal-services-authorities-act-1987/section/12/`;
export const NALSA_URL = "https://nalsa.gov.in/legal-aid/";

export const ELIGIBILITY_CATEGORIES = [
  { id: "sc_st", clause: "(a)" },
  { id: "trafficking_or_begar", clause: "(b)" },
  { id: "woman_or_child", clause: "(c)" },
  { id: "disability", clause: "(d)" },
  { id: "disaster_or_violence", clause: "(e)" },
  { id: "industrial_workman", clause: "(f)" },
  { id: "in_custody", clause: "(g)" },
  { id: "income_below_limit", clause: "(h)" },
] as const;

export type EligibilityCategoryId = (typeof ELIGIBILITY_CATEGORIES)[number]["id"];

export type EligibilityAnswers = Partial<Record<EligibilityCategoryId, boolean>>;

export interface EligibilityAssessment {
  /** True when at least one Section 12 category applies. */
  likelyEligible: boolean;
  matched: EligibilityCategoryId[];
}

/** One matching category is enough; the categories are alternatives. */
export function assessEligibility(answers: EligibilityAnswers): EligibilityAssessment {
  const matched = ELIGIBILITY_CATEGORIES.map((category) => category.id).filter(
    (id) => answers[id] === true,
  );
  return { likelyEligible: matched.length > 0, matched };
}
