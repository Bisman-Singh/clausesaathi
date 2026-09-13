"use client";

import { Suspense, lazy, useSyncExternalStore } from "react";
import { BriefHeader } from "@/components/analyze/brief-header";
import { Checklist } from "@/components/analyze/checklist";
import { ClauseList } from "@/components/analyze/clause-list";
import { ClauseLink, ClauseLinks } from "@/components/analyze/clause-link";
import { LegalAidPanel } from "@/components/analyze/legal-aid-panel";
import { ResultNav } from "@/components/analyze/result-nav";
import { RiskList } from "@/components/analyze/risk-list";
import { SimpleList } from "@/components/analyze/simple-list";
import { Timeline } from "@/components/analyze/timeline";
import { useT } from "@/components/locale-provider";
import { Section } from "@/components/ui/section";
import type { Jurisdiction } from "@/lib/statute/resolve";
import type { AnalysisResult } from "@/lib/analysis/schemas";
import type { ParsedDocument } from "@/lib/document/types";
import type { TranslationKey } from "@/lib/i18n";

/**
 * The Q&A panel brings the chat transport and its schema library with it, so
 * it is fetched only in the browser and only once there is a result to ask
 * about. A plain `lazy` import keeps that chunk out of the page's script list,
 * which `next/dynamic` would add it to.
 */
const AskPanel = lazy(() =>
  import("@/components/analyze/ask-panel").then((module) => ({ default: module.AskPanel })),
);

const noop = () => () => undefined;

/** True after hydration; false during server rendering and the first client render. */
function useIsClient(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

function AskSection(props: { documentText: string; document: ParsedDocument; state: string }) {
  const isClient = useIsClient();
  const placeholder = <div aria-hidden="true" className="skeleton h-11 w-full" />;
  if (!isClient) return placeholder;
  return (
    <Suspense fallback={placeholder}>
      <AskPanel {...props} />
    </Suspense>
  );
}

export interface AnalysisViewProps {
  document: ParsedDocument;
  result: AnalysisResult;
  jurisdiction: Jurisdiction;
  documentText: string;
  state: string;
  today: string;
}

/** The sections in page order, each with whether the brief has anything for it. */
export function presentSections(
  brief: AnalysisResult["brief"],
): Array<{ id: string; key: TranslationKey }> {
  const all: Array<{ id: string; key: TranslationKey; show: boolean }> = [
    { id: "summary", key: "sectionSummary", show: true },
    { id: "key-terms", key: "sectionKeyTerms", show: brief.keyTerms.length > 0 },
    { id: "obligations", key: "sectionObligations", show: brief.obligations.length > 0 },
    { id: "risks", key: "sectionRisks", show: brief.risks.length > 0 },
    {
      id: "inconsistencies",
      key: "sectionInconsistencies",
      show: brief.inconsistencies.length > 0,
    },
    { id: "next-steps", key: "sectionNextSteps", show: brief.nextSteps.length > 0 },
    { id: "questions", key: "sectionQuestions", show: brief.questionsForLawyer.length > 0 },
    { id: "checklist", key: "sectionChecklist", show: brief.checklist.length > 0 },
    { id: "legal-aid", key: "sectionLegalAid", show: true },
    { id: "ask", key: "sectionAsk", show: true },
    { id: "clauses", key: "sectionClauses", show: true },
  ];
  return all.filter((section) => section.show).map(({ id, key }) => ({ id, key }));
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
    <article className="flex flex-col gap-8">
      <BriefHeader result={result} jurisdiction={jurisdiction} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="flex flex-col gap-10">
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
          <KeyTerms document={document} terms={brief.keyTerms} />
          {brief.obligations.length > 0 ? (
            <Section id="obligations" title={t("sectionObligations")}>
              <Timeline document={document} obligations={brief.obligations} today={today} />
            </Section>
          ) : null}
          {brief.risks.length > 0 ? (
            <Section id="risks" title={t("sectionRisks")}>
              <RiskList document={document} risks={brief.risks} state={jurisdiction.state} />
            </Section>
          ) : null}
          <Inconsistencies document={document} items={brief.inconsistencies} />
          <SimpleList id="next-steps" title={t("sectionNextSteps")} items={brief.nextSteps} />
          <SimpleList
            id="questions"
            title={t("sectionQuestions")}
            items={brief.questionsForLawyer}
          />
          <Checklist id="checklist" title={t("sectionChecklist")} items={brief.checklist} />
          <Section id="legal-aid" title={t("sectionLegalAid")}>
            <LegalAidPanel />
          </Section>
          <Section id="ask" title={t("sectionAsk")}>
            <AskSection documentText={documentText} document={document} state={state} />
          </Section>
          <Section id="clauses" title={t("sectionClauses")}>
            <ClauseList document={document} />
          </Section>
        </div>
        <ResultNav sections={presentSections(brief)} />
      </div>
    </article>
  );
}

function KeyTerms({
  document,
  terms,
}: {
  document: ParsedDocument;
  terms: AnalysisResult["brief"]["keyTerms"];
}) {
  const t = useT();
  if (terms.length === 0) return null;
  return (
    <Section id="key-terms" title={t("sectionKeyTerms")}>
      <dl className="grid gap-3 sm:grid-cols-2">
        {terms.map((term, index) => (
          <div key={index} className="rounded-lg border border-line bg-surface p-3">
            <dt className="font-medium">
              {term.term} <ClauseLink document={document} clauseId={term.clauseId} />
            </dt>
            <dd className="mt-1 text-sm">{term.meaning}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

function Inconsistencies({
  document,
  items,
}: {
  document: ParsedDocument;
  items: AnalysisResult["brief"]["inconsistencies"];
}) {
  const t = useT();
  if (items.length === 0) return null;
  return (
    <Section id="inconsistencies" title={t("sectionInconsistencies")}>
      <ul className="flex list-disc flex-col gap-2 pl-5">
        {items.map((item, index) => (
          <li key={index}>
            {item.description}
            <ClauseLinks document={document} clauseIds={item.clauseIds} />
          </li>
        ))}
      </ul>
    </Section>
  );
}
