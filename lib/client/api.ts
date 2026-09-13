import type { AnalysisResult } from "@/lib/analysis/schemas";
import type { ClauseChange, ClauseChangeKind } from "@/lib/compare/diff";
import type { ChangeExplanation } from "@/lib/compare/explain";
import type { ParsedDocument } from "@/lib/document/types";
import type { TranslationKey } from "@/lib/i18n";

/**
 * Browser-side API client. Errors carry the server's stable code so the UI
 * can show the right translated message, never a raw server string.
 */

export class ApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
  ) {
    super(code);
    this.name = "ApiError";
  }
}

export interface AnalyzeResponse {
  document: ParsedDocument;
  result: AnalysisResult;
}

export interface CompareResponse {
  changes: ClauseChange[];
  explanations: ChangeExplanation[];
  summary: Record<ClauseChangeKind, number>;
  model: string;
}

const ERROR_KEYS: Record<string, TranslationKey> = {
  too_short: "errorTooShort",
  too_long: "errorTooLong",
  pdf_too_large: "errorPdfTooLarge",
  pdf_too_many_pages: "errorPdfTooManyPages",
  pdf_no_text: "errorPdfNoText",
  pdf_unreadable: "errorPdfUnreadable",
  rate_limited: "errorRateLimited",
  ai_unavailable: "errorAiUnavailable",
};

/** The translation key for an error, generic when the code is unknown. */
export function errorKeyFor(error: unknown): TranslationKey {
  if (error instanceof ApiError) return ERROR_KEYS[error.code] ?? "errorGeneric";
  return "errorGeneric";
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new ApiError(body.error ?? "unknown", response.status);
  return body as T;
}

export interface AnalyzeParams {
  text?: string;
  file?: File | null;
  situation: string;
  locale: string;
  state: string;
}

export async function analyze(params: AnalyzeParams): Promise<AnalyzeResponse> {
  if (params.file) {
    const form = new FormData();
    form.append("file", params.file);
    form.append("situation", params.situation);
    form.append("locale", params.locale);
    form.append("state", params.state);
    return parseResponse(await fetch("/api/analyze", { method: "POST", body: form }));
  }
  return parseResponse(
    await fetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: params.text ?? "",
        situation: params.situation,
        locale: params.locale,
        state: params.state,
      }),
    }),
  );
}

export async function compare(
  before: string,
  after: string,
  locale: string,
): Promise<CompareResponse> {
  return parseResponse(
    await fetch("/api/compare", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ before, after, locale }),
    }),
  );
}
