import { z } from "zod";
import { LIMITS, type Locale } from "@/lib/constants";
import { PdfError, extractPdfText } from "@/lib/document/pdf";
import { transcribeFile, type TranscribeDeps } from "@/lib/document/transcribe";
import {
  isImageUpload,
  sniffMediaType,
  uploadMediaType,
  type UploadMediaType,
} from "@/lib/document/upload";
import { HttpError, assertContentLength, readJson } from "@/lib/http/guard";
import { toLocale } from "@/lib/i18n";
import { isInjectionAttempt } from "@/lib/qa/guard";
import { isIndianState, type IndianState } from "@/lib/statute/jurisdiction";
import type { StateBasis } from "@/lib/statute/resolve";

export type { StateBasis };

/**
 * Reading the analyse request in either of its two shapes: JSON with pasted
 * text, or multipart with a PDF or an image. Both end up as the same
 * validated input, tagged with where the text came from.
 */

/** Pasted, read from a PDF's text layer, or transcribed by the model from a scan or photo. */
export type DocumentSource = "text" | "pdf" | "transcription";

export interface AnalyzeRequest {
  text: string;
  situation: string;
  locale: Locale;
  state: IndianState | null;
  stateBasis: StateBasis;
  source: DocumentSource;
}

/** JSON bodies may carry the whole document plus a little metadata. */
const MAX_JSON_BYTES = LIMITS.MAX_DOCUMENT_CHARS * 4 + 4096;
/** Locale, state and basis are short tokens; anything longer is not one of ours. */
const MAX_TOKEN_CHARS = 64;

/** Unknown fields are rejected outright: the client sends exactly these five. */
const jsonSchema = z.strictObject({
  // Length is judged by `validateText`, which reports too_short and too_long; this bound only
  // keeps the parser honest, since the body cap already holds the text below it.
  text: z.string().max(MAX_JSON_BYTES),
  situation: z.string().max(LIMITS.MAX_SITUATION_CHARS).default(""),
  locale: z.string().max(MAX_TOKEN_CHARS).optional(),
  state: z.string().max(MAX_TOKEN_CHARS).optional(),
  stateBasis: z.string().max(MAX_TOKEN_CHARS).optional(),
});
/** Multipart bodies carry the file plus a little metadata. */
const MAX_MULTIPART_BYTES = LIMITS.MAX_UPLOAD_BYTES + 8192;

export async function readAnalyzeRequest(
  request: Request,
  deps: TranscribeDeps,
): Promise<AnalyzeRequest> {
  const contentType = request.headers.get("content-type") ?? "";
  const raw = contentType.startsWith("multipart/form-data")
    ? await readMultipart(request, deps)
    : { ...(await readJson(request, jsonSchema, MAX_JSON_BYTES)), source: "text" as const };
  return {
    text: validateText(raw.text),
    situation: screenSituation(raw.situation),
    locale: toLocale(raw.locale),
    state: raw.state && isIndianState(raw.state) ? raw.state : null,
    stateBasis: toStateBasis(raw.stateBasis),
    source: raw.source,
  };
}

interface RawInput {
  text: string;
  situation: string;
  locale: string | undefined;
  state: string | undefined;
  stateBasis: string | undefined;
  source: DocumentSource;
}

async function readMultipart(request: Request, deps: TranscribeDeps): Promise<RawInput> {
  assertContentLength(request, MAX_MULTIPART_BYTES);
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "missing_file");
  const mediaType = uploadMediaType(file);
  if (!mediaType) throw new HttpError(400, "unsupported_file");
  if (file.size > LIMITS.MAX_UPLOAD_BYTES) throw new HttpError(400, "file_too_large");
  const bytes = new Uint8Array(await file.arrayBuffer());
  // The declared type only picks the family; the bytes must agree before anything is parsed or sent on.
  if (sniffMediaType(bytes) !== mediaType) throw new HttpError(400, "unsupported_file");
  const { text, source } = await readFile(bytes, mediaType, deps);
  return {
    text,
    source,
    situation: stringField(form, "situation"),
    locale: stringField(form, "locale"),
    state: stringField(form, "state"),
    stateBasis: stringField(form, "stateBasis"),
  };
}

/** Text from the file: a PDF's own text layer when it has one, else the model's transcription. */
async function readFile(
  bytes: Uint8Array,
  mediaType: UploadMediaType,
  deps: TranscribeDeps,
): Promise<{ text: string; source: DocumentSource }> {
  if (!isImageUpload(mediaType)) {
    try {
      return { text: (await extractPdfText(bytes)).text, source: "pdf" };
    } catch (error) {
      if (!(error instanceof PdfError) || error.code !== "no_text") throw error;
    }
  }
  const transcription = await transcribeFile({ bytes, mediaType }, deps);
  if (!transcription) throw new HttpError(400, "no_text_found");
  return { text: transcription.text, source: "transcription" };
}

function toStateBasis(value: string | undefined): StateBasis {
  if (value === "location" || value === "none") return value;
  return "user";
}

function stringField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * The situation is quoted straight into the prompt, so text that addresses
 * the assistant rather than describing the user is dropped: the document
 * still gets analysed, just evenly, as if nothing had been said.
 */
function screenSituation(situation: string): string {
  const trimmed = situation.trim().slice(0, LIMITS.MAX_SITUATION_CHARS);
  return isInjectionAttempt(trimmed) ? "" : trimmed;
}

function validateText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length < LIMITS.MIN_DOCUMENT_CHARS) throw new HttpError(400, "too_short");
  if (trimmed.length > LIMITS.MAX_DOCUMENT_CHARS) throw new HttpError(400, "too_long");
  return trimmed;
}
