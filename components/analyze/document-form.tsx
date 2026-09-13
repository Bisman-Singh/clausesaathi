"use client";

import { useId, useState, type FormEvent } from "react";
import { ContextFields } from "@/components/analyze/context-fields";
import { SampleSelect } from "@/components/analyze/sample-select";
import { useT } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { CONTROL_CLASS, Field } from "@/components/ui/field";
import { LIMITS } from "@/lib/constants";
import { UPLOAD_ACCEPT, uploadMediaType } from "@/lib/document/upload";
import type { TranslationKey } from "@/lib/i18n";
import { findSample } from "@/lib/samples";

export interface DocumentFormValues {
  text: string;
  file: File | null;
  situation: string;
  state: string;
}

export interface DocumentFormProps {
  busy: boolean;
  onSubmit: (values: DocumentFormValues) => void;
}

/** Client-side validation; returns the error key or null when the input is usable. */
export function validateInput(text: string, file: File | null): TranslationKey | null {
  if (!file && text.length === 0) return "errorEmpty";
  if (!file && text.length < LIMITS.MIN_DOCUMENT_CHARS) return "errorTooShort";
  if (text.length > LIMITS.MAX_DOCUMENT_CHARS) return "errorTooLong";
  if (file && uploadMediaType(file) === null) return "errorUnsupportedFile";
  if (file && file.size > LIMITS.MAX_UPLOAD_BYTES) return "errorFileTooLarge";
  return null;
}

/**
 * The single entry point: paste text, upload a PDF or a photo, or pick a
 * sample; say a line about your situation; optionally choose your state.
 */
export function DocumentForm({ busy, onSubmit }: DocumentFormProps) {
  const t = useT();
  const id = useId();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [situation, setSituation] = useState("");
  const [state, setState] = useState("");
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = text.trim();
    const problem = validateInput(trimmed, file);
    setErrorKey(problem);
    if (!problem) onSubmit({ text: trimmed, file, situation: situation.trim(), state });
  }

  function chooseSample(sampleId: string) {
    const sample = findSample(sampleId);
    setText(sample ? sample.text : "");
    setFile(null);
    setErrorKey(null);
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-busy={busy} className="flex flex-col gap-5">
      <Field
        id={`${id}-text`}
        label={t("formTextLabel")}
        hint={t("formTextHint")}
        error={errorKey ? t(errorKey) : null}
      >
        {(describedBy, invalid) => (
          <textarea
            id={`${id}-text`}
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={12}
            maxLength={LIMITS.MAX_DOCUMENT_CHARS}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            className={CONTROL_CLASS}
          />
        )}
      </Field>

      <Field id={`${id}-file`} label={t("formFileLabel")} hint={t("formFileHint")}>
        {(describedBy) => (
          <input
            id={`${id}-file`}
            type="file"
            accept={UPLOAD_ACCEPT}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            aria-describedby={describedBy}
            className="min-h-11"
          />
        )}
      </Field>

      <SampleSelect id={`${id}-sample`} onChoose={chooseSample} />

      <ContextFields
        idPrefix={id}
        situation={situation}
        onSituationChange={setSituation}
        state={state}
        onStateChange={setState}
      />

      <div>
        <Button type="submit" disabled={busy}>
          {busy ? t("formSubmitting") : t("formSubmit")}
        </Button>
      </div>
    </form>
  );
}
