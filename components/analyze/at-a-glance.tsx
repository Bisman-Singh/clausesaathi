"use client";

import { useT } from "@/components/locale-provider";
import type { AnalysisResult, Severity } from "@/lib/analysis/schemas";
import type { TranslationKey } from "@/lib/i18n";

const SEVERITY_KEY: Record<Severity, TranslationKey> = {
  low: "severityLow",
  medium: "severityMedium",
  high: "severityHigh",
};

const SEVERITY_STYLE: Record<Severity, string> = {
  low: "bg-info-bg text-info-text",
  medium: "bg-warn-bg text-warn-text",
  high: "bg-danger-bg text-danger-text",
};

/** Counts that tell the reader how much attention the document needs. */
export function AtAGlance({ result }: { result: AnalysisResult }) {
  const t = useT();
  const { brief } = result;
  const bySeverity = { high: 0, medium: 0, low: 0 };
  for (const risk of brief.risks) bySeverity[risk.severity] += 1;
  const severities = (["high", "medium", "low"] as const).filter((s) => bySeverity[s] > 0);

  return (
    <ul className="flex flex-wrap gap-2 text-sm" aria-label={t("glanceLabel")}>
      {severities.map((severity) => (
        <li
          key={severity}
          className={`rounded-full px-3 py-1 font-medium ${SEVERITY_STYLE[severity]}`}
        >
          {t("glanceRisks", {
            n: bySeverity[severity],
            level: t(SEVERITY_KEY[severity]),
          })}
        </li>
      ))}
      <li className="rounded-full bg-surface-2 px-3 py-1">
        {t("glanceObligations", { n: brief.obligations.length })}
      </li>
      <li className="rounded-full bg-surface-2 px-3 py-1">
        {t("glanceQuestions", { n: brief.questionsForLawyer.length })}
      </li>
    </ul>
  );
}
