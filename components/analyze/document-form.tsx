"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { ContextFields } from "@/components/analyze/context-fields";
import { SampleSelect } from "@/components/analyze/sample-select";
import { useT } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { CONTROL_CLASS, Field } from "@/components/ui/field";
import { LIMITS } from "@/lib/constants";
import { UPLOAD_ACCEPT, uploadMediaType } from "@/lib/document/upload";
import type { TranslationKey } from "@/lib/i18n";
import type { SampleDocument } from "@/lib/samples";
import { detectState } from "@/lib/statute/detect-state";

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
  const [chosenState, setChosenState] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  // The document's own city or PIN prefills the state until the user picks one.
  // Only a state the user actually chose is sent; the server makes the same
  // guess itself and then says so in the result.
  const detected = useMemo(() => detectState(text), [text]);
  const state = chosenState ?? detected?.state ?? "";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = text.trim();
    const problem = validateInput(trimmed, file);
    setErrorKey(problem);
    if (!problem) {
      onSubmit({ text: trimmed, file, situation: situation.trim(), state: chosenState ?? "" });
    }
  }

  function chooseSample(sample: SampleDocument) {
    setText(sample.text);
    setFile(null);
    setErrorKey(null);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={busy}
      className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
    >
      <div className="flex flex-col gap-5">
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
              rows={14}
              maxLength={LIMITS.MAX_DOCUMENT_CHARS}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              className={`${CONTROL_CLASS} font-mono text-sm leading-relaxed`}
            />
          )}
        </Field>
        <UploadField id={`${id}-file`} onChange={setFile} />
      </div>

      <div className="flex flex-col gap-5 rounded-xl bg-surface-2 p-4 sm:p-5">
        <SampleSelect id={`${id}-sample`} onChoose={chooseSample} />
        <ContextFields
          idPrefix={id}
          situation={situation}
          onSituationChange={setSituation}
          state={state}
          onStateChange={setChosenState}
          detectedFrom={chosenState === null && detected ? detected.evidence : null}
        />
        <div className="mt-auto">
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? t("formSubmitting") : t("formSubmit")}
          </Button>
        </div>
      </div>
    </form>
  );
}

/** The PDF or photo input, styled as a drop zone but still a plain file control. */
function UploadField({ id, onChange }: { id: string; onChange: (file: File | null) => void }) {
  const t = useT();
  return (
    <Field id={id} label={t("formFileLabel")} hint={t("formFileHint")}>
      {(describedBy) => (
        <input
          id={id}
          type="file"
          accept={UPLOAD_ACCEPT}
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
          aria-describedby={describedBy}
          className="min-h-11 w-full rounded-lg border border-dashed border-line bg-surface-2 p-3 text-sm"
        />
      )}
    </Field>
  );
}
