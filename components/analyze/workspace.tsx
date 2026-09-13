"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnalysisView } from "@/components/analyze/analysis-view";
import { DocumentForm, type DocumentFormValues } from "@/components/analyze/document-form";
import { Hero } from "@/components/analyze/hero";
import { ResultSkeleton } from "@/components/analyze/skeleton";
import { useLocale, useT } from "@/components/locale-provider";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import {
  readAnalysis,
  readAnalysisOnServer,
  subscribeAnalysis,
  writeAnalysis,
} from "@/lib/client/analysis-store";
import { analyze, errorKeyFor, type AnalyzeResponse } from "@/lib/client/api";
import { shrinkImage } from "@/lib/client/image";
import type { TranslationKey } from "@/lib/i18n";

/** What is kept for the session: the response plus what produced it. */
export interface StoredAnalysis {
  response: AnalyzeResponse;
  documentText: string;
  state: string;
}

export function isStoredAnalysis(value: unknown): value is StoredAnalysis {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<StoredAnalysis>;
  return (
    typeof candidate.documentText === "string" &&
    typeof candidate.state === "string" &&
    typeof candidate.response === "object" &&
    candidate.response !== null &&
    Array.isArray(candidate.response.document?.clauses)
  );
}

/** Today's date in the user's own time zone, as the deadline arithmetic expects it. */
export function todayIso(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Text to answer questions against when the document came from a PDF. */
export function textFromClauses(response: AnalyzeResponse): string {
  return response.document.clauses
    .map((clause) => [clause.heading, clause.text].filter(Boolean).join("\n"))
    .join("\n\n");
}

const getSnapshot = () => readAnalysis(isStoredAnalysis);

/** The home page: hero, form card, then the result with focus moved to it on arrival. */
export function AnalyzeWorkspace() {
  const t = useT();
  const { locale } = useLocale();
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const analysis = useSyncExternalStore(subscribeAnalysis, getSnapshot, readAnalysisOnServer);
  const resultRef = useRef<HTMLDivElement>(null);
  // Focus moves to the result only when one has just arrived, never on a restored page.
  const justArrived = useRef(false);

  useEffect(() => {
    if (analysis && !busy && justArrived.current) {
      justArrived.current = false;
      resultRef.current?.querySelector<HTMLElement>("#result-heading")?.focus();
    }
  }, [analysis, busy]);

  async function handleSubmit(values: DocumentFormValues) {
    setBusy(true);
    setErrorKey(null);
    try {
      const file = values.file ? await shrinkImage(values.file) : null;
      const response = await analyze({ ...values, file, locale });
      const documentText = values.file ? textFromClauses(response) : values.text;
      const state = response.jurisdiction.state ?? "";
      justArrived.current = true;
      writeAnalysis({ response, documentText, state } satisfies StoredAnalysis);
    } catch (error) {
      setErrorKey(errorKeyFor(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="print:hidden">
        <Hero />
      </div>
      <section aria-labelledby="form-heading" className="flex flex-col gap-4 print:hidden">
        <h2 id="form-heading" className="text-2xl font-bold">
          {t("formHeading")}
        </h2>
        <Card>
          <DocumentForm busy={busy} onSubmit={handleSubmit} />
        </Card>
        {busy ? (
          <>
            <Alert>{t("formSubmitting")}</Alert>
            <ResultSkeleton />
          </>
        ) : null}
        {errorKey ? (
          <Alert tone="danger" role="alert">
            {t(errorKey)}
          </Alert>
        ) : null}
      </section>

      {analysis ? (
        <div
          ref={resultRef}
          key={`${analysis.response.document.charCount}:${analysis.documentText.slice(0, 64)}`}
          className="result-enter flex flex-col gap-6"
        >
          {analysis.response.source === "transcription" ? (
            <Alert tone="warn">{t("noticeTranscribed")}</Alert>
          ) : null}
          <AnalysisView
            document={analysis.response.document}
            result={analysis.response.result}
            jurisdiction={analysis.response.jurisdiction}
            documentText={analysis.documentText}
            state={analysis.state}
            today={todayIso()}
          />
        </div>
      ) : null}
    </div>
  );
}
