import { z } from "zod";

/**
 * The shape every analysis must fit. The model is asked for exactly this and
 * the response is validated before it reaches a screen. Anything that does not
 * validate is treated as a failed generation, never rendered.
 */

export const severitySchema = z.enum(["low", "medium", "high"]);
export type Severity = z.infer<typeof severitySchema>;

const clauseIdSchema = z.string().regex(/^c\d+$/, "clause ids look like c12");

const clauseIdsSchema = z.array(clauseIdSchema).max(6);

export const deadlineSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("relative"),
    days: z.number().int().min(0).max(3650),
    from: z.string().min(1).max(80),
  }),
  z.object({
    kind: z.literal("absolute"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "ISO date"),
  }),
  z.object({ kind: z.literal("unspecified") }),
]);
export type Deadline = z.infer<typeof deadlineSchema>;

export const obligationSchema = z.object({
  party: z.string().min(1).max(80),
  action: z.string().min(1).max(400),
  clauseId: clauseIdSchema,
  deadline: deadlineSchema,
});
export type Obligation = z.infer<typeof obligationSchema>;

export const riskSchema = z.object({
  title: z.string().min(1).max(120),
  severity: severitySchema,
  clauseId: clauseIdSchema,
  explanation: z.string().min(1).max(600),
  statuteQuery: z.string().max(120).nullable(),
});
export type Risk = z.infer<typeof riskSchema>;

export const keyTermSchema = z.object({
  term: z.string().min(1).max(80),
  meaning: z.string().min(1).max(400),
  clauseId: clauseIdSchema,
});

export const summaryPointSchema = z.object({
  text: z.string().min(1).max(400),
  clauseIds: clauseIdsSchema,
});

export const inconsistencySchema = z.object({
  description: z.string().min(1).max(400),
  clauseIds: clauseIdsSchema.min(1),
});

export const documentBriefSchema = z.object({
  documentType: z.string().min(1).max(80),
  parties: z.array(z.string().min(1).max(80)).max(8),
  summary: z.array(summaryPointSchema).min(1).max(8),
  keyTerms: z.array(keyTermSchema).max(12),
  obligations: z.array(obligationSchema).max(20),
  risks: z.array(riskSchema).max(12),
  inconsistencies: z.array(inconsistencySchema).max(8),
  nextSteps: z.array(z.string().min(1).max(300)).max(8),
  questionsForLawyer: z.array(z.string().min(1).max(300)).max(8),
  checklist: z.array(z.string().min(1).max(200)).max(12),
});
export type DocumentBrief = z.infer<typeof documentBriefSchema>;

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
