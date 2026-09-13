/**
 * Hard limits that bound every request. They keep free-tier AI usage
 * predictable and make abuse cheap to reject before any model call.
 */
export const LIMITS = {
  /** Longest document text accepted for analysis, in characters. */
  MAX_DOCUMENT_CHARS: 60_000,
  /** Shortest text that can plausibly be a legal document. */
  MIN_DOCUMENT_CHARS: 80,
  /** Largest PDF upload accepted, in bytes. */
  MAX_PDF_BYTES: 5 * 1024 * 1024,
  /** Most pages read from a PDF. */
  MAX_PDF_PAGES: 40,
  /** Longest free-text description of the user's situation. */
  MAX_SITUATION_CHARS: 600,
  /** Longest question in the Q&A panel. */
  MAX_QUESTION_CHARS: 500,
  /** Most prior turns kept for Q&A context. */
  MAX_CHAT_MESSAGES: 12,
  /** Most clauses a document is split into before merging the remainder. */
  MAX_CLAUSES: 250,
  /** Statute lookups performed per analysis. */
  MAX_STATUTE_LOOKUPS: 6,
} as const;

/** Per-model call budget, in milliseconds, before the next model is tried. */
export const AI_TIMEOUT_MS = 30_000;

/** Output token ceiling for structured generations. */
export const AI_MAX_OUTPUT_TOKENS = 6_000;

/** Supported interface languages. Documents themselves may be in either. */
export const LOCALES = ["en", "hi"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
