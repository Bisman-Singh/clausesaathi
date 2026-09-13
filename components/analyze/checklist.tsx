"use client";

import { useId, useState } from "react";
import { useT } from "@/components/locale-provider";
import { Section } from "@/components/ui/section";

export interface ChecklistProps {
  id: string;
  title: string;
  items: string[];
}

/** The things to gather, as boxes the reader can tick off while they collect them. */
export function Checklist({ id, title, items }: ChecklistProps) {
  const t = useT();
  const inputId = useId();
  const [done, setDone] = useState<boolean[]>(() => items.map(() => false));
  if (items.length === 0) return null;
  const remaining = done.filter((flag) => !flag).length;

  function toggle(index: number) {
    setDone(done.map((flag, at) => (at === index ? !flag : flag)));
  }

  return (
    <Section id={id} title={title}>
      <ul className="flex flex-col gap-2">
        {items.map((item, index) => (
          <li key={index}>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface p-3 has-checked:bg-surface-2">
              <input
                id={`${inputId}-${index}`}
                type="checkbox"
                checked={done[index] === true}
                onChange={() => toggle(index)}
                className="mt-1 h-5 w-5 accent-accent"
              />
              <span className={done[index] ? "text-muted line-through" : ""}>{item}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted" aria-live="polite">
        {t("checklistRemaining", { n: remaining, total: items.length })}
      </p>
    </Section>
  );
}
