"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { DEFAULT_LOCALE, type Locale } from "@/lib/constants";
import { htmlLang, isLocale, t, type TranslationKey } from "@/lib/i18n";

/**
 * Interface language, remembered per browser. Changing it updates the
 * document's `lang` so screen readers switch voices with the text.
 *
 * The choice lives in a tiny external store read through
 * `useSyncExternalStore`, so the server renders the default and the browser
 * takes over with the stored value without a hydration mismatch.
 */

const STORAGE_KEY = "clausesaathi.locale";
const listeners = new Set<() => void>();
let memoryLocale: Locale | null = null;

export function readStoredLocale(storage: Pick<Storage, "getItem">): Locale {
  try {
    const stored = storage.getItem(STORAGE_KEY);
    return isLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): Locale {
  return memoryLocale ?? readStoredLocale(window.localStorage);
}

function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

/** Change the locale for every subscriber, persisting when storage allows. */
export function writeLocale(next: Locale, storage: Pick<Storage, "setItem"> | null): void {
  memoryLocale = next;
  try {
    storage?.setItem(STORAGE_KEY, next);
  } catch {
    // Private mode or blocked storage: the choice still applies for this page.
  }
  listeners.forEach((listener) => listener());
}

/** Forget the in-memory override. Used by tests. */
export function resetLocaleStore(): void {
  memoryLocale = null;
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.lang = htmlLang(locale);
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale: (next) => writeLocale(next, window.localStorage) }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

/** A translator bound to the current locale. */
export function useT(): (key: TranslationKey, vars?: Record<string, string | number>) => string {
  const { locale } = useLocale();
  return (key, vars) => t(locale, key, vars);
}
