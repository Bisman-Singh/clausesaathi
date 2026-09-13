"use client";

import { useLocale, useT } from "@/components/locale-provider";
import { CONTROL_CLASS, Field } from "@/components/ui/field";
import { SAMPLES } from "@/lib/samples";

export interface SampleSelectProps {
  id: string;
  onChoose: (sampleId: string) => void;
}

/** Pick one of the synthetic sample documents to try the product. */
export function SampleSelect({ id, onChoose }: SampleSelectProps) {
  const t = useT();
  const { locale } = useLocale();
  return (
    <Field id={id} label={t("formSampleLabel")}>
      {() => (
        <select
          id={id}
          defaultValue=""
          onChange={(event) => onChoose(event.target.value)}
          className={`${CONTROL_CLASS} min-h-11`}
        >
          <option value="">{t("formSamplePlaceholder")}</option>
          {SAMPLES.map((sample) => (
            <option key={sample.id} value={sample.id}>
              {sample.title[locale]}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}
