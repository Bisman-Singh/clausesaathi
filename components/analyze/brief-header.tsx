"use client";

import { useT } from "@/components/locale-provider";
import type { AnalysisResult } from "@/lib/analysis/schemas";

/** Title plus the facts a reader should know before trusting the rest. */
export function BriefHeader({ result }: { result: AnalysisResult }) {
  const t = useT();
  const { brief } = result;
  return (
    <header className="flex flex-col gap-2">
      <h1 id="result-heading" tabIndex={-1} className="text-2xl font-bold">
        {t("resultHeading")}
      </h1>
      <dl className="grid gap-1 text-sm sm:grid-cols-2">
        <div>
          <dt className="inline font-medium">{t("resultType")}: </dt>
          <dd className="inline">{brief.documentType}</dd>
        </div>
        <div>
          <dt className="inline font-medium">{t("resultParties")}: </dt>
          <dd className="inline">{brief.parties.join(", ")}</dd>
        </div>
        <div>
          <dt className="inline font-medium">{t("resultModel")}: </dt>
          <dd className="inline">{result.model}</dd>
        </div>
        {result.droppedCitations > 0 ? (
          <div>
            <dt className="inline font-medium">{result.droppedCitations} </dt>
            <dd className="inline">{t("resultDropped")}</dd>
          </div>
        ) : null}
      </dl>
    </header>
  );
}
