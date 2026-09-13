import { analyzeDocument } from "@/lib/analysis/analyze";
import { segmentDocument } from "@/lib/document/segment";
import { guardAiRequest, toHttpError } from "@/lib/http/ai-request";
import { readAnalyzeRequest, type StateBasis } from "@/lib/http/analyze-input";
import { jsonError } from "@/lib/http/guard";
import { aiRateLimiter, serverDeps } from "@/lib/server/deps";
import { detectState } from "@/lib/statute/detect-state";
import type { IndianState } from "@/lib/statute/jurisdiction";

/** PDF parsing needs the Node runtime; a scan is transcribed and then analysed, two model calls. */
export const runtime = "nodejs";
export const maxDuration = 120;

/** Which state's laws were preferred and why: the user, their location, the document, or nobody. */
export interface Jurisdiction {
  state: IndianState | null;
  basis: StateBasis | "document" | "none";
}

/** A state the client sent wins; otherwise the document's own city, PIN or state name. */
export function resolveJurisdiction(
  chosen: IndianState | null,
  text: string,
  basis: StateBasis = "user",
): Jurisdiction {
  if (chosen) return { state: chosen, basis };
  const detected = detectState(text);
  return detected ? { state: detected.state, basis: "document" } : { state: null, basis: "none" };
}

/**
 * POST /api/analyze
 *
 * Accepts pasted text (JSON) or a PDF or image (multipart), returns the
 * segmented document, its verified brief, where the text came from and which
 * state's laws were preferred. Nothing is stored server-side.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    guardAiRequest(request, aiRateLimiter);
    const deps = serverDeps();
    const input = await readAnalyzeRequest(request, deps);
    const document = segmentDocument(input.text);
    const jurisdiction = resolveJurisdiction(input.state, input.text, input.stateBasis);
    const result = await analyzeDocument(
      { document, situation: input.situation, locale: input.locale, state: jurisdiction.state },
      deps,
    );
    return Response.json({ document, result, source: input.source, jurisdiction });
  } catch (error) {
    return jsonError(toHttpError(error));
  }
}
