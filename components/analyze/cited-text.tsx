"use client";

import { Fragment, type ReactNode } from "react";
import { ClauseLink } from "@/components/analyze/clause-link";
import type { ParsedDocument } from "@/lib/document/types";

const TAG = /\[(c\d+)\]/g;

/** Split text on `[c12]` tags so each becomes a clause link if the clause exists. */
export function splitCitations(text: string): Array<{ kind: "text" | "clause"; value: string }> {
  const parts: Array<{ kind: "text" | "clause"; value: string }> = [];
  let last = 0;
  for (const match of text.matchAll(TAG)) {
    const { index } = match;
    if (index > last) parts.push({ kind: "text", value: text.slice(last, index) });
    parts.push({ kind: "clause", value: match[1] as string });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ kind: "text", value: text.slice(last) });
  return parts;
}

export interface CitedTextProps {
  text: string;
  document: ParsedDocument;
}

/** Model prose with inline clause tags rendered as citation links. */
export function CitedText({ text, document }: CitedTextProps): ReactNode {
  const known = new Set(document.clauses.map((clause) => clause.id));
  return splitCitations(text).map((part, index) =>
    part.kind === "clause" && known.has(part.value) ? (
      <Fragment key={index}>
        {" "}
        <ClauseLink document={document} clauseId={part.value} />{" "}
      </Fragment>
    ) : (
      <Fragment key={index}>{part.kind === "clause" ? `[${part.value}]` : part.value}</Fragment>
    ),
  );
}
