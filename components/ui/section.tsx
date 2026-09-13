import type { ReactNode } from "react";

export interface SectionProps {
  id: string;
  title: string;
  children: ReactNode;
}

/** A labelled region so screen-reader users can jump between result parts. */
export function Section({ id, title, children }: SectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="flex scroll-mt-24 flex-col gap-3">
      <h3 id={headingId} className="text-xl font-semibold">
        {title}
      </h3>
      {children}
    </section>
  );
}
