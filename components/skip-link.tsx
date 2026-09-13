"use client";

import { useT } from "@/components/locale-provider";

/** Visible only on focus; the first tab stop on every page. */
export function SkipLink() {
  const t = useT();
  return (
    <a
      href="#main-content"
      className="visually-hidden focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:h-auto focus:w-auto focus:overflow-visible focus:whitespace-normal focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-text focus:[clip:auto]"
    >
      {t("skipToContent")}
    </a>
  );
}
