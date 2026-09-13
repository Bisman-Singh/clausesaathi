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

/** How each state is written in Hindi; the value sent to the server stays the English name. */
export const STATE_NAMES_HI: Record<IndianState, string> = {
  "Andhra Pradesh": "आंध्र प्रदेश",
  "Arunachal Pradesh": "अरुणाचल प्रदेश",
  Assam: "असम",
  Bihar: "बिहार",
  Chhattisgarh: "छत्तीसगढ़",
  Delhi: "दिल्ली",
  Goa: "गोवा",
  Gujarat: "गुजरात",
  Haryana: "हरियाणा",
  "Himachal Pradesh": "हिमाचल प्रदेश",
  "Jammu and Kashmir": "जम्मू और कश्मीर",
  Jharkhand: "झारखंड",
  Karnataka: "कर्नाटक",
  Kerala: "केरल",
  "Madhya Pradesh": "मध्य प्रदेश",
  Maharashtra: "महाराष्ट्र",
  Manipur: "मणिपुर",
  Meghalaya: "मेघालय",
  Mizoram: "मिज़ोरम",
  Nagaland: "नागालैंड",
  Odisha: "ओडिशा",
  Punjab: "पंजाब",
  Rajasthan: "राजस्थान",
  Sikkim: "सिक्किम",
  "Tamil Nadu": "तमिलनाडु",
  Telangana: "तेलंगाना",
  Tripura: "त्रिपुरा",
  "Uttar Pradesh": "उत्तर प्रदेश",
  Uttarakhand: "उत्तराखंड",
  "West Bengal": "पश्चिम बंगाल",
};

/** A state's name in the interface language. */
export function stateName(state: IndianState, locale: "en" | "hi"): string {
  return locale === "hi" ? STATE_NAMES_HI[state] : state;
}

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

/** Historical names that still head acts in force, and the state they belong to today. */
const OLD_NAMES: ReadonlyArray<[RegExp, IndianState]> = [
  [/\bBombay\b/i, "Maharashtra"],
  [/\bMadras\b/i, "Tamil Nadu"],
  [/\b(?:Calcutta|Bengal)\b/i, "West Bengal"],
  [/\bMysore\b/i, "Karnataka"],
  [/\bOrissa\b/i, "Odisha"],
  [/\bSaurashtra\b/i, "Gujarat"],
  [/\b(?:Travancore|Cochin)\b/i, "Kerala"],
  [/\b(?:Vindhya Pradesh|Madhya Bharat|Bhopal)\b/i, "Madhya Pradesh"],
  [/\bHyderabad\b/i, "Telangana"],
];

/** The state named in an act title, if any, old names included. */
export function stateOfAct(actTitle: string): IndianState | null {
  const named = STATE_PATTERNS.find(({ pattern }) => pattern.test(actTitle))?.state;
  if (named) return named;
  return OLD_NAMES.find(([pattern]) => pattern.test(actTitle))?.[1] ?? null;
}

/** Every state name that appears in a text, once per occurrence, with the matched words. */
export function stateMentions(text: string): Array<{ state: IndianState; match: string }> {
  return STATE_PATTERNS.flatMap(({ state, pattern }) =>
    [...text.matchAll(new RegExp(pattern.source, "gi"))].map(([match]) => ({ state, match })),
  );
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
