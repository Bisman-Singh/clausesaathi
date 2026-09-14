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

/** Fewer characters than this per page means a scan with a token text layer, not text. */
const MIN_TEXT_CHARS_PER_PAGE = 40;
/** A forty-page text PDF parses in well under a second; a file that takes longer is hostile or broken. */
export const PDF_TIMEOUT_MS = 15_000;

/**
 * Pull the text layer out of a PDF.
 *
 * Runs entirely on the server, never writes the file anywhere, and rejects
 * files that are too big, too long, too slow to parse or that carry no usable
 * text layer; a scan is reported as `no_text` so the caller can transcribe it
 * instead.
 */
export async function extractPdfText(
  bytes: Uint8Array,
  timeoutMs: number = PDF_TIMEOUT_MS,
): Promise<PdfText> {
  if (bytes.byteLength > LIMITS.MAX_UPLOAD_BYTES) throw new PdfError("too_large");
  return withDeadline(parse(bytes), timeoutMs);
}

async function parse(bytes: Uint8Array): Promise<PdfText> {
  const document = await openDocument(bytes);
  if (document.numPages > LIMITS.MAX_PDF_PAGES) throw new PdfError("too_many_pages");
  const { text, totalPages } = await extractText(document, { mergePages: true });
  const cleaned = text.replace(/[ \t]+/g, " ").trim();
  if (cleaned.length < MIN_TEXT_CHARS_PER_PAGE * totalPages) throw new PdfError("no_text");
  return { text: cleaned, pages: totalPages };
}

/**
 * pdf.js cannot be cancelled, so the deadline frees the request rather than
 * the parser: the response goes out and the stalled parse is garbage collected
 * with the worker when the function instance is recycled.
 */
function withDeadline<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new PdfError("unreadable")), timeoutMs);
  });
  return Promise.race([work, deadline]).finally(() => clearTimeout(timer));
}

/**
 * pdf.js transfers the buffer it is given to its worker, which detaches the
 * caller's bytes. Parse a copy so a scan can still be sent for transcription.
 */
async function openDocument(bytes: Uint8Array) {
  try {
    return await getDocumentProxy(bytes.slice());
  } catch {
    throw new PdfError("unreadable");
  }
}
