import type { Clause, ParsedDocument } from "@/lib/document/types";

/**
 * Deterministic clause alignment between two versions of a document.
 *
 * Clauses are matched on text similarity, not position, so a renumbered
 * agreement still lines up. The word-level diff of a modified pair is computed
 * here too; the model is only asked afterwards to explain what a change means.
 */

export type ClauseChangeKind = "unchanged" | "modified" | "added" | "removed";

export interface DiffSegment {
  type: "same" | "added" | "removed";
  text: string;
}

export interface ClauseChange {
  kind: ClauseChangeKind;
  before: Clause | null;
  after: Clause | null;
  /** 0 to 1, present for matched pairs. */
  similarity: number | null;
  /** Word-level diff, present for modified pairs. */
  segments: DiffSegment[] | null;
}

/** Below this the clauses are treated as different clauses, not an edit. */
export const MATCH_THRESHOLD = 0.45;
/** At or above this a pair is considered unchanged. */
const UNCHANGED_THRESHOLD = 0.999;
/** Longer clauses skip the quadratic word diff and keep only the similarity. */
const MAX_DIFF_WORDS = 600;

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function bigrams(words: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = 0; i < words.length - 1; i += 1) {
    const key = `${words[i]} ${words[i + 1]}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (words.length === 1) counts.set(words[0] as string, 1);
  return counts;
}

/** Sørensen–Dice similarity over word bigrams, 1 for identical text. */
export function similarity(a: string, b: string): number {
  const left = bigrams(tokens(a));
  const right = bigrams(tokens(b));
  const total = [...left.values(), ...right.values()].reduce((sum, n) => sum + n, 0);
  if (total === 0) return a.trim() === b.trim() ? 1 : 0;
  let overlap = 0;
  for (const [key, count] of left) overlap += Math.min(count, right.get(key) ?? 0);
  return (2 * overlap) / total;
}

/** Word-level diff using a longest-common-subsequence table. */
export function diffWords(before: string, after: string): DiffSegment[] {
  const a = before.split(/\s+/).filter(Boolean);
  const b = after.split(/\s+/).filter(Boolean);
  const table = lcsTable(a, b);
  const segments: DiffSegment[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    const step = nextStep(a, b, table, i, j);
    push(segments, step.type, step.word);
    if (step.type !== "added") i += 1;
    if (step.type !== "removed") j += 1;
  }
  return segments;
}

interface DiffStep {
  type: DiffSegment["type"];
  word: string;
}

/** Pick the next word to emit; on a tie, removals come before additions. */
function nextStep(a: string[], b: string[], table: number[][], i: number, j: number): DiffStep {
  if (i < a.length && j < b.length && a[i] === b[j]) return { type: "same", word: a[i] as string };
  const removeScore = i < a.length ? cell(table, i + 1, j) : -1;
  const addScore = j < b.length ? cell(table, i, j + 1) : -1;
  return removeScore >= addScore
    ? { type: "removed", word: a[i] as string }
    : { type: "added", word: b[j] as string };
}

function cell(table: number[][], i: number, j: number): number {
  return table[i]?.[j] ?? 0;
}

function lcsTable(a: string[], b: string[]): number[][] {
  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      const row = table[i] as number[];
      const next = table[i + 1] as number[];
      row[j] = a[i] === b[j] ? (next[j + 1] ?? 0) + 1 : Math.max(next[j] ?? 0, row[j + 1] ?? 0);
    }
  }
  return table;
}

function push(segments: DiffSegment[], type: DiffSegment["type"], word: string): void {
  const last = segments.at(-1);
  if (last && last.type === type) {
    last.text += ` ${word}`;
  } else {
    segments.push({ type, text: word });
  }
}

interface Match {
  beforeIndex: number;
  afterIndex: number;
  score: number;
}

function bestMatches(before: Clause[], after: Clause[]): Match[] {
  const candidates: Match[] = [];
  before.forEach((clauseA, beforeIndex) => {
    after.forEach((clauseB, afterIndex) => {
      const score = similarity(clauseA.text, clauseB.text);
      if (score >= MATCH_THRESHOLD) candidates.push({ beforeIndex, afterIndex, score });
    });
  });
  candidates.sort((x, y) => y.score - x.score);
  const usedBefore = new Set<number>();
  const usedAfter = new Set<number>();
  return candidates.filter((match) => {
    if (usedBefore.has(match.beforeIndex) || usedAfter.has(match.afterIndex)) return false;
    usedBefore.add(match.beforeIndex);
    usedAfter.add(match.afterIndex);
    return true;
  });
}

function changeFor(clauseA: Clause, clauseB: Clause, score: number): ClauseChange {
  if (score >= UNCHANGED_THRESHOLD) {
    return {
      kind: "unchanged",
      before: clauseA,
      after: clauseB,
      similarity: score,
      segments: null,
    };
  }
  const wordCount = clauseA.text.split(/\s+/).length + clauseB.text.split(/\s+/).length;
  const segments = wordCount <= MAX_DIFF_WORDS ? diffWords(clauseA.text, clauseB.text) : null;
  return { kind: "modified", before: clauseA, after: clauseB, similarity: score, segments };
}

/** Align two parsed documents clause by clause, in the order of the newer one. */
export function diffDocuments(before: ParsedDocument, after: ParsedDocument): ClauseChange[] {
  const matches = bestMatches(before.clauses, after.clauses);
  const byAfter = new Map(matches.map((m) => [m.afterIndex, m]));
  const matchedBefore = new Set(matches.map((m) => m.beforeIndex));

  const changes: ClauseChange[] = after.clauses.map((clauseB, afterIndex) => {
    const match = byAfter.get(afterIndex);
    if (!match)
      return { kind: "added", before: null, after: clauseB, similarity: null, segments: null };
    return changeFor(before.clauses[match.beforeIndex] as Clause, clauseB, match.score);
  });

  before.clauses.forEach((clauseA, beforeIndex) => {
    if (!matchedBefore.has(beforeIndex)) {
      changes.push({
        kind: "removed",
        before: clauseA,
        after: null,
        similarity: null,
        segments: null,
      });
    }
  });
  return changes;
}

/** Counts for the summary strip above a comparison. */
export function summarizeChanges(changes: ClauseChange[]): Record<ClauseChangeKind, number> {
  const counts: Record<ClauseChangeKind, number> = {
    unchanged: 0,
    modified: 0,
    added: 0,
    removed: 0,
  };
  for (const change of changes) counts[change.kind] += 1;
  return counts;
}
