"use client";

import { useT } from "@/components/locale-provider";
import type { TranslationKey } from "@/lib/i18n";

const POINTS: TranslationKey[] = ["heroPoint1", "heroPoint2", "heroPoint3"];

/** The page title and the three things the product promises, above the form. */
export function Hero() {
  const t = useT();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium uppercase tracking-wide text-accent">{t("heroEyebrow")}</p>
      <h1 className="max-w-3xl text-3xl font-bold sm:text-4xl">{t("heroTitle")}</h1>
      <p className="max-w-2xl text-lg text-muted">{t("heroSubtitle")}</p>
      <ul className="flex flex-wrap gap-2 text-sm">
        {POINTS.map((key) => (
          <li
            key={key}
            className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-3 py-1.5"
          >
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
            {t(key)}
          </li>
        ))}
      </ul>
    </div>
  );
}
