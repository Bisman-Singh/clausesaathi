"use client";

import { AtAGlance } from "@/components/analyze/at-a-glance";
import { useT } from "@/components/locale-provider";
import { Card } from "@/components/ui/card";
import type { Jurisdiction } from "@/app/api/analyze/route";
import type { AnalysisResult } from "@/lib/analysis/schemas";
import type { TranslationKey } from "@/lib/i18n";

const LAWS_KEY: Record<Jurisdiction["basis"], TranslationKey> = {
  user: "resultLawsUser",
  location: "resultLawsLocation",
  document: "resultLawsDocument",
  none: "resultLawsNone",
};

export interface BriefHeaderProps {
  result: AnalysisResult;
  jurisdiction: Jurisdiction;
}

/** Title plus the facts a reader should know before trusting the rest. */
export function BriefHeader({ result, jurisdiction }: BriefHeaderProps) {
  const t = useT();
  const { brief } = result;
  const laws = jurisdiction.state
    ? t(LAWS_KEY[jurisdiction.basis], { state: jurisdiction.state })
    : t("resultLawsNone");

  return (
    <Card className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-medium uppercase tracking-wide text-accent">
          {brief.documentType}
        </p>
        <h2 id="result-heading" tabIndex={-1} className="text-2xl font-bold sm:text-3xl">
          {t("resultHeading")}
        </h2>
      </header>
      <AtAGlance result={result} />
      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div>
          <dt className="inline font-medium">{t("resultParties")}: </dt>
          <dd className="inline">{brief.parties.join(", ")}</dd>
        </div>
        <div>
          <dt className="inline font-medium">{t("resultLaws")}: </dt>
          <dd className="inline">{laws}</dd>
        </div>
        <div>
          <dt className="inline font-medium">{t("resultModel")}: </dt>
          <dd className="inline text-muted">{result.model}</dd>
        </div>
        {result.droppedCitations > 0 ? (
          <div>
            <dt className="inline font-medium">{result.droppedCitations} </dt>
            <dd className="inline">{t("resultDropped")}</dd>
          </div>
        ) : null}
      </dl>
    </Card>
  );
}
