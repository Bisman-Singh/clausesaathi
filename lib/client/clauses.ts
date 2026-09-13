import type { Locale } from "@/lib/constants";
import type { ParsedDocument } from "@/lib/document/types";

/** DOM id of a clause's element, for citation links. */
export function clauseAnchor(clauseId: string): string {
  return `clause-${clauseId}`;
}

/** A short human label for a clause: its heading if it has one, else its number. */
export function clauseLabel(document: ParsedDocument, clauseId: string, locale: Locale): string {
  const clause = document.clauses.find((item) => item.id === clauseId);
  const number = clause ? clause.index + 1 : Number(clauseId.slice(1));
  if (clause?.heading) return clause.heading;
  return locale === "hi" ? `धारा ${number}` : `Clause ${number}`;
}
