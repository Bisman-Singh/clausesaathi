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
  stateBasis: "user" | "location" | "none";
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
    if (busy) return;
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

  function changeFile(next: File | null) {
    setFile(next);
    setErrorKey(null);
  }

  const { textError, fileError } = splitError(errorKey, t);

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-busy={busy}
      className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:grid-rows-[auto_auto]"
    >
      <InputColumn
        id={id}
        text={text}
        onText={changeText}
        textError={textError}
        file={file}
        fileError={fileError}
        onFile={changeFile}
        busy={busy}
      />

      <div className="flex flex-col gap-5 rounded-xl bg-surface-2 p-4 sm:p-5 lg:row-span-2">
        <h3 className="text-base font-semibold">{t("formOptionalHeading")}</h3>
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
      </div>

      <div className="lg:col-start-1">
        <SubmitButton busy={busy} />
      </div>
    </form>
  );
}

/** Error keys that concern the uploaded file rather than the pasted text. */
const FILE_ERRORS = new Set<TranslationKey>(["errorFileTooLarge", "errorUnsupportedFile"]);

/** A file error belongs on the file control; everything else on the text box. */
function splitError(
  errorKey: TranslationKey | null,
  t: (key: TranslationKey) => string,
): { textError: string | null; fileError: string | null } {
  if (!errorKey) return { textError: null, fileError: null };
  const message = t(errorKey);
  return FILE_ERRORS.has(errorKey)
    ? { textError: null, fileError: message }
    : { textError: message, fileError: null };
}

/** Says which input wins when both a file and pasted text are present. */
function FileOverridesHint({ show }: { show: boolean }) {
  const t = useT();
  if (!show) return null;
  return (
    <p className="text-sm text-warn-text" role="status">
      {t("formFileOverridesText")}
    </p>
  );
}

/**
 * Stays focusable while busy (a disabled button drops keyboard focus to the
 * page); the form ignores a second submit through `aria-busy` instead.
 */
function SubmitButton({ busy }: { busy: boolean }) {
  const t = useT();
  return (
    <Button type="submit" aria-disabled={busy} className="w-full">
      {busy ? t("formSubmitting") : t("formSubmit")}
    </Button>
  );
}

/**
 * What goes to the server: a chosen or located state with how it was arrived
 * at, "none" when the user cleared the select on purpose, and otherwise
 * nothing, so the server makes the document guess itself and says so.
 */
export function sentStateFor(
  chosen: string | null,
  located: IndianState | null,
): Pick<DocumentFormValues, "state" | "stateBasis"> {
  if (chosen === "") return { state: "", stateBasis: "none" };
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
            aria-describedby={[describedBy, `${id}-count`].filter(Boolean).join(" ")}
            aria-invalid={invalid}
            className={`${CONTROL_CLASS} font-mono text-sm leading-relaxed`}
          />
          <p id={`${id}-count`} className="text-right text-xs text-muted">
            {count}
          </p>
        </>
      )}
    </Field>
  );
}

interface InputColumnProps {
  id: string;
  text: string;
  onText: (value: string) => void;
  textError: string | null;
  file: File | null;
  fileError: string | null;
  onFile: (file: File | null) => void;
  busy: boolean;
}

/** The document itself: the text box and the file picker. */
function InputColumn(props: InputColumnProps) {
  const t = useT();
  return (
    <div className="flex flex-col gap-5">
      <TextField
        id={`${props.id}-text`}
        text={props.text}
        onChange={props.onText}
        error={props.textError}
      />
      <Dropzone
        id={`${props.id}-file`}
        label={t("formFileLabel")}
        hint={t("formFileHint")}
        error={props.fileError}
        accept={UPLOAD_ACCEPT}
        file={props.file}
        onChange={props.onFile}
      />
      <FileOverridesHint show={props.file !== null && props.text.trim().length > 0} />
    </div>
  );
}
