import { generateText, Output } from "ai";
import { z } from "zod";
import { withModelFallback, type ModelFactory } from "@/lib/ai/client";
import type { ModelEnv } from "@/lib/ai/models";
import type { ClauseChange } from "@/lib/compare/diff";
import { AI_MAX_OUTPUT_TOKENS, type Locale } from "@/lib/constants";

/**
 * Plain-language explanation of the clauses the deterministic diff marked as
 * modified. The model never decides what changed, only what the change means.
 */

export const changeExplanationSchema = z.object({
  index: z.number().int().min(0),
  whatChanged: z.string().min(1),
  whoBenefits: z.enum(["first_party", "second_party", "both", "unclear"]),
  severity: z.enum(["low", "medium", "high"]),
});
export type ChangeExplanation = z.infer<typeof changeExplanationSchema>;

const wireSchema = z.object({ changes: z.array(changeExplanationSchema) });

const LANGUAGE: Record<Locale, string> = { en: "English", hi: "Hindi (Devanagari)" };

export function explainSystemPrompt(locale: Locale): string {
  return [
    "You explain differences between two versions of a legal document to a reader with no legal training.",
    `Write in ${LANGUAGE[locale]}, two or three short sentences per change, no jargon.`,
    "Each change is given as an index with the earlier and later text. For each index return what changed in practical terms, who the change favours, and how serious it is for the party it disadvantages.",
    "first_party is the party that drafted or sends the document (landlord, employer, company). second_party is the other side (tenant, employee, customer).",
    "Only use the indexes given. Never invent a change.",
  ].join("\n");
}

export function explainUserPrompt(pairs: ModifiedPair[]): string {
  return pairs
    .map((pair) => `Change ${pair.index}\nEARLIER: ${pair.before}\nLATER: ${pair.after}`)
    .join("\n\n");
}

export interface ModifiedPair {
  index: number;
  before: string;
  after: string;
}

/** The modified pairs from a diff, indexed by their position in the change list. */
export function modifiedPairs(changes: ClauseChange[]): ModifiedPair[] {
  return changes.flatMap((change, index) =>
    change.kind === "modified" && change.before && change.after
      ? [{ index, before: change.before.text, after: change.after.text }]
      : [],
  );
}

export interface ExplainDeps {
  factory: ModelFactory;
  env: ModelEnv;
  generate?: typeof generateText;
}

/** Explanations keyed by change index; indexes the model invented are dropped. */
export async function explainChanges(
  changes: ClauseChange[],
  locale: Locale,
  deps: ExplainDeps,
): Promise<{ explanations: ChangeExplanation[]; model: string }> {
  const pairs = modifiedPairs(changes);
  if (pairs.length === 0) return { explanations: [], model: "none" };
  const generate = deps.generate ?? generateText;
  const valid = new Set(pairs.map((pair) => pair.index));

  const { value, model } = await withModelFallback(deps.factory, deps.env, async (context) => {
    const { output } = await generate({
      model: context.model,
      output: Output.object({ schema: wireSchema }),
      system: explainSystemPrompt(locale),
      prompt: explainUserPrompt(pairs),
      maxOutputTokens: AI_MAX_OUTPUT_TOKENS,
      temperature: 0.2,
      abortSignal: context.abortSignal,
    });
    return output.changes;
  });

  return {
    explanations: value.filter((item) => valid.has(item.index)),
    model: `${model.provider}/${model.id}`,
  };
}
