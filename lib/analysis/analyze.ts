import { generateText, Output } from "ai";
import { AI_MAX_OUTPUT_TOKENS, type Locale } from "@/lib/constants";
import { withModelFallback, type ModelFactory } from "@/lib/ai/client";
import type { ModelEnv } from "@/lib/ai/models";
import { verifyCitations } from "@/lib/analysis/citations";
import { analysisSystemPrompt, analysisUserPrompt } from "@/lib/analysis/prompts";
import { documentBriefWireSchema, toBrief, type AnalysisResult } from "@/lib/analysis/schemas";
import { attachStatutes } from "@/lib/analysis/statutes";
import type { ParsedDocument } from "@/lib/document/types";
import type { IndiaCodeClient } from "@/lib/statute/indiacode";
import type { IndianState } from "@/lib/statute/jurisdiction";

export interface AnalyzeInput {
  document: ParsedDocument;
  situation: string;
  locale: Locale;
  /** The user's state, used to prefer local legislation in statute lookups. */
  state: IndianState | null;
}

export interface AnalyzeDeps {
  factory: ModelFactory;
  env: ModelEnv;
  statutes: IndiaCodeClient;
  generate?: typeof generateText;
}

/**
 * Turn a parsed document into a verified brief.
 *
 * The model produces a schema-constrained JSON object; citations are then
 * checked against the real clause ids and statutes are fetched from IndiaCode.
 * Nothing the model wrote about the law is shown, only what the API returned.
 */
export async function analyzeDocument(
  input: AnalyzeInput,
  deps: AnalyzeDeps,
): Promise<AnalysisResult> {
  const generate = deps.generate ?? generateText;
  const { value, model } = await withModelFallback(deps.factory, deps.env, async (context) => {
    const { output } = await generate({
      model: context.model,
      output: Output.object({ schema: documentBriefWireSchema }),
      system: analysisSystemPrompt(input.locale),
      prompt: analysisUserPrompt(input),
      maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
      temperature: 0.2,
      abortSignal: context.abortSignal,
    });
    return toBrief(output);
  });

  const validIds = new Set(input.document.clauses.map((clause) => clause.id));
  const { brief, dropped } = verifyCitations(value, validIds);
  const risks = await attachStatutes(brief.risks, deps.statutes, input.state);

  return {
    brief: { ...brief, risks },
    droppedCitations: dropped,
    model: `${model.provider}/${model.id}`,
  };
}
