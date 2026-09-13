"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from "react";
import { DiffView } from "@/components/compare/diff-view";
import { useLocale, useT } from "@/components/locale-provider";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
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
  const [shortFields, setShortFields] = useState<{ before: boolean; after: boolean }>({
    before: false,
    after: false,
  });
  const [result, setResult] = useState<CompareResponse | null>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (result && !busy) resultRef.current?.focus();
  }, [result, busy]);

  function loadSample() {
    setBefore(RENT_AGREEMENT_V1);
    setAfter(RENT_AGREEMENT_V2);
    setErrorKey(null);
    setShortFields({ before: false, after: false });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const short = { before: tooShort(before), after: tooShort(after) };
    setShortFields(short);
    if (short.before || short.after) return;
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
        <h1 id="compare-heading" className="text-3xl font-bold sm:text-4xl">
          {t("compareHeading")}
        </h1>
        <p className="max-w-2xl text-lg text-muted">{t("compareIntro")}</p>
        <Card>
          <CompareForm
            id={id}
            before={before}
            after={after}
            busy={busy}
            short={shortFields}
            onBefore={setBefore}
            onAfter={setAfter}
            onSubmit={handleSubmit}
            onSample={loadSample}
          />
        </Card>
        {busy ? <Alert>{t("compareSubmitting")}</Alert> : null}
        {errorKey ? (
          <Alert tone="danger" role="alert">
            {t(errorKey)}
          </Alert>
        ) : null}
      </section>
      {result ? <CompareResult result={result} headingRef={resultRef} /> : null}
    </div>
  );
}

interface CompareResultProps {
  result: CompareResponse;
  headingRef: RefObject<HTMLHeadingElement | null>;
}

/** The diff under a heading that takes focus when the comparison arrives. */
function CompareResult({ result, headingRef }: CompareResultProps) {
  const t = useT();
  return (
    <section aria-labelledby="compare-result-heading" className="flex flex-col gap-4">
      <h2 id="compare-result-heading" ref={headingRef} tabIndex={-1} className="text-2xl font-bold">
        {t("compareResultHeading")}
      </h2>
      <DiffView
        changes={result.changes}
        explanations={result.explanations}
        summary={result.summary}
      />
    </section>
  );
}

interface CompareFormProps {
  id: string;
  before: string;
  after: string;
  busy: boolean;
  short: { before: boolean; after: boolean };
  onBefore: (value: string) => void;
  onAfter: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSample: () => void;
}

/** The two version boxes with their own errors, the compare button and the sample loader. */
function CompareForm(props: CompareFormProps) {
  const t = useT();
  return (
    <form
      onSubmit={props.onSubmit}
      noValidate
      aria-busy={props.busy}
      className="flex flex-col gap-5"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <VersionField
          id={`${props.id}-before`}
          label={t("compareBeforeLabel")}
          value={props.before}
          onChange={props.onBefore}
          error={props.short.before ? t("errorTooShort") : null}
        />
        <VersionField
          id={`${props.id}-after`}
          label={t("compareAfterLabel")}
          value={props.after}
          onChange={props.onAfter}
          error={props.short.after ? t("errorTooShort") : null}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" aria-disabled={props.busy}>
          {props.busy ? t("compareSubmitting") : t("compareSubmit")}
        </Button>
        <Button type="button" variant="secondary" onClick={props.onSample}>
          {t("compareLoadSample")}
        </Button>
      </div>
    </form>
  );
}

interface VersionFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
}

function VersionField({ id, label, value, onChange, error }: VersionFieldProps) {
  const t = useT();
  return (
    <Field id={id} label={label} hint={t("compareVersionHint")} error={error}>
      {(describedBy, invalid) => (
        <textarea
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid}
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
