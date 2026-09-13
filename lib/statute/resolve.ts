import { detectState } from "@/lib/statute/detect-state";
import type { IndianState } from "@/lib/statute/jurisdiction";

/** How the client arrived at the state it sent, or that it deliberately sent none. */
export type StateBasis = "user" | "location" | "none";

/** Which state's laws were preferred and why: the user, their location, the document, or nobody. */
export interface Jurisdiction {
  state: IndianState | null;
  basis: StateBasis | "document";
}

/**
 * A state the client sent wins. A client that says "none" opted out of any
 * guess. Otherwise the document's own city, PIN code or state name decides.
 */
export function resolveJurisdiction(
  chosen: IndianState | null,
  text: string,
  basis: StateBasis = "user",
): Jurisdiction {
  if (chosen) return { state: chosen, basis };
  if (basis === "none") return { state: null, basis: "none" };
  const detected = detectState(text);
  return detected ? { state: detected.state, basis: "document" } : { state: null, basis: "none" };
}
