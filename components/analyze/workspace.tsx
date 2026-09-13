"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnalysisView } from "@/components/analyze/analysis-view";
import { DocumentForm, type DocumentFormValues } from "@/components/analyze/document-form";
import { useLocale, useT } from "@/components/locale-provider";
import { Alert } from "@/components/ui/alert";
import {
  readAnalysis,
  readAnalysisOnServer,
  subscribeAnalysis,
  writeAnalysis,
} from "@/lib/client/analysis-store";
import { analyze, errorKeyFor, type AnalyzeResponse } from "@/lib/client/api";
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

/** Today's date as the deadline arithmetic expects it. */
export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Text to answer questions against when the document came from a PDF. */
export function textFromClauses(response: AnalyzeResponse): string {
  return response.document.clauses
    .map((clause) => [clause.heading, clause.text].filter(Boolean).join("\n"))
    .join("\n\n");
}

const getSnapshot = () => readAnalysis(isStoredAnalysis);

/** The home page: form on top, results below, focus moved to them on arrival. */
export function AnalyzeWorkspace() {
  const t = useT();
  const { locale } = useLocale();
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const analysis = useSyncExternalStore(subscribeAnalysis, getSnapshot, readAnalysisOnServer);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (analysis && !busy)
      resultRef.current?.querySelector<HTMLElement>("#result-heading")?.focus();
  }, [analysis, busy]);

  async function handleSubmit(values: DocumentFormValues) {
    setBusy(true);
    setErrorKey(null);
    try {
      const response = await analyze({ ...values, locale });
      const documentText = values.file ? textFromClauses(response) : values.text;
      const state = response.jurisdiction.state ?? "";
      writeAnalysis({ response, documentText, state } satisfies StoredAnalysis);
    } catch (error) {
      setErrorKey(errorKeyFor(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="form-heading" className="flex flex-col gap-4">
        <h1 id="form-heading" className="text-2xl font-bold">
          {t("formHeading")}
        </h1>
        <p className="text-muted">{t("tagline")}</p>
        <DocumentForm busy={busy} onSubmit={handleSubmit} />
        {busy ? <Alert>{t("formSubmitting")}</Alert> : null}
        {errorKey ? (
          <Alert tone="danger" role="alert">
            {t(errorKey)}
          </Alert>
        ) : null}
      </section>

      {analysis ? (
        <div ref={resultRef} className="flex flex-col gap-6">
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
