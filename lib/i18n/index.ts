import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/lib/constants";
import { translations, type TranslationKey } from "@/lib/i18n/translations";

export type { TranslationKey };

/** Look up a string for a locale, with `{name}` placeholders substituted. */
export function t(
  locale: Locale,
  key: TranslationKey,
  vars: Record<string, string | number> = {},
): string {
  return Object.entries(vars).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    translations[locale][key],
  );
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function toLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** The BCP 47 tag for the html lang attribute. */
export function htmlLang(locale: Locale): string {
  return locale === "hi" ? "hi-IN" : "en-IN";
}
