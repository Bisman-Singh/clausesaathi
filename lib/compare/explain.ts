import { generateText, Output } from "ai";
import { z } from "zod";
import { withModelFallback, type ModelFactory } from "@/lib/ai/client";
import { IDENTITY, LANGUAGE_NAMES, languageNote } from "@/lib/ai/persona";
import type { ModelEnv } from "@/lib/ai/models";
import type { ClauseChange } from "@/lib/compare/diff";
import { AI_MAX_OUTPUT_TOKENS, type Locale } from "@/lib/constants";

/**
 * Plain-language explanation of the clauses the deterministic diff marked as
 * modified. The model never decides what changed, only what the change means.
 */

/** Longest party name the view will show; anything longer is a sentence, not a name. */
const MAX_PARTY_CHARS = 40;

/** Most modified clauses explained per comparison; the rest still show their diff. */
export const MAX_EXPLAINED_PAIRS = 30;

export const changeExplanationSchema = z.object({
  index: z.number().int().min(0),
  whatChanged: z.string(),
  /** The role the change favours, as the document names it: "Tenant", "both", "neither". */
  whoBenefits: z.string(),
  severity: z.enum(["low", "medium", "high"]),
});
export type ChangeExplanation = z.infer<typeof changeExplanationSchema>;

const wireSchema = z.object({ changes: z.array(changeExplanationSchema) });

/** Trim what the model wrote to what the card can show; never fail the comparison over length. */
function bound(item: ChangeExplanation): ChangeExplanation {
  return {
    ...item,
    whatChanged: item.whatChanged.trim().slice(0, 600),
    whoBenefits: item.whoBenefits.trim().slice(0, MAX_PARTY_CHARS) || "unclear",
  };
}

export function explainSystemPrompt(locale: Locale): string {
  return [
    IDENTITY,
    "You explain differences between two versions of a legal document to a reader with no legal training.",
    `Write in ${LANGUAGE_NAMES[locale]}, two or three short sentences per change, no jargon.`,
    languageNote(locale),
    "Each change is given as an index with the earlier and later text. For each index return what changed in practical terms, who the change favours, and how serious it is for the party it disadvantages.",
    "whoBenefits is the role of the party the change favours, in one or two words exactly as the document names that party (for example Tenant, Landlord, Employee, Employer, Customer, Company), or the word for both or neither in the same language.",
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

/**
 * The modified pairs from a diff, indexed by their position in the change
 * list. When there are more than the cap, the least similar (most changed)
 * pairs are explained and the rest keep their word-level diff only.
 */
export function modifiedPairs(changes: ClauseChange[]): ModifiedPair[] {
  const pairs = changes.flatMap((change, index) =>
    change.kind === "modified" && change.before && change.after
      ? [
          {
            index,
            before: change.before.text,
            after: change.after.text,
            score: Number(change.similarity),
          },
        ]
      : [],
  );
  return pairs
    .sort((a, b) => a.score - b.score)
    .slice(0, MAX_EXPLAINED_PAIRS)
    .sort((a, b) => a.index - b.index)
    .map(({ index, before, after }) => ({ index, before, after }));
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
    explanations: value.filter((item) => valid.has(item.index)).map(bound),
    model: `${model.provider}/${model.id}`,
  };
}
