/**
 * Model chain configuration.
 *
 * Gemini models are tried in order, each on its own free-tier quota pool, so a
 * rate limit on one falls through to the next. An OpenAI model joins the end of
 * the chain only when a key is configured, which keeps the default deployment
 * fully on the free tier.
 */

export type ProviderName = "google" | "openai";

export interface ModelSpec {
  provider: ProviderName;
  id: string;
}

export const GOOGLE_MODEL_CHAIN: readonly string[] = [
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];

export const DEFAULT_OPENAI_MODEL = "gpt-5-mini";

export interface ModelEnv {
  GOOGLE_GENERATIVE_AI_API_KEY?: string | undefined;
  OPENAI_API_KEY?: string | undefined;
  OPENAI_MODEL?: string | undefined;
}

/** Whether at least one provider is configured. */
export function hasAnyProvider(env: ModelEnv): boolean {
  return Boolean(env.GOOGLE_GENERATIVE_AI_API_KEY || env.OPENAI_API_KEY);
}

/** The ordered list of models to try for a request. */
export function modelChain(env: ModelEnv): ModelSpec[] {
  const chain: ModelSpec[] = [];
  if (env.GOOGLE_GENERATIVE_AI_API_KEY) {
    chain.push(...GOOGLE_MODEL_CHAIN.map((id) => ({ provider: "google" as const, id })));
  }
  if (env.OPENAI_API_KEY) {
    chain.push({ provider: "openai", id: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL });
  }
  return chain;
}
