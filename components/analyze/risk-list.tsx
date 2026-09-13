"use client";

import { useT } from "@/components/locale-provider";
import { ClauseLink } from "@/components/analyze/clause-link";
import type { RiskWithStatute, Severity } from "@/lib/analysis/schemas";
import type { ParsedDocument } from "@/lib/document/types";
import type { TranslationKey } from "@/lib/i18n";

const SEVERITY_STYLE: Record<Severity, string> = {
  low: "bg-info-bg text-info-text",
  medium: "bg-warn-bg text-warn-text",
  high: "bg-danger-bg text-danger-text",
};

const SEVERITY_KEY: Record<Severity, TranslationKey> = {
  low: "severityLow",
  medium: "severityMedium",
  high: "severityHigh",
};

export interface RiskListProps {
  document: ParsedDocument;
  risks: RiskWithStatute[];
}

/** Risks, each tied to its clause and, when found, to the governing statute. */
export function RiskList({ document, risks }: RiskListProps) {
  const t = useT();
  return (
    <ul className="flex flex-col gap-3">
      {risks.map((risk, index) => (
        <li
          key={`${risk.clauseId}-${index}`}
          className="rounded-md border border-line bg-surface p-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-sm font-medium ${SEVERITY_STYLE[risk.severity]}`}
            >
              {t(SEVERITY_KEY[risk.severity])}
            </span>
            <h3 className="font-semibold">{risk.title}</h3>
            <ClauseLink document={document} clauseId={risk.clauseId} />
          </div>
          <p className="mt-2">{risk.explanation}</p>
          {risk.statute ? (
            <p className="mt-2 text-sm">
              <span className="font-medium">{t("statuteLabel")}:</span> {risk.statute.act},{" "}
              {risk.statute.title}.{" "}
              <a href={risk.statute.url} rel="noopener">
                {t("statuteSource")}
              </a>
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
