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

export function SiteHeader() {
  const t = useT();
  const { locale, setLocale } = useLocale();
  const pathname = usePathname();

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-bold no-underline">
          {t("appName")}
        </Link>
        <nav aria-label="Main">
          <ul className="flex flex-wrap gap-4">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className="no-underline aria-[current=page]:underline"
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
