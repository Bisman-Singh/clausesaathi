"use client";

import { useLocale, useT } from "@/components/locale-provider";
import type { ClauseChange, ClauseChangeKind, DiffSegment } from "@/lib/compare/diff";
import type { ChangeExplanation } from "@/lib/compare/explain";
import type { TranslationKey } from "@/lib/i18n";

const KIND_KEY: Record<ClauseChangeKind, TranslationKey> = {
  unchanged: "compareUnchanged",
  modified: "compareModified",
  added: "compareAdded",
  removed: "compareRemoved",
};

const KIND_STYLE: Record<ClauseChangeKind, string> = {
  unchanged: "bg-surface text-muted",
  modified: "bg-warn-bg text-warn-text",
  added: "bg-ok-bg text-ok-text",
  removed: "bg-danger-bg text-danger-text",
};

const WHO_LABEL: Record<ChangeExplanation["whoBenefits"], { en: string; hi: string }> = {
  first_party: { en: "the drafting party", hi: "दस्तावेज़ बनाने वाला पक्ष" },
  second_party: { en: "the other party", hi: "दूसरा पक्ष" },
  both: { en: "both parties", hi: "दोनों पक्ष" },
  unclear: { en: "unclear", hi: "स्पष्ट नहीं" },
};

export interface DiffViewProps {
  changes: ClauseChange[];
  explanations: ChangeExplanation[];
  summary: Record<ClauseChangeKind, number>;
}

/** Clause-by-clause comparison with word-level highlights and explanations. */
export function DiffView({ changes, explanations, summary }: DiffViewProps) {
  const t = useT();
  const byIndex = new Map(explanations.map((item) => [item.index, item]));
  const nothingChanged = summary.modified + summary.added + summary.removed === 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="flex flex-wrap gap-2 text-sm" aria-label="Summary">
        {(Object.keys(summary) as ClauseChangeKind[]).map((kind) => (
          <span key={kind} className={`rounded px-2 py-0.5 ${KIND_STYLE[kind]}`}>
            {summary[kind]} {t(KIND_KEY[kind])}
          </span>
        ))}
      </p>
      {nothingChanged ? <p>{t("compareNoChanges")}</p> : null}
      <ol className="flex flex-col gap-3">
        {changes.map((change, index) => (
          <li key={index} className="rounded-md border border-line bg-surface p-3">
            <p className="mb-1 flex flex-wrap items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-sm ${KIND_STYLE[change.kind]}`}>
                {t(KIND_KEY[change.kind])}
              </span>
              <span className="font-medium">
                {change.after?.heading ?? change.before?.heading ?? ""}
              </span>
            </p>
            <ChangeBody change={change} />
            <Explanation item={byIndex.get(index)} />
          </li>
        ))}
      </ol>
    </div>
  );
}

function ChangeBody({ change }: { change: ClauseChange }) {
  if (change.kind === "modified" && change.segments) {
    return (
      <p className="whitespace-pre-wrap">
        {change.segments.map((segment, index) => (
          <Segment key={index} segment={segment} />
        ))}
      </p>
    );
  }
  if (change.kind === "modified") {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        <p className="whitespace-pre-wrap">{change.before?.text}</p>
        <p className="whitespace-pre-wrap">{change.after?.text}</p>
      </div>
    );
  }
  return <p className="whitespace-pre-wrap">{(change.after ?? change.before)?.text}</p>;
}

function Segment({ segment }: { segment: DiffSegment }) {
  if (segment.type === "same") return <>{segment.text} </>;
  if (segment.type === "added") {
    return (
      <ins className="rounded bg-diff-add px-0.5 no-underline">
        <span className="visually-hidden">+ </span>
        {segment.text}{" "}
      </ins>
    );
  }
  return (
    <del className="rounded bg-diff-del px-0.5">
      <span className="visually-hidden">- </span>
      {segment.text}{" "}
    </del>
  );
}

function Explanation({ item }: { item: ChangeExplanation | undefined }) {
  const t = useT();
  const { locale } = useLocale();
  if (!item) return null;
  return (
    <dl className="mt-2 text-sm">
      <dt className="inline font-medium">{t("compareWhatChanged")}: </dt>
      <dd className="inline">{item.whatChanged} </dd>
      <dt className="inline font-medium">{t("compareWhoBenefits")}: </dt>
      <dd className="inline">{WHO_LABEL[item.whoBenefits][locale]}</dd>
    </dl>
  );
}
