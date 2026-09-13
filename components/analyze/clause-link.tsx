"use client";

import { useLocale, useT } from "@/components/locale-provider";
import { clauseAnchor, clauseLabel } from "@/lib/client/clauses";
import type { ParsedDocument } from "@/lib/document/types";

export interface ClauseLinkProps {
  document: ParsedDocument;
  clauseId: string;
}

/** An in-page citation: jumps to the clause the statement came from. */
export function ClauseLink({ document, clauseId }: ClauseLinkProps) {
  const t = useT();
  const { locale } = useLocale();
  const label = clauseLabel(document, clauseId, locale);
  return (
    <a
      href={`#${clauseAnchor(clauseId)}`}
      className="inline-block rounded bg-info-bg px-1.5 py-0.5 text-sm text-info-text no-underline hover:underline"
      aria-label={`${t("clauseLink")}: ${label}`}
    >
      {label}
    </a>
  );
}

export function ClauseLinks({
  document,
  clauseIds,
}: {
  document: ParsedDocument;
  clauseIds: string[];
}) {
  if (clauseIds.length === 0) return null;
  return (
    <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
      {clauseIds.map((clauseId) => (
        <ClauseLink key={clauseId} document={document} clauseId={clauseId} />
      ))}
    </span>
  );
}
