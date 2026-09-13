"use client";

import { LocationButton } from "@/components/analyze/location-button";
import { useLocale, useT } from "@/components/locale-provider";
import { CONTROL_CLASS, Field } from "@/components/ui/field";
import { LIMITS } from "@/lib/constants";
import { INDIAN_STATES, stateName, type IndianState } from "@/lib/statute/jurisdiction";

/** Where the current value of the state select came from. */
export type StateSource =
  | { kind: "user" }
  | { kind: "location" }
  | { kind: "document"; evidence: string }
  | { kind: "none" };

export interface ContextFieldsProps {
  idPrefix: string;
  situation: string;
  onSituationChange: (value: string) => void;
  state: string;
  onStateChange: (value: string) => void;
  onLocate: (state: IndianState) => void;
  stateSource: StateSource;
}

function stateHint(
  source: StateSource,
  t: (
    key: "formStateDetected" | "formStateLocated" | "formStateManual",
    vars?: Record<string, string>,
  ) => string,
): string | undefined {
  if (source.kind === "document") return t("formStateDetected", { evidence: source.evidence });
  if (source.kind === "location") return t("formStateLocated");
  if (source.kind === "user") return t("formStateManual");
  return undefined;
}

/** The optional context: one line about the user and their state. */
export function ContextFields({
  idPrefix,
  situation,
  onSituationChange,
  state,
  onStateChange,
  onLocate,
  stateSource,
}: ContextFieldsProps) {
  const t = useT();
  const { locale } = useLocale();
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

      <Field id={`${idPrefix}-state`} label={t("formStateLabel")} hint={stateHint(stateSource, t)}>
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
                {stateName(name, locale)}
              </option>
            ))}
          </select>
        )}
      </Field>
      <LocationButton onLocate={onLocate} />
    </>
  );
}
