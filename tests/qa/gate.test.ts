import { describe, expect, it, vi } from "vitest";
import type { LanguageModel } from "ai";
import { segmentDocument } from "@/lib/document/segment";
import { gateChain, gatePrompt, isOnTopic } from "@/lib/qa/gate";

const document = segmentDocument(
  "RENT AGREEMENT\n\n1. Deposit\nThe tenant pays a deposit.\n\n2. Notice\nThirty days notice.\n\nA block with no heading at all that is long enough to be trimmed in the outline.",
);
const env = { GOOGLE_GENERATIVE_AI_API_KEY: "g", OPENAI_API_KEY: "o" };
const deps = (generate: unknown) => ({
  factory: () => ({ modelId: "fake" }) as unknown as LanguageModel,
  env,
  generate: generate as never,
});

describe("gateChain", () => {
  it("puts the lite models first so the yes/no answer is fast", () => {
    const ids = gateChain(env).map((spec) => spec.id);
    expect(ids[0]).toContain("lite");
    expect(ids.at(-1)).toBe("gpt-5-mini");
  });
});

describe("gatePrompt", () => {
  it("shows the model only the outline plus the question", () => {
    const prompt = gatePrompt(document, "Can I leave early?", "hi");
    expect(prompt).toMatch(/\[c\d+\] 1\. Deposit/);
    expect(prompt).toMatch(/\[c\d+\] A block with no heading at all/);
    expect(prompt).toContain("Hindi or English");
    expect(prompt).toContain("QUESTION: Can I leave early?");
    expect(prompt).not.toContain("Thirty days notice");
  });
});

describe("isOnTopic", () => {
  it("returns the model's verdict", async () => {
    const generate = vi.fn(async () => ({ output: { onTopic: false, reason: "weather" } }));
    expect(await isOnTopic(document, "Will it rain?", "en", deps(generate))).toBe(false);
    const calls = generate.mock.calls as unknown as Array<
      [{ maxOutputTokens: number; temperature: number }]
    >;
    const call = calls[0]?.[0];
    expect(call?.maxOutputTokens).toBe(80);
    expect(call?.temperature).toBe(0);
  });

  it("fails open when every model is down, so an outage does not block questions", async () => {
    const generate = vi.fn(async () => Promise.reject(new Error("down")));
    expect(await isOnTopic(document, "Deposit?", "en", deps(generate))).toBe(true);
  });
});
