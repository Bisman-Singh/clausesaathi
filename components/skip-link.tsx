"use client";

import { useT } from "@/components/locale-provider";

/** Visible only on focus; the first tab stop on every page. */
export function SkipLink() {
  const t = useT();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:font-medium focus:text-accent-text focus:no-underline"
    >
      {t("skipToContent")}
    </a>
  );
}
