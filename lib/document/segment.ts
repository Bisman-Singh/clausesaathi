import { LIMITS } from "@/lib/constants";
import type { Clause, ParsedDocument } from "@/lib/document/types";

/**
 * Deterministic clause segmentation.
 *
 * The explanation layer may only cite clause ids produced here, so the split
 * has to be reproducible and independent of the model. Blocks are separated by
 * blank lines; a block that starts with a numbering pattern or a short title
 * line becomes a new clause with that heading.
 */

const HEADING_PATTERN =
  /^(?:(?:clause|section|article|para(?:graph)?|part|schedule)\s+)?(?:\d+(?:\.\d+)*|[ivxlc]+|[a-z]|\([a-z0-9]+\))[.):]?\s+(.{0,120})$/i;
const TITLE_MAX_CHARS = 90;

/** Normalise line endings and whitespace without changing the words. */
export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/ /g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitBlocks(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);
}

function isNumberedHeading(line: string): boolean {
  return HEADING_PATTERN.test(line);
}

function isTitleLine(line: string, restLength: number): boolean {
  if (line.length > TITLE_MAX_CHARS || restLength === 0) return false;
  const endsLikeSentence = /[.;,]$/.test(line);
  const upperCase = line === line.toUpperCase() && /[A-Z]/.test(line);
  return !endsLikeSentence && (upperCase || /^[A-Z][^.]*$/.test(line));
}

interface HeadingSplit {
  heading: string | null;
  text: string;
}

function splitFirstLine(block: string): { firstLine: string; rest: string } {
  const newline = block.indexOf("\n");
  if (newline === -1) return { firstLine: block, rest: "" };
  return { firstLine: block.slice(0, newline), rest: block.slice(newline + 1).trim() };
}

/** A numbered line with no body, such as `4. The deposit is refundable.` */
function splitNumberedSingleLine(firstLine: string, body: string): HeadingSplit {
  const label = firstLine.slice(0, firstLine.length - body.length).trim();
  return { heading: label, text: body.trim() };
}

function splitHeading(block: string): HeadingSplit {
  const { firstLine, rest } = splitFirstLine(block);
  const numbered = firstLine.match(HEADING_PATTERN);
  if (numbered) {
    return rest.length > 0
      ? { heading: firstLine.trim(), text: rest }
      : splitNumberedSingleLine(firstLine, numbered[1] as string);
  }
  if (isTitleLine(firstLine, rest.length)) {
    return { heading: firstLine.trim(), text: rest };
  }
  return { heading: null, text: block };
}

function mergeOverflow(blocks: string[]): string[] {
  if (blocks.length <= LIMITS.MAX_CLAUSES) return blocks;
  const kept = blocks.slice(0, LIMITS.MAX_CLAUSES - 1);
  kept.push(blocks.slice(LIMITS.MAX_CLAUSES - 1).join("\n\n"));
  return kept;
}

function detectTitle(blocks: string[]): string | null {
  const first = blocks[0];
  if (!first || first.includes("\n") || isNumberedHeading(first)) return null;
  return isTitleLine(first, blocks.length - 1) ? first : null;
}

/** Split raw document text into citable clauses. */
export function segmentDocument(raw: string): ParsedDocument {
  const text = normalizeText(raw);
  const allBlocks = splitBlocks(text);
  const title = detectTitle(allBlocks);
  const blocks = mergeOverflow(title === null ? allBlocks : allBlocks.slice(1));
  const clauses: Clause[] = blocks.map((block, index) => {
    const { heading, text: body } = splitHeading(block);
    return { id: `c${index + 1}`, index, heading, text: body };
  });
  return {
    title,
    clauses,
    charCount: text.length,
    wordCount: text.length === 0 ? 0 : text.split(/\s+/).length,
  };
}

/** Render clauses back into the plain text the model reads, ids included. */
export function renderForModel(doc: ParsedDocument): string {
  return doc.clauses
    .map((clause) => {
      const heading = clause.heading ? ` ${clause.heading}` : "";
      return `[${clause.id}]${heading}\n${clause.text}`;
    })
    .join("\n\n");
}
