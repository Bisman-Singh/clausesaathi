import { createGoogle } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { AI_TIMEOUT_MS } from "@/lib/constants";
import { modelChain, type ModelEnv, type ModelSpec } from "@/lib/ai/models";

/** Raised when every model in the chain failed for a request. */
export class AiUnavailableError extends Error {
  constructor(
    message: string,
    readonly attempts: number,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "AiUnavailableError";
  }
}

export type ModelFactory = (spec: ModelSpec) => LanguageModel;

/** Build provider clients once and hand out models by spec. */
export function createModelFactory(env: ModelEnv): ModelFactory {
  const google = env.GOOGLE_GENERATIVE_AI_API_KEY
    ? createGoogle({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY })
    : null;
  const openai = env.OPENAI_API_KEY ? createOpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

  return (spec) => {
    const provider = spec.provider === "google" ? google : openai;
    if (!provider) {
      throw new AiUnavailableError(`No credentials configured for ${spec.provider}`, 0);
    }
    return provider(spec.id);
  };
}

export interface AttemptContext {
  model: LanguageModel;
  spec: ModelSpec;
  abortSignal: AbortSignal;
}

export interface FallbackResult<T> {
  value: T;
  model: ModelSpec;
  attempts: number;
}

export interface FallbackOptions {
  chain?: ModelSpec[];
  timeoutMs?: number;
  onError?: (spec: ModelSpec, error: unknown) => void;
}

/**
 * Run `attempt` against each model in the chain until one succeeds.
 *
 * Every attempt gets its own timeout so a stalled provider cannot hold a
 * request hostage. All failures are recorded, and the last one is surfaced as
 * the cause when nothing succeeds.
 */
export async function withModelFallback<T>(
  factory: ModelFactory,
  env: ModelEnv,
  attempt: (context: AttemptContext) => Promise<T>,
  options: FallbackOptions = {},
): Promise<FallbackResult<T>> {
  const chain = options.chain ?? modelChain(env);
  const timeoutMs = options.timeoutMs ?? AI_TIMEOUT_MS;
  let lastError: unknown = new Error("No models configured");

  for (const [index, spec] of chain.entries()) {
    try {
      const value = await attempt({
        model: factory(spec),
        spec,
        abortSignal: AbortSignal.timeout(timeoutMs),
      });
      return { value, model: spec, attempts: index + 1 };
    } catch (error) {
      lastError = error;
      options.onError?.(spec, error);
    }
  }

  throw new AiUnavailableError("All configured models failed", chain.length, {
    cause: lastError,
  });
}

/** Read provider configuration from the process environment. */
export function envFromProcess(): ModelEnv {
  return {
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
  };
}
