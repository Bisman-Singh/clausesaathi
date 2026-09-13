"use client";

import { useLocale, useT } from "@/components/locale-provider";
import { SAMPLES, type SampleDocument } from "@/lib/samples";

export interface SampleSelectProps {
  id: string;
  onChoose: (sample: SampleDocument) => void;
}

/** Pick one of the synthetic sample documents to try the product. */
export function SampleSelect({ id, onChoose }: SampleSelectProps) {
  const t = useT();
  const { locale } = useLocale();
  return (
    <div role="group" aria-labelledby={`${id}-label`} className="flex flex-col gap-2">
      <p id={`${id}-label`} className="font-medium">
        {t("formSampleLabel")}
      </p>
      <ul className="flex flex-wrap gap-2">
        {SAMPLES.map((sample) => (
          <li key={sample.id}>
            <button
              type="button"
              onClick={() => onChoose(sample)}
              className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-4 text-sm font-medium hover:border-accent hover:bg-accent-soft"
            >
              {sample.title[locale]}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
