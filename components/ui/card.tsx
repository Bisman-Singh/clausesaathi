import type { HTMLAttributes } from "react";

/** A bordered panel on the surface colour; the unit every screen is built from. */
export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={`rounded-xl border border-line bg-surface p-5 shadow-card sm:p-6 ${className}`}
    />
  );
}
