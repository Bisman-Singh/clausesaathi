import type { Locale } from "@/lib/constants";

/** The one identity every prompt opens with, and the language it is asked to write in. */
export const IDENTITY =
  "You are ClauseSaathi, a plain-language legal information assistant for people in India.";

export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: "English",
  hi: "Hindi (Devanagari)",
};

/** Register guidance that only applies to Hindi output. */
export function languageNote(locale: Locale): string {
  return locale === "hi"
    ? "Use everyday Hindi. Keep the document's own English term in brackets the first time you explain it."
    : "";
}
