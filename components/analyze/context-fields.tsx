"use client";

import { useT } from "@/components/locale-provider";
import { CONTROL_CLASS, Field } from "@/components/ui/field";
import { LIMITS } from "@/lib/constants";
import { INDIAN_STATES } from "@/lib/statute/jurisdiction";

export interface ContextFieldsProps {
  idPrefix: string;
  situation: string;
  onSituationChange: (value: string) => void;
  state: string;
  onStateChange: (value: string) => void;
  /** The words in the document the state was guessed from, when it was guessed. */
  detectedFrom: string | null;
}

/** The optional context: one line about the user and their state. */
export function ContextFields({
  idPrefix,
  situation,
  onSituationChange,
  state,
  onStateChange,
  detectedFrom,
}: ContextFieldsProps) {
  const t = useT();
  return (
    <>
      <Field
        id={`${idPrefix}-situation`}
        label={t("formSituationLabel")}
        hint={t("formSituationHint")}
      >
        {(describedBy) => (
          <input
            id={`${idPrefix}-situation`}
            type="text"
            value={situation}
            onChange={(event) => onSituationChange(event.target.value)}
            maxLength={LIMITS.MAX_SITUATION_CHARS}
            aria-describedby={describedBy}
            className={`${CONTROL_CLASS} min-h-11`}
          />
        )}
      </Field>

      <Field
        id={`${idPrefix}-state`}
        label={t("formStateLabel")}
        hint={detectedFrom ? t("formStateDetected", { evidence: detectedFrom }) : undefined}
      >
        {(describedBy) => (
          <select
            id={`${idPrefix}-state`}
            value={state}
            onChange={(event) => onStateChange(event.target.value)}
            aria-describedby={describedBy}
            className={`${CONTROL_CLASS} min-h-11`}
          >
            <option value="">{t("formStatePlaceholder")}</option>
            {INDIAN_STATES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        )}
      </Field>
    </>
  );
}
