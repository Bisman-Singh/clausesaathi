import type { StatuteHit } from "@/lib/statute/indiacode";

/**
 * Keeping statute hits on topic.
 *
 * IndiaCode's search is lexical, so "security deposit forfeiture" can surface
 * the Banning of Unregulated Deposit Schemes Act for a rent agreement. The
 * document type tells us which family of acts is plausible; hits from that
 * family win, and only when there are none does the raw ranking stand.
 */

interface Domain {
  /** Matched against the model's documentType, case-insensitively. */
  pattern: RegExp;
  /** Words that appear in the titles of acts that govern this kind of document. */
  actTerms: string[];
}

const DOMAINS: Domain[] = [
  {
    pattern: /rent|lease|tenan|leave and licen|landlord|premises/i,
    actTerms: ["Rent", "Tenancy", "Lease", "Transfer of Property", "Contract", "Buildings"],
  },
  {
    pattern: /employ|offer|appointment|job|service agreement|internship|contractor/i,
    actTerms: [
      "Industrial",
      "Wages",
      "Employment",
      "Gratuity",
      "Shops and Establishments",
      "Labour",
      "Standing Orders",
      "Provident Fund",
      "Maternity",
      "Sexual Harassment",
      "Bonus",
      "Contract",
    ],
  },
  {
    pattern: /consumer|member|subscription|terms|warranty|purchase|sale|service|policy|gym/i,
    actTerms: [
      "Consumer",
      "Contract",
      "Sale of Goods",
      "Information Technology",
      "Digital Personal Data",
    ],
  },
  {
    pattern: /loan|credit|mortgage|guarantee|finance/i,
    actTerms: [
      "Contract",
      "Banking",
      "Recovery",
      "Securitisation",
      "Negotiable Instruments",
      "Money",
    ],
  },
];

/** Act-title words that fit the kind of document, or none when the type is unfamiliar. */
export function domainHints(documentType: string): string[] {
  return DOMAINS.filter((domain) => domain.pattern.test(documentType)).flatMap(
    (domain) => domain.actTerms,
  );
}

/** Hits whose act belongs to the document's domain, or every hit when none does. */
export function preferRelevant(hits: StatuteHit[], hints: string[]): StatuteHit[] {
  if (hints.length === 0) return hits;
  const relevant = hits.filter((hit) =>
    hints.some((term) => hit.act.toLowerCase().includes(term.toLowerCase())),
  );
  return relevant.length > 0 ? relevant : hits;
}
