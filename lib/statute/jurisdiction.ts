import type { StatuteHit } from "@/lib/statute/indiacode";

/**
 * Choosing the right statute hit for where the user lives.
 *
 * IndiaCode indexes central and state legislation together, so a query about
 * rent deposits returns whichever state's act ranks first. Given the user's
 * state, prefer that state's act; otherwise prefer central acts over another
 * state's law, which would simply be wrong for them.
 */

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;
export type IndianState = (typeof INDIAN_STATES)[number];

const STATE_PATTERNS = INDIAN_STATES.map((state) => ({
  state,
  pattern: new RegExp(`\\b${state.replace(/ /g, "\\s+")}\\b`, "i"),
}));

/** The state named in an act title, if any. */
export function stateOfAct(actTitle: string): IndianState | null {
  return STATE_PATTERNS.find(({ pattern }) => pattern.test(actTitle))?.state ?? null;
}

export function isIndianState(value: string): value is IndianState {
  return (INDIAN_STATES as readonly string[]).includes(value);
}

/** Pick the most relevant hit for the user's state, or the first central one. */
export function pickForJurisdiction(
  hits: StatuteHit[],
  state: IndianState | null,
): StatuteHit | null {
  if (state) {
    const own = hits.find((hit) => stateOfAct(hit.act) === state);
    if (own) return own;
  }
  return hits.find((hit) => stateOfAct(hit.act) === null) ?? hits[0] ?? null;
}
