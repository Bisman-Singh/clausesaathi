"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { ContextFields } from "@/components/analyze/context-fields";
import { SampleSelect } from "@/components/analyze/sample-select";
import { useT } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { CONTROL_CLASS, Field } from "@/components/ui/field";
import { UPLOAD_ACCEPT, uploadMediaType } from "@/lib/document/upload";
import { LIMITS } from "@/lib/constants";
import type { TranslationKey } from "@/lib/i18n";
import type { SampleDocument } from "@/lib/samples";
import { detectState } from "@/lib/statute/detect-state";
import type { IndianState } from "@/lib/statute/jurisdiction";
import type { StateSource } from "@/components/analyze/context-fields";

export interface DocumentFormValues {
  text: string;
  file: File | null;
  situation: string;
  state: string;
  stateBasis: "user" | "location";
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
  const [locatedState, setLocatedState] = useState<IndianState | null>(null);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [sampleId, setSampleId] = useState<string | null>(null);
  // A state the user picked always wins, so a document about someone else's
  // flat in another state works. Otherwise the user's own location (only after
  // they asked for it), otherwise the document's own city or PIN as a guess
  // that is never sent: the server makes the same guess and says so.
  const detected = useMemo(() => detectState(text), [text]);
  const state = chosenState ?? locatedState ?? detected?.state ?? "";
  const source = stateSourceFor(chosenState, locatedState, detected?.evidence ?? null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = text.trim();
    const problem = validateInput(trimmed, file);
    setErrorKey(problem);
    if (!problem) {
      onSubmit({ text: trimmed, file, situation: situation.trim(), ...sentState });
    }
  }
  const sentState = sentStateFor(chosenState, locatedState);

  function chooseSample(sample: SampleDocument) {
    setText(sample.text);
    setSampleId(sample.id);
    setFile(null);
    setErrorKey(null);
  }

  function changeText(value: string) {
    setText(value);
    setSampleId(null);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={busy}
      className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
    >
      <div className="flex flex-col gap-5">
        <TextField
          id={`${id}-text`}
          text={text}
          onChange={changeText}
          error={errorKey ? t(errorKey) : null}
        />
        <Dropzone
          id={`${id}-file`}
          label={t("formFileLabel")}
          hint={t("formFileHint")}
          accept={UPLOAD_ACCEPT}
          file={file}
          onChange={setFile}
        />
      </div>

      <div className="flex flex-col gap-5 rounded-xl bg-surface-2 p-4 sm:p-5">
        <SampleSelect id={`${id}-sample`} selectedId={sampleId} onChoose={chooseSample} />
        <ContextFields
          idPrefix={id}
          situation={situation}
          onSituationChange={setSituation}
          state={state}
          onStateChange={setChosenState}
          onLocate={setLocatedState}
          stateSource={source}
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

/** What goes to the server: a chosen or located state with how it was arrived at, never the document guess. */
export function sentStateFor(
  chosen: string | null,
  located: IndianState | null,
): Pick<DocumentFormValues, "state" | "stateBasis"> {
  if (chosen !== null) return { state: chosen, stateBasis: "user" };
  if (located) return { state: located, stateBasis: "location" };
  return { state: "", stateBasis: "user" };
}

/** Which of the three possible origins the state select's value currently has. */
export function stateSourceFor(
  chosen: string | null,
  located: IndianState | null,
  evidence: string | null,
): StateSource {
  if (chosen !== null) return { kind: "user" };
  if (located) return { kind: "location" };
  if (evidence) return { kind: "document", evidence };
  return { kind: "none" };
}

interface TextFieldProps {
  id: string;
  text: string;
  onChange: (value: string) => void;
  error: string | null;
}

/** The document text box with its hint, error wiring and a live character count. */
function TextField({ id, text, onChange, error }: TextFieldProps) {
  const t = useT();
  const count = t("formTextCount", {
    n: text.length.toLocaleString("en-IN"),
    max: LIMITS.MAX_DOCUMENT_CHARS.toLocaleString("en-IN"),
  });
  return (
    <Field id={id} label={t("formTextLabel")} hint={t("formTextHint")} error={error}>
      {(describedBy, invalid) => (
        <>
          <textarea
            id={id}
            value={text}
            onChange={(event) => onChange(event.target.value)}
            rows={14}
            maxLength={LIMITS.MAX_DOCUMENT_CHARS}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            className={`${CONTROL_CLASS} font-mono text-sm leading-relaxed`}
          />
          <p className="text-right text-xs text-muted" aria-hidden="true">
            {count}
          </p>
        </>
      )}
    </Field>
  );
}
