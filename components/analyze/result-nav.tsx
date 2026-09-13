"use client";

import { useT } from "@/components/locale-provider";
import type { TranslationKey } from "@/lib/i18n";

export interface ResultNavProps {
  /** Section ids in page order, only those actually rendered. */
  sections: Array<{ id: string; key: TranslationKey }>;
}

/** In-page links to each result section; sticky beside the result on wide screens. */
export function ResultNav({ sections }: ResultNavProps) {
  const t = useT();
  return (
    <nav aria-label={t("resultNav")} className="lg:sticky lg:top-20">
      <p className="mb-2 text-sm font-medium uppercase tracking-wide text-muted">
        {t("resultNav")}
      </p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm lg:flex-col">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="inline-block py-1 text-text no-underline hover:underline"
            >
              {t(section.key)}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
