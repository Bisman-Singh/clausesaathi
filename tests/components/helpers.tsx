import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";
import { LocaleProvider } from "@/components/locale-provider";
import type { AnalysisResult } from "@/lib/analysis/schemas";
import type { AnalyzeResponse } from "@/lib/client/api";
import { segmentDocument } from "@/lib/document/segment";
import { RENT_AGREEMENT_V1 } from "@/lib/samples";

/** Render inside the locale provider, as every page does. */
export function renderWithLocale(ui: ReactElement): RenderResult {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

export const FIXTURE_DOCUMENT = segmentDocument(RENT_AGREEMENT_V1);

export const FIXTURE_RESULT: AnalysisResult = {
  brief: {
    documentType: "Rent agreement",
    parties: ["Mr. Example Owner", "Ms. Sample Tenant"],
    summary: [
      { text: "The tenancy lasts eleven months.", clauseIds: ["c2"] },
      { text: "The deposit is ten months of rent.", clauseIds: ["c4", "c3"] },
    ],
    keyTerms: [
      { term: "Lock-in", meaning: "A period when neither side can leave.", clauseId: "c5" },
    ],
    obligations: [
      {
        party: "Tenant",
        action: "Pay rent",
        clauseId: "c3",
        deadline: { kind: "relative", days: 5, from: "start of each month" },
      },
      {
        party: "Landlord",
        action: "Refund the deposit",
        clauseId: "c4",
        deadline: { kind: "relative", days: 90, from: "the tenant vacating" },
      },
      {
        party: "Tenant",
        action: "Sign the renewal",
        clauseId: "c2",
        deadline: { kind: "absolute", date: "2026-09-20" },
      },
      { party: "Both", action: "Keep records", clauseId: "c1", deadline: { kind: "unspecified" } },
    ],
    risks: [
      {
        title: "Whole deposit forfeited",
        severity: "high",
        clauseId: "c5",
        explanation: "Leaving early costs the entire deposit.",
        statuteQuery: "security deposit forfeiture",
        statute: {
          act: "The Karnataka Rent Act, 1999",
          title: "Security deposit",
          snippet: "…",
          url: "https://indiacode.ecourtsindia.com/karnataka-rent-act-1999/section/1/",
        },
      },
      {
        title: "Structural repairs on the tenant",
        severity: "medium",
        clauseId: "c7",
        explanation: "Unusual allocation.",
        statuteQuery: "landlord entry notice",
        statute: null,
      },
    ],
    inconsistencies: [
      { description: "Deposit refund versus forfeiture.", clauseIds: ["c4", "c5"] },
    ],
    nextSteps: ["Ask for the lock-in to be shortened."],
    questionsForLawyer: ["Is full forfeiture enforceable?"],
    checklist: ["Signed copy", "Deposit receipt"],
  },
  droppedCitations: 1,
  model: "google/gemini-3.6-flash",
};

export const FIXTURE_RESPONSE: AnalyzeResponse = {
  document: FIXTURE_DOCUMENT,
  result: FIXTURE_RESULT,
  source: "text",
  jurisdiction: { state: "Karnataka", basis: "user" },
};

/** A fetch stub that answers with the given JSON body and status. */
export function fetchJson(body: unknown, status = 200): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
}
