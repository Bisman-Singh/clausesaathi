import { analyzeDocument } from "@/lib/analysis/analyze";
import { segmentDocument } from "@/lib/document/segment";
import { guardAiRequest, toHttpError } from "@/lib/http/ai-request";
import { readAnalyzeRequest } from "@/lib/http/analyze-input";
import { jsonError } from "@/lib/http/guard";
import { aiRateLimiter, serverDeps } from "@/lib/server/deps";

/** PDF parsing needs the Node runtime; a scan is transcribed and then analysed, two model calls. */
export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * POST /api/analyze
 *
 * Accepts pasted text (JSON) or a PDF or image (multipart), returns the
 * segmented document, its verified brief and where the text came from.
 * Nothing is stored server-side.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    guardAiRequest(request, aiRateLimiter);
    const deps = serverDeps();
    const input = await readAnalyzeRequest(request, deps);
    const document = segmentDocument(input.text);
    const result = await analyzeDocument(
      { document, situation: input.situation, locale: input.locale, state: input.state },
      deps,
    );
    return Response.json({ document, result, source: input.source });
  } catch (error) {
    return jsonError(toHttpError(error));
  }
}
