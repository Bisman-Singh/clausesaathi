import { z } from "zod";
import { isIsoDate } from "@/lib/deadlines/compute";

/**
 * Two schemas describe one brief.
 *
 * The wire schema is what the model is asked for: flat objects, enums and
 * nullable fields only, because provider structured-output support is a
 * subset of JSON Schema (no unions, no patterns). The strict schema is what the
 * rest of the app consumes: discriminated deadlines, validated ids and bounded
 * lengths. `toBrief` bridges the two and never throws on an over-long string;
 * it trims, because a 401-character explanation is not a failed generation.
 */

export const severitySchema = z.enum(["low", "medium", "high"]);
export type Severity = z.infer<typeof severitySchema>;

const CLAUSE_ID = /^c\d+$/;
/** "c3", "[c3]" and " C3 " all mean clause 3; anything else fails the item. */
const clauseIdSchema = z
  .string()
  .transform((value) => value.replace(/[\[\]\s]/g, "").toLowerCase())
  .refine((value) => CLAUSE_ID.test(value), "clause ids look like c12");

/** A trimmed, non-empty string cut to `max` characters. */
const bounded = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.slice(0, max));

/** A list cut to its first `max` well-formed entries; one bad item is dropped, not the brief. */
const boundedList = <T extends z.ZodTypeAny>(item: T, max: number) =>
  z.array(z.unknown()).transform((items) =>
    items
      .flatMap((candidate) => {
        const parsed = item.safeParse(candidate);
        return parsed.success ? [parsed.data as z.infer<T>] : [];
      })
      .slice(0, max),
  );

/** Clause id lists keep only well-formed ids; existence is checked later. */
const clauseIdList = z.array(z.string()).transform((ids) =>
  ids
    .map((id) => id.replace(/[\[\]\s]/g, "").toLowerCase())
    .filter((id) => CLAUSE_ID.test(id))
    .slice(0, 6),
);

export const deadlineSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("relative"),
    days: z.number().int().min(0).max(3650),
    from: bounded(80),
  }),
  z.object({ kind: z.literal("absolute"), date: z.string().refine(isIsoDate, "ISO date") }),
  z.object({ kind: z.literal("unspecified") }),
]);
export type Deadline = z.infer<typeof deadlineSchema>;

export const obligationSchema = z.object({
  party: bounded(80),
  action: bounded(400),
  clauseId: clauseIdSchema,
  deadline: deadlineSchema,
});
export type Obligation = z.infer<typeof obligationSchema>;

export const riskSchema = z.object({
  title: bounded(120),
  severity: severitySchema,
  clauseId: clauseIdSchema,
  explanation: bounded(600),
  statuteQuery: bounded(120).nullable(),
});
export type Risk = z.infer<typeof riskSchema>;

export const keyTermSchema = z.object({
  term: bounded(80),
  meaning: bounded(400),
  clauseId: clauseIdSchema,
});

export const summaryPointSchema = z.object({ text: bounded(400), clauseIds: clauseIdList });

export const inconsistencySchema = z.object({
  description: bounded(400),
  clauseIds: clauseIdList,
});

export const documentBriefSchema = z.object({
  documentType: bounded(80),
  parties: boundedList(bounded(80), 8),
  summary: boundedList(summaryPointSchema, 8).refine((items) => items.length > 0, "no summary"),
  keyTerms: boundedList(keyTermSchema, 12),
  obligations: boundedList(obligationSchema, 20),
  risks: boundedList(riskSchema, 12),
  inconsistencies: boundedList(inconsistencySchema, 8),
  nextSteps: boundedList(bounded(300), 8),
  questionsForLawyer: boundedList(bounded(300), 8),
  checklist: boundedList(bounded(200), 12),
});
export type DocumentBrief = z.infer<typeof documentBriefSchema>;

/* Wire schema: the flat shape requested from the model. */

const deadlineWireSchema = z.object({
  kind: z.enum(["relative", "absolute", "unspecified"]),
  days: z.number().nullable(),
  from: z.string().nullable(),
  date: z.string().nullable(),
});
export type DeadlineWire = z.infer<typeof deadlineWireSchema>;

export const documentBriefWireSchema = z.object({
  documentType: z.string(),
  parties: z.array(z.string()),
  summary: z.array(z.object({ text: z.string(), clauseIds: z.array(z.string()) })),
  keyTerms: z.array(z.object({ term: z.string(), meaning: z.string(), clauseId: z.string() })),
  obligations: z.array(
    z.object({
      party: z.string(),
      action: z.string(),
      clauseId: z.string(),
      deadline: deadlineWireSchema,
    }),
  ),
  risks: z.array(
    z.object({
      title: z.string(),
      severity: severitySchema,
      clauseId: z.string(),
      explanation: z.string(),
      statuteQuery: z.string().nullable(),
    }),
  ),
  inconsistencies: z.array(z.object({ description: z.string(), clauseIds: z.array(z.string()) })),
  nextSteps: z.array(z.string()),
  questionsForLawyer: z.array(z.string()),
  checklist: z.array(z.string()),
});
export type DocumentBriefWire = z.infer<typeof documentBriefWireSchema>;

/** Convert a flat deadline into the discriminated form, falling back to unspecified. */
export function toDeadline(wire: DeadlineWire): Deadline {
  if (wire.kind === "relative" && wire.days !== null && wire.from) {
    return { kind: "relative", days: Math.round(wire.days), from: wire.from };
  }
  if (wire.kind === "absolute" && wire.date && isIsoDate(wire.date)) {
    return { kind: "absolute", date: wire.date };
  }
  return { kind: "unspecified" };
}

/** Validate a model response into the strict brief. Throws on structural failure. */
export function toBrief(wire: DocumentBriefWire): DocumentBrief {
  return documentBriefSchema.parse({
    ...wire,
    obligations: wire.obligations.map((item) => ({ ...item, deadline: toDeadline(item.deadline) })),
  });
}

/** A statute passage attached to a risk after an IndiaCode lookup. */
export interface StatuteReference {
  act: string;
  title: string;
  snippet: string;
  url: string;
}

export interface RiskWithStatute extends Risk {
  statute: StatuteReference | null;
}

/** The brief as delivered to the UI, with verified citations and statutes. */
export interface AnalysisResult {
  brief: Omit<DocumentBrief, "risks"> & { risks: RiskWithStatute[] };
  /** Citations the model produced that pointed at clauses that do not exist. */
  droppedCitations: number;
  model: string;
}
