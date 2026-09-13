import { clauseAnchor } from "@/lib/client/clauses";
import type { ParsedDocument } from "@/lib/document/types";

/** The document itself, one focusable item per clause, targets of citations. */
export function ClauseList({ document }: { document: ParsedDocument }) {
  return (
    <ol className="flex flex-col gap-3">
      {document.clauses.map((clause) => (
        <li
          key={clause.id}
          id={clauseAnchor(clause.id)}
          tabIndex={-1}
          className="rounded-lg border border-line bg-surface p-3 target:border-accent target:bg-accent-soft"
        >
          {clause.heading ? <h4 className="font-semibold">{clause.heading}</h4> : null}
          <p className="whitespace-pre-wrap break-words">{clause.text}</p>
        </li>
      ))}
    </ol>
  );
}
