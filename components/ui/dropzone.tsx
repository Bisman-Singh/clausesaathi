"use client";

import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { useT } from "@/components/locale-provider";

export interface DropzoneProps {
  id: string;
  /** Visible label text for the native input, read by assistive tech. */
  label: string;
  hint: ReactNode;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
  describedBy?: string;
}

/** Bytes as a short human figure. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * A file picker that behaves like a control: a real button to open the file
 * dialog with hover, pressed and focus states, a drop target that lights up
 * while a file is dragged over it, and a chip showing what was chosen with a
 * way to remove it. The native input stays in the DOM, labelled, so keyboard
 * and assistive tech use it directly.
 */
export function Dropzone({ id, label, hint, accept, file, onChange, describedBy }: DropzoneProps) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  // Remounting the native input is the one reliable way to clear a chosen file.
  const [inputKey, setInputKey] = useState(0);

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
    : "border-line bg-surface-2 hover:border-muted";

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <p className="text-sm text-muted">{hint}</p>
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
          aria-describedby={describedBy}
          className="visually-hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm font-medium transition-[transform,background-color,border-color] hover:border-accent hover:bg-accent-soft active:scale-[0.97]"
        >
          <span aria-hidden="true">⇪</span>
          {t("uploadChoose")}
        </button>
        <span className="text-sm text-muted" aria-live="polite">
          {file ? t("uploadSelected", { name: file.name, size: formatBytes(file.size) }) : null}
          {!file && dragging ? t("uploadDropNow") : null}
          {!file && !dragging ? t("uploadDropHint") : null}
        </span>
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
    </div>
  );
}
