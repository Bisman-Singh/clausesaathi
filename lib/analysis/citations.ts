import type { DocumentBrief } from "@/lib/analysis/schemas";

/**
 * Citation verification.
 *
 * The model is told which clause ids exist, but it can still make one up. A
 * fabricated citation would send the reader to nothing, so every id is checked
 * against the parsed document. Items whose only anchor is invalid are dropped;
 * items with several anchors keep the valid ones. The count of dropped ids is
 * reported so the UI can say so honestly.
 */

export interface VerifiedBrief {
  brief: DocumentBrief;
  dropped: number;
}

export function verifyCitations(
  brief: DocumentBrief,
  validIds: ReadonlySet<string>,
): VerifiedBrief {
  let dropped = 0;
  const keepIds = (ids: string[]): string[] => {
    const kept = ids.filter((id) => validIds.has(id));
    dropped += ids.length - kept.length;
    return kept;
  };
  const isValid = (id: string): boolean => {
    if (validIds.has(id)) return true;
    dropped += 1;
    return false;
  };

  const summary = brief.summary.map((point) => ({ ...point, clauseIds: keepIds(point.clauseIds) }));
  const inconsistencies = brief.inconsistencies
    .map((item) => ({ ...item, clauseIds: keepIds(item.clauseIds) }))
    .filter((item) => item.clauseIds.length > 0);

  return {
    brief: {
      ...brief,
      summary,
      keyTerms: brief.keyTerms.filter((term) => isValid(term.clauseId)),
      obligations: brief.obligations.filter((item) => isValid(item.clauseId)),
      risks: brief.risks.filter((risk) => isValid(risk.clauseId)),
      inconsistencies,
    },
    dropped,
  };
}
