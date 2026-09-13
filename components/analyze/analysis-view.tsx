"use client";

import { AskPanel } from "@/components/analyze/ask-panel";
import { BriefHeader } from "@/components/analyze/brief-header";
import { ClauseList } from "@/components/analyze/clause-list";
import { ClauseLink, ClauseLinks } from "@/components/analyze/clause-link";
import { LegalAidPanel } from "@/components/analyze/legal-aid-panel";
import { RiskList } from "@/components/analyze/risk-list";
import { SimpleList } from "@/components/analyze/simple-list";
import { Timeline } from "@/components/analyze/timeline";
import { useT } from "@/components/locale-provider";
import { Section } from "@/components/ui/section";
import type { Jurisdiction } from "@/app/api/analyze/route";
import type { AnalysisResult } from "@/lib/analysis/schemas";
import type { ParsedDocument } from "@/lib/document/types";

export interface AnalysisViewProps {
  document: ParsedDocument;
  result: AnalysisResult;
  jurisdiction: Jurisdiction;
  documentText: string;
  state: string;
  today: string;
}

/** The full brief, section by section, every claim linked to its clause. */
export function AnalysisView({
  document,
  result,
  jurisdiction,
  documentText,
  state,
  today,
}: AnalysisViewProps) {
  const t = useT();
  const { brief } = result;

  return (
    <article className="flex flex-col gap-10">
      <BriefHeader result={result} jurisdiction={jurisdiction} />

      <Section id="summary" title={t("sectionSummary")}>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          {brief.summary.map((point, index) => (
            <li key={index}>
              {point.text}
              <ClauseLinks document={document} clauseIds={point.clauseIds} />
            </li>
          ))}
        </ul>
      </Section>

      {brief.keyTerms.length > 0 ? (
        <Section id="key-terms" title={t("sectionKeyTerms")}>
          <dl className="flex flex-col gap-2">
            {brief.keyTerms.map((term, index) => (
              <div key={index}>
                <dt className="font-medium">
                  {term.term} <ClauseLink document={document} clauseId={term.clauseId} />
                </dt>
                <dd>{term.meaning}</dd>
              </div>
            ))}
          </dl>
        </Section>
      ) : null}

      {brief.obligations.length > 0 ? (
        <Section id="obligations" title={t("sectionObligations")}>
          <Timeline document={document} obligations={brief.obligations} today={today} />
        </Section>
      ) : null}

      {brief.risks.length > 0 ? (
        <Section id="risks" title={t("sectionRisks")}>
          <RiskList document={document} risks={brief.risks} />
        </Section>
      ) : null}

      {brief.inconsistencies.length > 0 ? (
        <Section id="inconsistencies" title={t("sectionInconsistencies")}>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            {brief.inconsistencies.map((item, index) => (
              <li key={index}>
                {item.description}
                <ClauseLinks document={document} clauseIds={item.clauseIds} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <SimpleList id="next-steps" title={t("sectionNextSteps")} items={brief.nextSteps} />
      <SimpleList id="questions" title={t("sectionQuestions")} items={brief.questionsForLawyer} />
      <SimpleList
        id="checklist"
        title={t("sectionChecklist")}
        items={brief.checklist}
        ordered={false}
      />

      <Section id="legal-aid" title={t("sectionLegalAid")}>
        <LegalAidPanel />
      </Section>

      <Section id="ask" title={t("sectionAsk")}>
        <AskPanel documentText={documentText} document={document} state={state} />
      </Section>

      <Section id="clauses" title={t("sectionClauses")}>
        <ClauseList document={document} />
      </Section>
    </article>
  );
}
