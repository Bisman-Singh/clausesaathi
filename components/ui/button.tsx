import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";

const STYLES: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-text shadow-card hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed",
  secondary:
    "bg-surface text-text border border-line hover:border-accent hover:bg-accent-soft disabled:opacity-60 disabled:cursor-not-allowed",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

/** A button with a 44px minimum target size and a visible focus ring. */
export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center rounded-lg px-5 py-2 font-medium transition-[transform,background-color,border-color,opacity] active:scale-[0.97] disabled:active:scale-100 ${STYLES[variant]} ${className}`}
    />
  );
}
