"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useT } from "@/components/locale-provider";
import { LOCALES, type Locale } from "@/lib/constants";
import type { TranslationKey } from "@/lib/i18n";

const NAV: ReadonlyArray<{ href: string; key: TranslationKey }> = [
  { href: "/", key: "navAnalyze" },
  { href: "/compare", key: "navCompare" },
  { href: "/about", key: "navAbout" },
];

const LOCALE_NAMES: Record<Locale, string> = { en: "English", hi: "हिन्दी" };

/** The app mark: a page with a tick, the same drawing as the favicon. */
function Mark() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className="h-7 w-7 shrink-0">
      <rect width="64" height="64" rx="12" fill="#7c2d12" />
      <rect x="16" y="12" width="32" height="40" rx="3" fill="#fbfaf7" />
      <rect x="22" y="22" width="20" height="3" rx="1.5" fill="#7c2d12" />
      <rect x="22" y="30" width="20" height="3" rx="1.5" fill="#7c2d12" />
      <rect x="22" y="38" width="12" height="3" rx="1.5" fill="#7c2d12" />
      <circle cx="44" cy="44" r="7" fill="#fdba74" />
      <path
        d="M40.5 44l2.5 2.5 5-5"
        stroke="#1c1917"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SiteHeader() {
  const t = useT();
  const { locale, setLocale } = useLocale();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-text no-underline">
          <Mark />
          <span className="font-heading">{t("appName")}</span>
        </Link>
        <nav aria-label="Main">
          <ul className="flex flex-wrap gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-text no-underline hover:bg-surface-2 aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent"
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <label className="flex items-center gap-2 text-sm">
          <span>{t("languageLabel")}</span>
          <select
            value={locale}
            onChange={(event) => setLocale(event.target.value as Locale)}
            className="min-h-11 rounded-md border border-line bg-surface px-2"
          >
            {LOCALES.map((code) => (
              <option key={code} value={code} lang={code === "hi" ? "hi-IN" : "en-IN"}>
                {LOCALE_NAMES[code]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </header>
  );
}
