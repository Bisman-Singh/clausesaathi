import { z } from "zod";
import { diffDocuments, summarizeChanges } from "@/lib/compare/diff";
import { explainChanges } from "@/lib/compare/explain";
import { LIMITS } from "@/lib/constants";
import { segmentDocument } from "@/lib/document/segment";
import { guardAiRequest, toHttpError } from "@/lib/http/ai-request";
import { HttpError, jsonError, readJson } from "@/lib/http/guard";
import { toLocale } from "@/lib/i18n";
import { aiRateLimiter, serverDeps } from "@/lib/server/deps";

export const maxDuration = 60;

const bodySchema = z.object({
  before: z.string().min(LIMITS.MIN_DOCUMENT_CHARS).max(LIMITS.MAX_DOCUMENT_CHARS),
  after: z.string().min(LIMITS.MIN_DOCUMENT_CHARS).max(LIMITS.MAX_DOCUMENT_CHARS),
  locale: z.string().optional(),
});

const MAX_BODY_BYTES = LIMITS.MAX_DOCUMENT_CHARS * 8 + 4096;

/**
 * POST /api/compare
 *
 * Aligns two versions clause by clause (deterministically), then asks the
 * model to explain only the clauses that actually changed.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    guardAiRequest(request, aiRateLimiter);
    const body = await readJson(request, bodySchema, MAX_BODY_BYTES);
    const before = segmentDocument(body.before);
    const after = segmentDocument(body.after);
    if (before.clauses.length === 0 || after.clauses.length === 0) {
      throw new HttpError(400, "too_short");
    }
    const changes = diffDocuments(before, after);
    const { explanations, model } = await explainChanges(
      changes,
      toLocale(body.locale),
      serverDeps(),
    );
    return Response.json({ changes, explanations, summary: summarizeChanges(changes), model });
  } catch (error) {
    return jsonError(toHttpError(error));
  }
}
