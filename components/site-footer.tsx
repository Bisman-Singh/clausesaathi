"use client";

import Link from "next/link";
import { useT } from "@/components/locale-provider";

export const SOURCE_URL = "https://github.com/Bisman-Singh/clausesaathi";

export function SiteFooter() {
  const t = useT();
  return (
    <footer className="mt-12 border-t border-line bg-surface">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 text-sm text-muted">
        <p>{t("notAdvice")}</p>
        <p>{t("footerLaw")}</p>
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
