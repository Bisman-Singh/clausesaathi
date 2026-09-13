import { analyzeDocument } from "@/lib/analysis/analyze";
import { segmentDocument } from "@/lib/document/segment";
import { guardAiRequest, toHttpError } from "@/lib/http/ai-request";
import { readAnalyzeRequest } from "@/lib/http/analyze-input";
import { jsonError } from "@/lib/http/guard";
import { aiRateLimiter, serverDeps } from "@/lib/server/deps";

/** PDF parsing needs the Node runtime, and a long document can take a while. */
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/analyze
 *
 * Accepts pasted text (JSON) or a PDF (multipart), returns the segmented
 * document and its verified brief. Nothing is stored server-side.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    guardAiRequest(request, aiRateLimiter);
    const input = await readAnalyzeRequest(request);
    const document = segmentDocument(input.text);
    const result = await analyzeDocument(
      { document, situation: input.situation, locale: input.locale, state: input.state },
      serverDeps(),
    );
    return Response.json({ document, result });
  } catch (error) {
    return jsonError(toHttpError(error));
  }
}
