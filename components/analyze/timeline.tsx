"use client";

import { useId, useState } from "react";
import { useT } from "@/components/locale-provider";
import { ClauseLink } from "@/components/analyze/clause-link";
import { CONTROL_CLASS } from "@/components/ui/field";
import type { Obligation } from "@/lib/analysis/schemas";
import {
  buildTimeline,
  requiredAnchors,
  type AnchorDates,
  type AnchorKey,
  type ResolvedDeadline,
} from "@/lib/deadlines/compute";
import type { ParsedDocument } from "@/lib/document/types";
import type { TranslationKey } from "@/lib/i18n";

export interface TimelineProps {
  document: ParsedDocument;
  obligations: Obligation[];
  /** ISO date for "today"; injectable so tests are deterministic. */
  today: string;
}

/**
 * Obligations with their deadlines. Relative deadlines ask for the anchor
 * date they count from and are computed on the client, deterministically.
 */
export function Timeline({ document, obligations, today }: TimelineProps) {
  const t = useT();
  const id = useId();
  const [anchors, setAnchors] = useState<AnchorDates>({});
  const needed = requiredAnchors(obligations);
  const items = buildTimeline(obligations, anchors, today);

  return (
    <div className="flex flex-col gap-4">
      {needed.length > 0 ? (
        <fieldset className="rounded-lg border border-line bg-surface-2 p-4">
          <legend className="px-1 font-medium">{t("anchorHeading")}</legend>
          <p className="mb-3 text-sm text-muted">{t("anchorHint")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {needed.map((key) => (
              <div key={key} className="flex flex-col gap-1">
                <label htmlFor={`${id}-${key}`}>{t(`anchor_${key}` as TranslationKey)}</label>
                <input
                  id={`${id}-${key}`}
                  type="date"
                  value={anchors[key] ?? ""}
                  onChange={(event) =>
                    setAnchors({ ...anchors, [key]: event.target.value || undefined })
                  }
                  className={`${CONTROL_CLASS} min-h-11`}
                />
              </div>
            ))}
          </div>
        </fieldset>
      ) : null}

      <ol className="flex flex-col gap-3 border-l-2 border-line pl-5">
        {items.map(({ obligation, resolved }, index) => (
          <li
            key={`${obligation.clauseId}-${index}`}
            className="relative rounded-lg border border-line bg-surface p-3 before:absolute before:-left-[1.7rem] before:top-4 before:h-3 before:w-3 before:rounded-full before:bg-accent"
          >
            <p>
              <strong>{obligation.party}</strong>: {obligation.action}{" "}
              <ClauseLink document={document} clauseId={obligation.clauseId} />
            </p>
            <p className="text-sm text-muted">
              <DeadlineText resolved={resolved} translate={t} />
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

interface DeadlineTextProps {
  resolved: ResolvedDeadline;
  translate: (key: TranslationKey) => string;
}

function DeadlineText({ resolved, translate }: DeadlineTextProps) {
  if (resolved.status === "unspecified") return <>{translate("timelineUnspecified")}</>;
  if (resolved.status === "needs_anchor") {
    return (
      <>
        {resolved.days} {translate("timelineDays")} · {translate("timelineNeedsAnchor")}{" "}
        {translate(`anchor_${resolved.anchor}` as TranslationKey)}
      </>
    );
  }
  return (
    <>
      {translate("timelineDated")} {resolved.date} ·{" "}
      <DaysLeft days={resolved.daysLeft} translate={translate} />
    </>
  );
}

function DaysLeft({
  days,
  translate,
}: {
  days: number;
  translate: (key: TranslationKey) => string;
}) {
  if (days === 0) return <>{translate("timelineToday")}</>;
  if (days < 0)
    return (
      <>
        {Math.abs(days)} {translate("timelineOverdue")}
      </>
    );
  return (
    <>
      {days} {translate("timelineDaysLeft")}
    </>
  );
}

export type { AnchorKey };
