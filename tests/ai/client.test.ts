import { afterEach, describe, expect, it, vi } from "vitest";
import type { LanguageModel } from "ai";
import {
  AiUnavailableError,
  createModelFactory,
  envFromProcess,
  withModelFallback,
  type ModelFactory,
} from "@/lib/ai/client";
import type { ModelSpec } from "@/lib/ai/models";

const fakeModel = (id: string) => ({ modelId: id }) as unknown as LanguageModel;
const factory: ModelFactory = (spec) => fakeModel(spec.id);
const env = { GOOGLE_GENERATIVE_AI_API_KEY: "g" };

describe("withModelFallback", () => {
  it("returns the first successful attempt with its model", async () => {
    const attempt = vi.fn(async ({ spec }: { spec: ModelSpec }) => `ok:${spec.id}`);
    const result = await withModelFallback(factory, env, attempt);
    expect(result).toEqual({
      value: "ok:gemini-3.6-flash",
      model: { provider: "google", id: "gemini-3.6-flash" },
      attempts: 1,
    });
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it("falls through to the next model when one fails and reports the error", async () => {
    const onError = vi.fn();
    const attempt = vi.fn().mockRejectedValueOnce(new Error("429")).mockResolvedValueOnce("second");
    const result = await withModelFallback(factory, env, attempt, { onError });
    expect(result.value).toBe("second");
    expect(result.attempts).toBe(2);
    expect(onError).toHaveBeenCalledWith(
      { provider: "google", id: "gemini-3.6-flash" },
      expect.any(Error),
    );
  });

  it("throws AiUnavailableError carrying the last failure when every model fails", async () => {
    const attempt = vi.fn().mockRejectedValue(new Error("boom"));
    const promise = withModelFallback(factory, env, attempt, { timeoutMs: 10 });
    await expect(promise).rejects.toBeInstanceOf(AiUnavailableError);
    await promise.catch((error: AiUnavailableError) => {
      expect(error.attempts).toBe(3);
      expect((error.cause as Error).message).toBe("boom");
    });
  });

  it("throws immediately with no models configured", async () => {
    const attempt = vi.fn();
    await expect(withModelFallback(factory, {}, attempt)).rejects.toMatchObject({ attempts: 0 });
    expect(attempt).not.toHaveBeenCalled();
  });

  it("passes an abort signal that times out per attempt", async () => {
    const attempt = vi.fn(async ({ abortSignal }: { abortSignal: AbortSignal }) => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      return abortSignal.aborted;
    });
    const chain = [{ provider: "google" as const, id: "only" }];
    const result = await withModelFallback(factory, env, attempt, { chain, timeoutMs: 5 });
    expect(result.value).toBe(true);
  });
});

describe("createModelFactory", () => {
  it("builds Google and OpenAI models from their keys", () => {
    const make = createModelFactory({ GOOGLE_GENERATIVE_AI_API_KEY: "g", OPENAI_API_KEY: "o" });
    expect(make({ provider: "google", id: "gemini-3.6-flash" })).toMatchObject({
      modelId: "gemini-3.6-flash",
    });
    expect(make({ provider: "openai", id: "gpt-5-mini" })).toMatchObject({ modelId: "gpt-5-mini" });
  });

  it("refuses a provider that has no key", () => {
    const make = createModelFactory({ GOOGLE_GENERATIVE_AI_API_KEY: "g" });
    expect(() => make({ provider: "openai", id: "x" })).toThrow(AiUnavailableError);
    const openaiOnly = createModelFactory({ OPENAI_API_KEY: "o" });
    expect(() => openaiOnly({ provider: "google", id: "x" })).toThrow(AiUnavailableError);
  });
});

describe("envFromProcess", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads the three provider variables", () => {
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "g");
    vi.stubEnv("OPENAI_API_KEY", "o");
    vi.stubEnv("OPENAI_MODEL", "m");
    expect(envFromProcess()).toEqual({
      GOOGLE_GENERATIVE_AI_API_KEY: "g",
      OPENAI_API_KEY: "o",
      OPENAI_MODEL: "m",
    });
  });
});

describe("withModelFallback deadline", () => {
  it("stops trying further models once the request budget is spent", async () => {
    let clock = 0;
    const attempt = vi.fn(async () => {
      clock += 60_000;
      throw new Error("slow failure");
    });
    const factory = () => ({ modelId: "fake" }) as never;
    await expect(
      withModelFallback(factory, { GOOGLE_GENERATIVE_AI_API_KEY: "k" }, attempt, {
        deadlineMs: 100_000,
        now: () => clock,
      }),
    ).rejects.toBeInstanceOf(AiUnavailableError);
    expect(attempt).toHaveBeenCalledTimes(2);
  });
});
