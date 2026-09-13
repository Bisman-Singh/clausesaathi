"use client";

import { useLocale, useT } from "@/components/locale-provider";
import type { Locale } from "@/lib/constants";
import type { ContentSection } from "@/lib/content/pages";
import type { TranslationKey } from "@/lib/i18n";

export interface ContentPageProps {
  titleKey: TranslationKey;
  content: Record<Locale, ContentSection[]>;
}

/** A bilingual long-form page rendered from structured copy. */
export function ContentPage({ titleKey, content }: ContentPageProps) {
  const t = useT();
  const { locale } = useLocale();
  return (
    <article className="flex max-w-3xl flex-col gap-8">
      <h1 className="text-2xl font-bold">{t(titleKey)}</h1>
      {content[locale].map((section) => (
        <section key={section.heading} className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">{section.heading}</h2>
          {section.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
          {section.bullets ? (
            <ul className="flex list-disc flex-col gap-2 pl-5">
              {section.bullets.map((bullet, index) => (
                <li key={index}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </article>
  );
}
