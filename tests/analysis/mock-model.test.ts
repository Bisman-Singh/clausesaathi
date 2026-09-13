import { describe, expect, it, vi } from "vitest";
import { MockLanguageModelV4 } from "ai/test";
import { analyzeDocument } from "@/lib/analysis/analyze";
import type { DocumentBriefWire } from "@/lib/analysis/schemas";
import { diffDocuments } from "@/lib/compare/diff";
import { explainChanges } from "@/lib/compare/explain";
import { segmentDocument } from "@/lib/document/segment";
import { transcribeFile } from "@/lib/document/transcribe";
import { RENT_AGREEMENT_V1, RENT_AGREEMENT_V2 } from "@/lib/samples";
import type { IndiaCodeClient } from "@/lib/statute/indiacode";

/**
 * Drives the real `generateText` through the AI SDK's mock model so the
 * structured-output plumbing is exercised without any network.
 */

const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 20, text: 20, reasoning: 0 },
};

function modelReturning(json: unknown): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    doGenerate: {
      content: [{ type: "text", text: JSON.stringify(json) }],
      finishReason: { unified: "stop", raw: "STOP" },
      usage,
      warnings: [],
    },
  });
}

const statutes: IndiaCodeClient = { search: vi.fn(async () => []), getSection: vi.fn() };
const env = { GOOGLE_GENERATIVE_AI_API_KEY: "g" };

const brief: DocumentBriefWire = {
  documentType: "Rent agreement",
  parties: ["Landlord", "Tenant"],
  summary: [{ text: "Eleven month tenancy.", clauseIds: ["c2"] }],
  keyTerms: [],
  obligations: [],
  risks: [],
  inconsistencies: [],
  nextSteps: [],
  questionsForLawyer: [],
  checklist: [],
};

describe("real generateText through a mock model", () => {
  it("analyses a document", async () => {
    const result = await analyzeDocument(
      { document: segmentDocument(RENT_AGREEMENT_V1), situation: "", locale: "en", state: null },
      { factory: () => modelReturning(brief), env, statutes },
    );
    expect(result.brief.summary[0]?.text).toBe("Eleven month tenancy.");
    expect(result.droppedCitations).toBe(0);
  });

  it("explains changes", async () => {
    const changes = diffDocuments(
      segmentDocument(RENT_AGREEMENT_V1),
      segmentDocument(RENT_AGREEMENT_V2),
    );
    const firstModified = changes.findIndex((change) => change.kind === "modified");
    const result = await explainChanges(changes, "hi", {
      factory: () =>
        modelReturning({
          changes: [
            {
              index: firstModified,
              whatChanged: "x",
              whoBenefits: "the tenant, obviously, in every respect imaginable here",
              severity: "low",
            },
            { index: firstModified + 1, whatChanged: "y", whoBenefits: "  ", severity: "low" },
          ],
        }),
      env,
    });
    expect(result.explanations[0]?.whoBenefits).toHaveLength(40);
    expect(result.explanations.find((item) => item.index === firstModified + 1)?.whoBenefits).toBe(
      "unclear",
    );
    expect(result.model).toBe("google/gemini-3.6-flash");
  });

  it("transcribes a file through the real generateText with a file part", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: {
        content: [{ type: "text", text: RENT_AGREEMENT_V1 }],
        finishReason: { unified: "stop", raw: "STOP" },
        usage,
        warnings: [],
      },
    });
    const result = await transcribeFile(
      { bytes: new Uint8Array([1, 2, 3]), mediaType: "image/png" },
      { factory: () => model, env },
    );
    expect(result?.text).toBe(RENT_AGREEMENT_V1.trim());
    expect(result?.model).toBe("google/gemini-3.6-flash");
    const prompt = model.doGenerateCalls[0]?.prompt ?? [];
    const user = prompt.find((message) => message.role === "user");
    expect(JSON.stringify(user)).toContain('"mediaType":"image/png"');
  });
});
