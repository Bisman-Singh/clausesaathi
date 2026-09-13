"use client";

import { useRef, useState, type DragEvent } from "react";
import { useT } from "@/components/locale-provider";

export interface DropzoneProps {
  id: string;
  /** Visible label text for the native input, read by assistive tech. */
  label: string;
  hint: string;
  error?: string | null;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
}

/** The chosen file, or an invitation to drop one; announced politely as it changes. */
function DropStatus({ file, dragging }: { file: File | null; dragging: boolean }) {
  const t = useT();
  let text = t("uploadDropHint");
  if (file) text = t("uploadSelected", { name: file.name, size: formatBytes(file.size) });
  else if (dragging) text = t("uploadDropNow");
  return (
    <span className="text-sm text-muted" aria-live="polite">
      {text}
    </span>
  );
}

/** Bytes as a short human figure. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * A file picker that behaves like a control. The native input is the single
 * tab stop (visually hidden, its focus ring drawn on the visible button), the
 * dashed target lights up while a file is dragged over it, and a chip shows
 * what was chosen with a way to remove it. Hint and error are announced with
 * the input, like every other field.
 */
export function Dropzone({ id, label, hint, error, accept, file, onChange }: DropzoneProps) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  // Remounting the native input is the one reliable way to clear a chosen file.
  const [inputKey, setInputKey] = useState(0);
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    onChange(event.dataTransfer.files[0] ?? null);
  }

  function handleDrag(event: DragEvent<HTMLDivElement>, over: boolean) {
    event.preventDefault();
    setDragging(over);
  }

  function clear() {
    onChange(null);
    setInputKey((key) => key + 1);
  }

  const zone = dragging
    ? "border-accent bg-accent-soft"
    : "border-control-line bg-surface-2 hover:border-text";

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <p id={hintId} className="text-sm text-muted">
        {hint}
      </p>
      <div
        onDragOver={(event) => handleDrag(event, true)}
        onDragLeave={(event) => handleDrag(event, false)}
        onDrop={handleDrop}
        className={`flex flex-wrap items-center gap-3 rounded-lg border-2 border-dashed p-3 transition-colors ${zone}`}
      >
        <input
          key={inputKey}
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          aria-invalid={Boolean(error)}
          className="peer visually-hidden"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-control-line bg-surface px-4 text-sm font-medium transition-[transform,background-color,border-color] peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus hover:border-accent hover:bg-accent-soft active:scale-[0.97]"
        >
          <span aria-hidden="true">⇪</span>
          {t("uploadChoose")}
        </button>
        <DropStatus file={file} dragging={dragging} />
        {file ? (
          <button
            type="button"
            onClick={clear}
            className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-danger-text underline-offset-2 hover:underline active:scale-[0.97]"
          >
            {t("uploadRemove")}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}
