import { z } from "zod";
import { LIMITS, type Locale } from "@/lib/constants";
import { extractPdfText } from "@/lib/document/pdf";
import { HttpError, assertContentLength, readJson } from "@/lib/http/guard";
import { toLocale } from "@/lib/i18n";
import { isIndianState, type IndianState } from "@/lib/statute/jurisdiction";

/**
 * Reading the analyse request in either of its two shapes: JSON with pasted
 * text, or multipart with a PDF. Both end up as the same validated input.
 */

export interface AnalyzeRequest {
  text: string;
  situation: string;
  locale: Locale;
  state: IndianState | null;
}

const jsonSchema = z.object({
  text: z.string(),
  situation: z.string().max(LIMITS.MAX_SITUATION_CHARS).default(""),
  locale: z.string().optional(),
  state: z.string().optional(),
});

/** JSON bodies may carry the whole document plus a little metadata. */
const MAX_JSON_BYTES = LIMITS.MAX_DOCUMENT_CHARS * 4 + 4096;
/** Multipart bodies carry the PDF plus a little metadata. */
const MAX_MULTIPART_BYTES = LIMITS.MAX_PDF_BYTES + 8192;

export async function readAnalyzeRequest(request: Request): Promise<AnalyzeRequest> {
  const contentType = request.headers.get("content-type") ?? "";
  const raw = contentType.startsWith("multipart/form-data")
    ? await readMultipart(request)
    : await readJson(request, jsonSchema, MAX_JSON_BYTES);
  return {
    text: validateText(raw.text),
    situation: raw.situation.trim().slice(0, LIMITS.MAX_SITUATION_CHARS),
    locale: toLocale(raw.locale),
    state: raw.state && isIndianState(raw.state) ? raw.state : null,
  };
}

interface RawInput {
  text: string;
  situation: string;
  locale: string | undefined;
  state: string | undefined;
}

async function readMultipart(request: Request): Promise<RawInput> {
  assertContentLength(request, MAX_MULTIPART_BYTES);
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "missing_file");
  if (file.size > LIMITS.MAX_PDF_BYTES) throw new HttpError(400, "pdf_too_large");
  const { text } = await extractPdfText(new Uint8Array(await file.arrayBuffer()));
  return {
    text,
    situation: stringField(form, "situation"),
    locale: stringField(form, "locale"),
    state: stringField(form, "state"),
  };
}

function stringField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function validateText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length < LIMITS.MIN_DOCUMENT_CHARS) throw new HttpError(400, "too_short");
  if (trimmed.length > LIMITS.MAX_DOCUMENT_CHARS) throw new HttpError(400, "too_long");
  return trimmed;
}
