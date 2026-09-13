import { AiUnavailableError } from "@/lib/ai/client";
import { PdfError } from "@/lib/document/pdf";
import { HttpError, assertSameOrigin, clientAddress } from "@/lib/http/guard";
import type { RateLimiter } from "@/lib/http/rate-limit";

/** Checks every AI-backed route runs before doing any work. */
export function guardAiRequest(request: Request, limiter: RateLimiter): void {
  assertSameOrigin(request);
  if (!limiter.allow(clientAddress(request))) {
    throw new HttpError(429, "rate_limited", "Too many requests. Please wait a minute.");
  }
}

/** Translate library failures into stable API error codes. */
export function toHttpError(error: unknown): unknown {
  if (error instanceof PdfError) return new HttpError(400, `pdf_${error.code}`);
  if (error instanceof AiUnavailableError) {
    // Enough to tell a quota error from an outage; never the prompt or the provider's body.
    const cause = error.cause as { name?: string; statusCode?: number } | undefined;
    console.warn("ai unavailable", {
      attempts: error.attempts,
      cause: cause?.name,
      status: cause?.statusCode,
    });
    return new HttpError(503, "ai_unavailable", "The AI service is busy. Please retry shortly.");
  }
  return error;
}
