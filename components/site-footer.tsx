"use client";

import Link from "next/link";
import { useT } from "@/components/locale-provider";

export const SOURCE_URL = "https://github.com/Bisman-Singh/clausesaathi";

export function SiteFooter() {
  const t = useT();
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-start sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-1">
          <p className="font-medium text-text">{t("notAdvice")}</p>
          <p>{t("footerLaw")}</p>
        </div>
        <p className="flex flex-wrap gap-4">
          <Link href="/accessibility">{t("navAccessibility")}</Link>
          <a href={SOURCE_URL} rel="noopener">
            {t("footerSource")}
          </a>
        </p>
      </div>
    </footer>
  );
}
