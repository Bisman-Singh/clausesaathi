import type { StatuteHit } from "@/lib/statute/indiacode";

/**
 * Choosing the right statute hit for where the user lives.
 *
 * IndiaCode indexes central and state legislation together, so a query about
 * rent deposits returns whichever state's act ranks first. Given the user's
 * state, prefer that state's act, then a central act. Another state's law is
 * never shown to a user who told us where they live; it would simply be wrong.
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

/** Older or local names that mark an act as regional even without a state name. */
const REGIONAL_TERMS = [
  "Ajmer",
  "Bombay",
  "Madras",
  "Calcutta",
  "Mysore",
  "Bengal",
  "Hyderabad",
  "Saurashtra",
  "Orissa",
  "Pondicherry",
  "Puducherry",
  "Chandigarh",
  "Andaman",
  "Lakshadweep",
  "Daman",
  "Ladakh",
  "Vindhya Pradesh",
  "Madhya Bharat",
  "Travancore",
  "Cochin",
  "Bhopal",
];

const STATE_PATTERNS = INDIAN_STATES.map((state) => ({
  state,
  pattern: new RegExp(`\\b${state.replace(/ /g, "\\s+")}\\b`, "i"),
}));

const REGIONAL_PATTERN = new RegExp(`\\b(${REGIONAL_TERMS.join("|")})\\b`, "i");

/** The state named in an act title, if any. */
export function stateOfAct(actTitle: string): IndianState | null {
  return STATE_PATTERNS.find(({ pattern }) => pattern.test(actTitle))?.state ?? null;
}

/** Whether an act is central legislation rather than any state's or region's. */
export function isCentralAct(actTitle: string): boolean {
  return stateOfAct(actTitle) === null && !REGIONAL_PATTERN.test(actTitle);
}

export function isIndianState(value: string): value is IndianState {
  return (INDIAN_STATES as readonly string[]).includes(value);
}

/**
 * Pick the hit to show. With a known state: that state's act, else a central
 * act, else nothing. Without one: a central act, else the first hit.
 */
export function pickForJurisdiction(
  hits: StatuteHit[],
  state: IndianState | null,
): StatuteHit | null {
  const own = state ? hits.find((hit) => stateOfAct(hit.act) === state) : undefined;
  if (own) return own;
  const central = hits.find((hit) => isCentralAct(hit.act));
  if (central) return central;
  return state ? null : (hits[0] ?? null);
}
