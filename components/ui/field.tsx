import type { ReactNode } from "react";

export interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: (describedBy: string | undefined, invalid: boolean) => ReactNode;
}

/**
 * Label, hint and error wiring for one form control. The control receives the
 * ids to reference so assistive tech reads hint and error with the label.
 */
export function Field({ id, label, hint, error, children }: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {children(describedBy, Boolean(error))}
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger-text">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const CONTROL_CLASS =
  "w-full rounded-lg border border-control-line bg-surface px-3 py-2 text-text placeholder:text-muted hover:border-text aria-[invalid=true]:border-danger-text";
