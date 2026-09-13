import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createModelFactory, envFromProcess } from "@/lib/ai/client";
import { PdfError, extractPdfText } from "@/lib/document/pdf";
import { transcribeFile } from "@/lib/document/transcribe";

/**
 * Opt-in check that the real model transcribes a photo and an image-only PDF.
 * Needs `LIVE_AI=1` and `LIVE_FIXTURE_DIR` pointing at a folder holding
 * `photo.jpg` and `scan.pdf` of the same rental agreement text (any page
 * rendered to an image will do). Skipped everywhere else.
 */
const dir = process.env.LIVE_FIXTURE_DIR;
const live = process.env.LIVE_AI === "1" && dir ? describe : describe.skip;

live("transcribeFile against the live model", () => {
  it("reads a photo of a page", async () => {
    const bytes = new Uint8Array(await readFile(join(dir ?? "", "photo.jpg")));
    const env = envFromProcess();
    const result = await transcribeFile(
      { bytes, mediaType: "image/jpeg" },
      { factory: createModelFactory(env), env },
    );
    console.warn(result?.text);
    expect(result?.text).toMatch(/18,000/);
    expect(result?.text).toMatch(/1,80,000/);
    expect(result?.text).toMatch(/Lock-in/i);
  }, 90_000);

  it("falls back to transcription for a PDF with no text layer", async () => {
    const bytes = new Uint8Array(await readFile(join(dir ?? "", "scan.pdf")));
    await expect(extractPdfText(bytes)).rejects.toBeInstanceOf(PdfError);
    const env = envFromProcess();
    const result = await transcribeFile(
      { bytes, mediaType: "application/pdf" },
      { factory: createModelFactory(env), env },
    );
    expect(result?.text).toMatch(/ninety days/i);
    expect(result?.text).toMatch(/six months/i);
  }, 90_000);
});
