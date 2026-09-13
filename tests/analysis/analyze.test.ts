import { describe, expect, it, vi } from "vitest";
import type { LanguageModel } from "ai";
import { analyzeDocument } from "@/lib/analysis/analyze";
import { analysisSystemPrompt, analysisUserPrompt } from "@/lib/analysis/prompts";
import type { DocumentBrief } from "@/lib/analysis/schemas";
import { segmentDocument } from "@/lib/document/segment";
import type { IndiaCodeClient } from "@/lib/statute/indiacode";

const document = segmentDocument(
  "RENT AGREEMENT\n\n1. Deposit\nThe tenant pays a deposit of three months rent.\n\n2. Notice\nThirty days notice by either side.",
);

const generated: DocumentBrief = {
  documentType: "Rent agreement",
  parties: ["Landlord", "Tenant"],
  summary: [{ text: "Deposit is three months of rent.", clauseIds: ["c1"] }],
  keyTerms: [],
  obligations: [
    {
      party: "Either party",
      action: "Give notice",
      clauseId: "c2",
      deadline: { kind: "relative", days: 30, from: "the date notice is given" },
    },
  ],
  risks: [
    {
      title: "Large deposit",
      severity: "medium",
      clauseId: "c1",
      explanation: "Three months is above what some state laws allow.",
      statuteQuery: "security deposit tenant limit",
    },
    { title: "Phantom", severity: "low", clauseId: "c9", explanation: "no", statuteQuery: null },
  ],
  inconsistencies: [],
  nextSteps: ["Ask for the deposit terms in writing."],
  questionsForLawyer: ["Is a three month deposit enforceable here?"],
  checklist: ["Signed copy", "Rent receipts"],
};

const statutes: IndiaCodeClient = {
  search: vi.fn(async () => [
    {
      ref: "delhi-rent-control-act-1958/28",
      title: "Time limit for making deposit",
      act: "The Delhi Rent Control Act, 1958",
      snippet: "…",
      url: "https://indiacode.ecourtsindia.com/delhi-rent-control-act-1958/section/28/",
    },
  ]),
  getSection: vi.fn(),
};

describe("analyzeDocument", () => {
  it("generates a brief, verifies citations and attaches statutes", async () => {
    const generate = vi.fn(async () => ({ output: generated })) as never;
    const result = await analyzeDocument(
      { document, situation: "I am the tenant", locale: "en" },
      {
        factory: () => ({ modelId: "m" }) as unknown as LanguageModel,
        env: { GOOGLE_GENERATIVE_AI_API_KEY: "g" },
        statutes,
        generate,
      },
    );
    expect(result.model).toBe("google/gemini-3.6-flash");
    expect(result.droppedCitations).toBe(1);
    expect(result.brief.risks).toHaveLength(1);
    expect(result.brief.risks[0]?.statute?.act).toBe("The Delhi Rent Control Act, 1958");
    expect(result.brief.obligations[0]?.deadline).toEqual({
      kind: "relative",
      days: 30,
      from: "the date notice is given",
    });

    const call = (generate as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
      system: string;
      prompt: string;
      temperature: number;
    };
    expect(call.system).toBe(analysisSystemPrompt("en"));
    expect(call.prompt).toBe(analysisUserPrompt({ document, situation: "I am the tenant" }));
    expect(call.temperature).toBe(0.2);
  });
});

describe("prompts", () => {
  it("switches the output language and includes every clause tag", () => {
    expect(analysisSystemPrompt("hi")).toContain("Hindi");
    const prompt = analysisUserPrompt({ document, situation: "  " });
    expect(prompt).toContain("has not described their situation");
    expect(prompt).toContain("Document title: RENT AGREEMENT");
    expect(prompt).toContain("[c1] 1. Deposit");
    expect(prompt).toContain("[c2] 2. Notice");
  });

  it("omits the title line when the document has none", () => {
    const prompt = analysisUserPrompt({
      document: segmentDocument("Plain text only."),
      situation: "",
    });
    expect(prompt).not.toContain("Document title");
  });
});
