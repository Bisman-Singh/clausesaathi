/** One unit of a document that the explanation can point at. */
export interface Clause {
  /** Stable id such as `c12`. Every AI citation refers to one of these. */
  id: string;
  /** Zero-based position in the document. */
  index: number;
  /** Numbering or title found at the start of the clause, if any. */
  heading: string | null;
  /** Clause text without its heading line. */
  text: string;
}

/** A document split into citable clauses. */
export interface ParsedDocument {
  title: string | null;
  clauses: Clause[];
  charCount: number;
  wordCount: number;
}
