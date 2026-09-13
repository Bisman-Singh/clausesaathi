import { describe, expect, it, vi } from "vitest";
import type { LanguageModel } from "ai";
import { AiUnavailableError } from "@/lib/ai/client";
import { LIMITS } from "@/lib/constants";
import { TRANSCRIBE_PROMPT, cleanTranscription, transcribeFile } from "@/lib/document/transcribe";

const deps = (text: string | Error) => ({
  factory: () => ({ modelId: "fake" }) as unknown as LanguageModel,
  env: { GOOGLE_GENERATIVE_AI_API_KEY: "k" },
  generate: vi.fn(async () => {
    if (text instanceof Error) throw text;
    return { text };
  }) as never,
});

const LONG =
  "1. Rent\nThe tenant pays Rs. 12,000 on the first of each month by bank transfer.\n\n2. Notice\nOne month.";

describe("cleanTranscription", () => {
  it("strips code fences and trailing spaces and bounds the length", () => {
    expect(cleanTranscription("```text\nHello  \nWorld\n```")).toBe("Hello\nWorld");
    expect(cleanTranscription("x".repeat(LIMITS.MAX_DOCUMENT_CHARS + 5))).toHaveLength(
      LIMITS.MAX_DOCUMENT_CHARS,
    );
  });
});

describe("transcribeFile", () => {
  it("sends the file to the model with the copy-only instruction and returns the text", async () => {
    const d = deps(LONG);
    const bytes = new Uint8Array([1, 2, 3]);
    const result = await transcribeFile({ bytes, mediaType: "image/png" }, d);
    expect(result).toEqual({ text: LONG, model: "google/gemini-3.6-flash" });
    const call = (d.generate as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
      messages: Array<{ content: Array<Record<string, unknown>> }>;
      temperature: number;
    };
    expect(call.temperature).toBe(0);
    expect(call.messages[0]?.content).toEqual([
      { type: "text", text: TRANSCRIBE_PROMPT },
      { type: "file", data: bytes, mediaType: "image/png" },
    ]);
  });

  it("returns null when the model found nothing document-like", async () => {
    const result = await transcribeFile(
      { bytes: new Uint8Array(1), mediaType: "application/pdf" },
      deps("blurry"),
    );
    expect(result).toBeNull();
  });

  it("surfaces model outages as the shared unavailable error", async () => {
    await expect(
      transcribeFile(
        { bytes: new Uint8Array(1), mediaType: "image/jpeg" },
        deps(new Error("down")),
      ),
    ).rejects.toBeInstanceOf(AiUnavailableError);
  });
});
