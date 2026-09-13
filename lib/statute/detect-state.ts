import { stateMentions, type IndianState } from "@/lib/statute/jurisdiction";

/**
 * Guessing the state a document belongs to from what it says.
 *
 * A rent agreement names the flat's city and PIN code; an offer letter names
 * the office. The guess is only ever a suggestion: the form shows it with its
 * evidence so the user can change it, and nothing is inferred from IP or
 * browser locale, because a wrong state means the wrong Rent Act.
 */

export interface DetectedState {
  state: IndianState;
  /** The words in the document that led to the guess, shown to the user. */
  evidence: string;
}

/** Weight of each kind of evidence; an explicit state name beats a city. */
const WEIGHT = { state: 3, pin: 2, city: 1 } as const;

/** Major cities and older spellings, each unambiguous about its state. */
const CITIES: Record<string, IndianState> = {
  Bengaluru: "Karnataka",
  Bangalore: "Karnataka",
  Mysuru: "Karnataka",
  Mysore: "Karnataka",
  Mangaluru: "Karnataka",
  Hubballi: "Karnataka",
  Mumbai: "Maharashtra",
  Bombay: "Maharashtra",
  Pune: "Maharashtra",
  Nagpur: "Maharashtra",
  Thane: "Maharashtra",
  Nashik: "Maharashtra",
  "Navi Mumbai": "Maharashtra",
  "New Delhi": "Delhi",
  Chennai: "Tamil Nadu",
  Madras: "Tamil Nadu",
  Coimbatore: "Tamil Nadu",
  Madurai: "Tamil Nadu",
  Hyderabad: "Telangana",
  Secunderabad: "Telangana",
  Kolkata: "West Bengal",
  Calcutta: "West Bengal",
  Howrah: "West Bengal",
  Ahmedabad: "Gujarat",
  Surat: "Gujarat",
  Vadodara: "Gujarat",
  Rajkot: "Gujarat",
  Gandhinagar: "Gujarat",
  Jaipur: "Rajasthan",
  Jodhpur: "Rajasthan",
  Udaipur: "Rajasthan",
  Kota: "Rajasthan",
  Lucknow: "Uttar Pradesh",
  Noida: "Uttar Pradesh",
  Ghaziabad: "Uttar Pradesh",
  Kanpur: "Uttar Pradesh",
  Varanasi: "Uttar Pradesh",
  Agra: "Uttar Pradesh",
  Gurugram: "Haryana",
  Gurgaon: "Haryana",
  Faridabad: "Haryana",
  Bhopal: "Madhya Pradesh",
  Indore: "Madhya Pradesh",
  Patna: "Bihar",
  Kochi: "Kerala",
  Cochin: "Kerala",
  Thiruvananthapuram: "Kerala",
  Trivandrum: "Kerala",
  Kozhikode: "Kerala",
  Bhubaneswar: "Odisha",
  Cuttack: "Odisha",
  Guwahati: "Assam",
  Ranchi: "Jharkhand",
  Jamshedpur: "Jharkhand",
  Raipur: "Chhattisgarh",
  Dehradun: "Uttarakhand",
  Shimla: "Himachal Pradesh",
  Ludhiana: "Punjab",
  Amritsar: "Punjab",
  Mohali: "Punjab",
  Panaji: "Goa",
  Margao: "Goa",
  Visakhapatnam: "Andhra Pradesh",
  Vijayawada: "Andhra Pradesh",
  Tirupati: "Andhra Pradesh",
  Srinagar: "Jammu and Kashmir",
  Imphal: "Manipur",
  Shillong: "Meghalaya",
  Aizawl: "Mizoram",
  Kohima: "Nagaland",
  Gangtok: "Sikkim",
  Agartala: "Tripura",
  Itanagar: "Arunachal Pradesh",
};

/**
 * PIN code prefixes that belong to exactly one state. Prefixes shared by two
 * states (24 and 26 for UP and Uttarakhand, 81 to 85 for Bihar and Jharkhand,
 * 79 across the north-east) are left out on purpose.
 */
const PIN_PREFIXES: Record<string, IndianState> = {
  "11": "Delhi",
  "12": "Haryana",
  "13": "Haryana",
  "14": "Punjab",
  "15": "Punjab",
  "17": "Himachal Pradesh",
  "18": "Jammu and Kashmir",
  "19": "Jammu and Kashmir",
  "20": "Uttar Pradesh",
  "21": "Uttar Pradesh",
  "22": "Uttar Pradesh",
  "23": "Uttar Pradesh",
  "25": "Uttar Pradesh",
  "27": "Uttar Pradesh",
  "28": "Uttar Pradesh",
  "30": "Rajasthan",
  "31": "Rajasthan",
  "32": "Rajasthan",
  "33": "Rajasthan",
  "34": "Rajasthan",
  "36": "Gujarat",
  "37": "Gujarat",
  "38": "Gujarat",
  "39": "Gujarat",
  "403": "Goa",
  "40": "Maharashtra",
  "41": "Maharashtra",
  "42": "Maharashtra",
  "43": "Maharashtra",
  "44": "Maharashtra",
  "45": "Madhya Pradesh",
  "46": "Madhya Pradesh",
  "47": "Madhya Pradesh",
  "48": "Madhya Pradesh",
  "49": "Chhattisgarh",
  "50": "Telangana",
  "51": "Andhra Pradesh",
  "52": "Andhra Pradesh",
  "53": "Andhra Pradesh",
  "56": "Karnataka",
  "57": "Karnataka",
  "58": "Karnataka",
  "59": "Karnataka",
  "60": "Tamil Nadu",
  "61": "Tamil Nadu",
  "62": "Tamil Nadu",
  "63": "Tamil Nadu",
  "64": "Tamil Nadu",
  "67": "Kerala",
  "68": "Kerala",
  "69": "Kerala",
  "70": "West Bengal",
  "71": "West Bengal",
  "72": "West Bengal",
  "73": "West Bengal",
  "74": "West Bengal",
  "75": "Odisha",
  "76": "Odisha",
  "77": "Odisha",
  "78": "Assam",
  "80": "Bihar",
};

const CITY_PATTERNS = Object.entries(CITIES).map(([city, state]) => ({
  state,
  pattern: new RegExp(`\\b${city.replace(/ /g, "\\s+")}\\b`, "gi"),
}));
const PIN_PATTERN = /\b[1-9]\d{5}\b/g;
/** A six-digit number written as money is an amount, not a PIN code. */
const AMOUNT_BEFORE = /(?:₹|rs\.?|inr|rupees?)\s*$/i;
const AMOUNT_AFTER = /^\s*(?:\/-|rupees?|only)/i;

function looksLikeAmount(text: string, index: number, length: number): boolean {
  return (
    AMOUNT_BEFORE.test(text.slice(Math.max(0, index - 12), index)) ||
    AMOUNT_AFTER.test(text.slice(index + length, index + length + 8))
  );
}

interface Evidence {
  state: IndianState;
  weight: number;
  text: string;
}

/** The state a PIN code belongs to, longest known prefix first. */
export function stateOfPin(pin: string): IndianState | null {
  return PIN_PREFIXES[pin.slice(0, 3)] ?? PIN_PREFIXES[pin.slice(0, 2)] ?? null;
}

function collect(text: string): Evidence[] {
  const found: Evidence[] = stateMentions(text).map(({ state, match }) => ({
    state,
    weight: WEIGHT.state,
    text: match,
  }));
  for (const match of text.matchAll(PIN_PATTERN)) {
    const [pin] = match;
    const state = looksLikeAmount(text, match.index, pin.length) ? null : stateOfPin(pin);
    if (state) found.push({ state, weight: WEIGHT.pin, text: pin });
  }
  for (const { state, pattern } of CITY_PATTERNS) {
    for (const [match] of text.matchAll(pattern)) {
      found.push({ state, weight: WEIGHT.city, text: match });
    }
  }
  return found;
}

/**
 * The state the document most likely belongs to, with the strongest piece of
 * evidence for it, or null when nothing points anywhere or two states tie.
 */
export function detectState(text: string): DetectedState | null {
  // collect() yields evidence strongest first, so the first item per state is its best.
  const byState = new Map<IndianState, { score: number; evidence: string }>();
  for (const item of collect(text)) {
    const entry = byState.get(item.state);
    if (entry) entry.score += item.weight;
    else byState.set(item.state, { score: item.weight, evidence: item.text });
  }
  const [best, second] = [...byState.entries()].sort((a, b) => b[1].score - a[1].score);
  if (!best || (second && second[1].score === best[1].score)) return null;
  return { state: best[0], evidence: best[1].evidence };
}
