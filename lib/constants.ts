/**
 * Hard limits that bound every request. They keep free-tier AI usage
 * predictable and make abuse cheap to reject before any model call.
 */
export const LIMITS = {
  /** Longest document text accepted for analysis, in characters. */
  MAX_DOCUMENT_CHARS: 60_000,
  /** Shortest text that can plausibly be a legal document. */
  MIN_DOCUMENT_CHARS: 80,
  /** Largest upload accepted, PDF or image, in bytes; the platform rejects bodies over 4.5 MB. Photos are shrunk in the browser first. */
  MAX_UPLOAD_BYTES: 4 * 1024 * 1024,
  /** Most pages read from a PDF. */
  MAX_PDF_PAGES: 40,
  /** Longest free-text description of the user's situation. */
  MAX_SITUATION_CHARS: 600,
  /** Longest question in the Q&A panel. */
  MAX_QUESTION_CHARS: 500,
  /** Most prior turns kept for Q&A context. */
  MAX_CHAT_MESSAGES: 12,
  /** Most parts in one Q&A turn: text plus a handful of tool steps. */
  MAX_CHAT_PARTS: 32,
  /** Most clauses a document is split into before merging the remainder. */
  MAX_CLAUSES: 250,
  /** Statute lookups performed per analysis. */
  MAX_STATUTE_LOOKUPS: 6,
} as const;

/** Per-model call budget, in milliseconds, before the next model is tried. */
export const AI_TIMEOUT_MS = 30_000;

/** No further model is tried once a request has spent this long; keeps the chain inside the function's own limit. */
export const AI_DEADLINE_MS = 100_000;

/** Output token ceiling for structured generations. */
export const AI_MAX_OUTPUT_TOKENS = 6_000;

/** Transcribing a scan can run to the document limit, so it gets more room and time. */
export const AI_TRANSCRIBE_MAX_OUTPUT_TOKENS = 16_000;
export const AI_TRANSCRIBE_TIMEOUT_MS = 55_000;

/** Supported interface languages. Documents themselves may be in either. */
export const LOCALES = ["en", "hi"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
