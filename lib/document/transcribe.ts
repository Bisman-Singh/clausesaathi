import { generateText } from "ai";
import { withModelFallback, type ModelFactory } from "@/lib/ai/client";
import type { ModelEnv } from "@/lib/ai/models";
import { AI_TRANSCRIBE_MAX_OUTPUT_TOKENS, AI_TRANSCRIBE_TIMEOUT_MS, LIMITS } from "@/lib/constants";
import type { UploadMediaType } from "@/lib/document/upload";

/**
 * Reading a scan or a photo.
 *
 * A PDF with no text layer, or an image straight from a phone camera, is
 * handed to the model as a file and transcribed verbatim. The model is told
 * to copy, never to summarise or fill gaps, and the result is bounded like
 * any pasted text. The UI tells the user the text came from transcription so
 * numbers and dates get checked against the original.
 */

export interface TranscribeInput {
  bytes: Uint8Array;
  mediaType: UploadMediaType;
}

export interface TranscribeDeps {
  factory: ModelFactory;
  env: ModelEnv;
  generate?: typeof generateText;
}

export interface Transcription {
  text: string;
  model: string;
}

/** What the model receives with the file. Language is preserved, not translated. */
export const TRANSCRIBE_PROMPT = [
  "Transcribe every word of text in this document exactly as written, in its original language and script.",
  "Keep headings, clause numbers and paragraph breaks. Separate paragraphs with a blank line.",
  "Do not summarise, translate, correct, or add anything. If part of the page is unreadable, write [unreadable] in its place.",
  "Output only the transcribed text.",
].join(" ");

/** The model's reply once markdown fences and stray whitespace are gone. */
export function cleanTranscription(raw: string): string {
  return raw
    .replace(/^\s*```[a-z]*\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim()
    .slice(0, LIMITS.MAX_DOCUMENT_CHARS);
}

/**
 * Transcribe a file. Returns null when the model found nothing that could be
 * a document, so the caller can tell the user rather than analyse noise.
 */
export async function transcribeFile(
  input: TranscribeInput,
  deps: TranscribeDeps,
): Promise<Transcription | null> {
  const generate = deps.generate ?? generateText;
  const { value, model } = await withModelFallback(
    deps.factory,
    deps.env,
    async (context) => {
      const { text } = await generate({
        model: context.model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: TRANSCRIBE_PROMPT },
              { type: "file", data: input.bytes, mediaType: input.mediaType },
            ],
          },
        ],
        maxOutputTokens: AI_TRANSCRIBE_MAX_OUTPUT_TOKENS,
        temperature: 0,
        abortSignal: context.abortSignal,
      });
      return cleanTranscription(text);
    },
    { timeoutMs: AI_TRANSCRIBE_TIMEOUT_MS },
  );
  if (value.length < LIMITS.MIN_DOCUMENT_CHARS) return null;
  return { text: value, model: `${model.provider}/${model.id}` };
}
