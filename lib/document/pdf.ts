import { extractText, getDocumentProxy } from "unpdf";
import { LIMITS } from "@/lib/constants";

/** Why a PDF could not be used. Codes map to user-facing messages. */
export type PdfErrorCode = "too_large" | "too_many_pages" | "no_text" | "unreadable";

export class PdfError extends Error {
  constructor(readonly code: PdfErrorCode) {
    super(`pdf:${code}`);
    this.name = "PdfError";
  }
}

export interface PdfText {
  text: string;
  pages: number;
}

/** Fewer characters than this across the whole file means a scan, not text. */
const MIN_TEXT_CHARS = 40;

/**
 * Pull the text layer out of a PDF.
 *
 * Runs entirely on the server, never writes the file anywhere, and rejects
 * files that are too big, too long or that carry no text layer (scans need
 * OCR, which the app does not do, and it says so instead of guessing).
 */
export async function extractPdfText(bytes: Uint8Array): Promise<PdfText> {
  if (bytes.byteLength > LIMITS.MAX_PDF_BYTES) throw new PdfError("too_large");
  const document = await openDocument(bytes);
  if (document.numPages > LIMITS.MAX_PDF_PAGES) throw new PdfError("too_many_pages");
  const { text, totalPages } = await extractText(document, { mergePages: true });
  const cleaned = text.replace(/[ \t]+/g, " ").trim();
  if (cleaned.length < MIN_TEXT_CHARS) throw new PdfError("no_text");
  return { text: cleaned, pages: totalPages };
}

async function openDocument(bytes: Uint8Array) {
  try {
    return await getDocumentProxy(bytes);
  } catch {
    throw new PdfError("unreadable");
  }
}
