"use client";

import { useId, useState, type FormEvent } from "react";
import { DiffView } from "@/components/compare/diff-view";
import { useLocale, useT } from "@/components/locale-provider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CONTROL_CLASS, Field } from "@/components/ui/field";
import { compare, errorKeyFor, type CompareResponse } from "@/lib/client/api";
import { LIMITS } from "@/lib/constants";
import type { TranslationKey } from "@/lib/i18n";
import { RENT_AGREEMENT_V1, RENT_AGREEMENT_V2 } from "@/lib/samples";

function tooShort(text: string): boolean {
  return text.trim().length < LIMITS.MIN_DOCUMENT_CHARS;
}

/** Two versions in, a clause-level diff with plain-language explanations out. */
export function CompareWorkspace() {
  const t = useT();
  const { locale } = useLocale();
  const id = useId();
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);

  function loadSample() {
    setBefore(RENT_AGREEMENT_V1);
    setAfter(RENT_AGREEMENT_V2);
    setErrorKey(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (tooShort(before) || tooShort(after)) return setErrorKey("errorTooShort");
    setBusy(true);
    setErrorKey(null);
    try {
      setResult(await compare(before, after, locale));
    } catch (error) {
      setErrorKey(errorKeyFor(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="compare-heading" className="flex flex-col gap-4">
        <h1 id="compare-heading" className="text-2xl font-bold">
          {t("compareHeading")}
        </h1>
        <p className="text-muted">{t("compareIntro")}</p>
        <form onSubmit={handleSubmit} noValidate aria-busy={busy} className="flex flex-col gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <VersionField
              id={`${id}-before`}
              label={t("compareBeforeLabel")}
              value={before}
              onChange={setBefore}
            />
            <VersionField
              id={`${id}-after`}
              label={t("compareAfterLabel")}
              value={after}
              onChange={setAfter}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? t("compareSubmitting") : t("compareSubmit")}
            </Button>
            <Button type="button" variant="secondary" onClick={loadSample}>
              {t("formSampleLabel")}
            </Button>
          </div>
        </form>
        {errorKey ? (
          <Alert tone="danger" role="alert">
            {t(errorKey)}
          </Alert>
        ) : null}
      </section>
      {result ? (
        <DiffView
          changes={result.changes}
          explanations={result.explanations}
          summary={result.summary}
        />
      ) : null}
    </div>
  );
}

interface VersionFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function VersionField({ id, label, value, onChange }: VersionFieldProps) {
  return (
    <Field id={id} label={label}>
      {() => (
        <textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={14}
          maxLength={LIMITS.MAX_DOCUMENT_CHARS}
          className={CONTROL_CLASS}
        />
      )}
    </Field>
  );
}
