import { analyzeDocument } from "@/lib/analysis/analyze";
import { segmentDocument } from "@/lib/document/segment";
import { guardAiRequest, toHttpError } from "@/lib/http/ai-request";
import { analysisKey } from "@/lib/analysis/cache";
import { readAnalyzeRequest } from "@/lib/http/analyze-input";
import { jsonError } from "@/lib/http/guard";
import { aiRateLimiter, analysisCache, serverDeps } from "@/lib/server/deps";
import { resolveJurisdiction } from "@/lib/statute/resolve";

/** PDF parsing needs the Node runtime; a scan is transcribed and then analysed, two model calls. */
export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/analyze
 *
 * Accepts pasted text (JSON) or a PDF or image (multipart), returns the
 * segmented document, its verified brief, where the text came from and which
 * state's laws were preferred. Nothing about the document is stored; results
 * are cached in memory under a hash for an hour.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    await guardAiRequest(request, aiRateLimiter);
    const deps = serverDeps();
    const input = await readAnalyzeRequest(request, deps);
    const document = segmentDocument(input.text);
    const jurisdiction = resolveJurisdiction(input.state, input.text, input.stateBasis);
    const analysis = {
      document,
      situation: input.situation,
      locale: input.locale,
      state: jurisdiction.state,
    };
    // The same text with the same context gives the same brief; the samples hit this constantly.
    const key = analysisKey({ ...analysis, text: input.text });
    const result = analysisCache.get(key) ?? (await analyzeDocument(analysis, deps));
    analysisCache.set(key, result);
    return Response.json({ document, result, source: input.source, jurisdiction });
  } catch (error) {
    return jsonError(toHttpError(error));
  }
}
