"use client";

import { useT } from "@/components/locale-provider";
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
  unchanged: "bg-surface-2 text-muted",
  modified: "bg-warn-bg text-warn-text",
  added: "bg-ok-bg text-ok-text",
  removed: "bg-danger-bg text-danger-text",
};

const KIND_EDGE: Record<ClauseChangeKind, string> = {
  unchanged: "border-l-line",
  modified: "border-l-warn-text",
  added: "border-l-ok-text",
  removed: "border-l-danger-text",
};

const SEVERITY_KEY: Record<ChangeExplanation["severity"], TranslationKey> = {
  low: "severityLow",
  medium: "severityMedium",
  high: "severityHigh",
};

const SEVERITY_STYLE: Record<ChangeExplanation["severity"], string> = {
  low: "bg-surface text-muted",
  medium: "bg-warn-bg text-warn-text",
  high: "bg-danger-bg text-danger-text",
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
      <ul className="flex flex-wrap gap-2 text-sm" aria-label={t("compareSummary")}>
        {(Object.keys(summary) as ClauseChangeKind[]).map((kind) => (
          <li key={kind} className={`rounded px-2 py-0.5 ${KIND_STYLE[kind]}`}>
            {summary[kind]} {t(KIND_KEY[kind])}
          </li>
        ))}
      </ul>
      {nothingChanged ? <p>{t("compareNoChanges")}</p> : null}
      <ol className="flex flex-col gap-3">
        {changes.map((change, index) => (
          <li
            key={index}
            className={`rounded-lg border border-line border-l-4 bg-surface p-4 ${KIND_EDGE[change.kind]}`}
          >
            <p className="mb-1 flex flex-wrap items-center gap-2">
              <span className={`rounded px-2 py-0.5 text-sm ${KIND_STYLE[change.kind]}`}>
                {t(KIND_KEY[change.kind])}
              </span>
              <h3 className="text-base font-medium">
                {change.after?.heading ??
                  change.before?.heading ??
                  t("compareClause", { n: index + 1 })}
              </h3>
            </p>
            {change.kind === "unchanged" ? (
              <details>
                <summary className="cursor-pointer text-sm text-muted">
                  {t("compareShowUnchanged")}
                </summary>
                <ChangeBody change={change} />
              </details>
            ) : (
              <ChangeBody change={change} />
            )}
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
      <p className="whitespace-pre-wrap break-words">
        {change.segments.map((segment, index) => (
          <Segment key={index} segment={segment} />
        ))}
      </p>
    );
  }
  if (change.kind === "modified") {
    return <SideBySide change={change} />;
  }
  return <p className="whitespace-pre-wrap break-words">{(change.after ?? change.before)?.text}</p>;
}

/** Long modified clauses skip the word diff; the two versions are shown labelled instead. */
function SideBySide({ change }: { change: ClauseChange }) {
  const t = useT();
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div>
        <h4 className="visually-hidden">{t("compareBeforeLabel")}</h4>
        <p className="whitespace-pre-wrap break-words">{change.before?.text}</p>
      </div>
      <div>
        <h4 className="visually-hidden">{t("compareAfterLabel")}</h4>
        <p className="whitespace-pre-wrap break-words">{change.after?.text}</p>
      </div>
    </div>
  );
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
  if (!item) return null;
  return (
    <dl className="mt-2 text-sm">
      <dt className="inline font-medium">{t("compareWhatChanged")}: </dt>
      <dd className="inline">{item.whatChanged} </dd>
      <dt className="inline font-medium">{t("compareWhoBenefits")}: </dt>
      <dd className="inline">{item.whoBenefits} </dd>
      <dt className="inline font-medium">{t("compareSeverity")}: </dt>
      <dd className="inline">
        <span className={`rounded px-2 py-0.5 ${SEVERITY_STYLE[item.severity]}`}>
          {t(SEVERITY_KEY[item.severity])}
        </span>
      </dd>
    </dl>
  );
}
