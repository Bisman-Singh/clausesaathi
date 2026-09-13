import { describe, expect, it } from "vitest";
import {
  DEFAULT_OPENAI_MODEL,
  GOOGLE_MODEL_CHAIN,
  hasAnyProvider,
  modelChain,
} from "@/lib/ai/models";

describe("modelChain", () => {
  it("is empty without credentials", () => {
    expect(modelChain({})).toEqual([]);
    expect(hasAnyProvider({})).toBe(false);
  });

  it("lists the Gemini chain in order when a Google key exists", () => {
    const chain = modelChain({ GOOGLE_GENERATIVE_AI_API_KEY: "g" });
    expect(chain.map((m) => m.id)).toEqual([...GOOGLE_MODEL_CHAIN]);
    expect(chain.every((m) => m.provider === "google")).toBe(true);
  });

  it("appends the OpenAI fallback with the configured or default model", () => {
    expect(modelChain({ OPENAI_API_KEY: "o" })).toEqual([
      { provider: "openai", id: DEFAULT_OPENAI_MODEL },
    ]);
    const both = modelChain({
      GOOGLE_GENERATIVE_AI_API_KEY: "g",
      OPENAI_API_KEY: "o",
      OPENAI_MODEL: "custom",
    });
    expect(both.at(-1)).toEqual({ provider: "openai", id: "custom" });
    expect(hasAnyProvider({ OPENAI_API_KEY: "o" })).toBe(true);
  });
});
