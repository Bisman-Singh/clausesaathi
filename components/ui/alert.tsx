import type { ReactNode } from "react";

type Tone = "info" | "ok" | "warn" | "danger";

const TONES: Record<Tone, string> = {
  info: "bg-info-bg text-info-text",
  ok: "bg-ok-bg text-ok-text",
  warn: "bg-warn-bg text-warn-text",
  danger: "bg-danger-bg text-danger-text",
};

export interface AlertProps {
  tone?: Tone;
  /** `alert` interrupts (errors); `status` is polite (progress, results). */
  role?: "alert" | "status";
  children: ReactNode;
}

export function Alert({ tone = "info", role = "status", children }: AlertProps) {
  return (
    <div role={role} className={`rounded-md px-4 py-3 ${TONES[tone]}`}>
      {children}
    </div>
  );
}
