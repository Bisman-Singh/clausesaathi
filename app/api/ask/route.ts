import { createUIMessageStreamResponse, stepCountIs, streamText } from "ai";
import { z } from "zod";
import { modelChain } from "@/lib/ai/models";
import { AI_TIMEOUT_MS, LIMITS } from "@/lib/constants";
import { segmentDocument } from "@/lib/document/segment";
import { guardAiRequest, toHttpError } from "@/lib/http/ai-request";
import { HttpError, jsonError, readJson } from "@/lib/http/guard";
import { toLocale } from "@/lib/i18n";
import { isOnTopic } from "@/lib/qa/gate";
import { isInjectionAttempt } from "@/lib/qa/guard";
import { hideModelError, toModelMessages } from "@/lib/qa/messages";
import { qaSystemPrompt } from "@/lib/qa/prompt";
import { refusalStream, withGroundingCheck } from "@/lib/qa/refusal";
import { streamWithFallback } from "@/lib/qa/stream";
import { statuteTools } from "@/lib/qa/tools";
import { aiRateLimiter, serverDeps } from "@/lib/server/deps";
import { isIndianState } from "@/lib/statute/jurisdiction";

export const maxDuration = 120;

/** Part types, locales and states are short tokens; an answer is never longer than a document. */
const MAX_TOKEN_CHARS = 64;
const partSchema = z.object({
  type: z.string().max(MAX_TOKEN_CHARS),
  text: z.string().max(LIMITS.MAX_DOCUMENT_CHARS).optional(),
});
const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  parts: z.array(partSchema).max(LIMITS.MAX_CHAT_PARTS),
});
const bodySchema = z.object({
  document: z.string().min(LIMITS.MIN_DOCUMENT_CHARS).max(LIMITS.MAX_DOCUMENT_CHARS),
  messages: z
    .array(messageSchema)
    .min(1)
    .max(LIMITS.MAX_CHAT_MESSAGES)
    .refine((list) => list.at(-1)?.role === "user", "the last turn must be the user's"),
  locale: z.string().max(MAX_TOKEN_CHARS).optional(),
  state: z.string().max(MAX_TOKEN_CHARS).optional(),
});

const MAX_BODY_BYTES = LIMITS.MAX_DOCUMENT_CHARS * 4 + LIMITS.MAX_CHAT_MESSAGES * 4096;

/**
 * POST /api/ask
 *
 * Streams an answer grounded in the supplied document, with one read-only
 * statute lookup tool. Models are tried in chain order; one that fails before
 * producing anything is skipped, and the client only ever sees one answer.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    guardAiRequest(request, aiRateLimiter);
    const body = await readJson(request, bodySchema, MAX_BODY_BYTES);
    const deps = serverDeps();
    const chain = modelChain(deps.env);
    if (chain.length === 0) throw new HttpError(503, "ai_unavailable");
    const state = body.state && isIndianState(body.state) ? body.state : null;
    const locale = toLocale(body.locale);
    const document = segmentDocument(body.document);
    const messages = toModelMessages(body.messages);
    const question = messages.at(-1)?.content;
    // Two guards outside the answering model: a pattern screen and a separate topic gate.
    if (typeof question !== "string" || isInjectionAttempt(question)) {
      return createUIMessageStreamResponse({ stream: refusalStream(locale) });
    }
    if (!(await isOnTopic(document, question, locale, deps))) {
      return createUIMessageStreamResponse({ stream: refusalStream(locale) });
    }
    const system = qaSystemPrompt(document, locale);

    const stream = streamWithFallback(
      chain,
      (spec) =>
        streamText({
          model: deps.factory(spec),
          system,
          messages,
          tools: statuteTools(deps.statutes, state),
          stopWhen: stepCountIs(2),
          maxOutputTokens: 1200,
          temperature: 0.2,
          // Stop generating when the reader leaves, as well as on the per-model timeout.
          abortSignal: AbortSignal.any([request.signal, AbortSignal.timeout(AI_TIMEOUT_MS)]),
        }).toUIMessageStream({ onError: hideModelError }),
      { onError: (spec) => console.warn("ask: model failed before answering", spec.id) },
    );
    return createUIMessageStreamResponse({ stream: withGroundingCheck(stream, locale) });
  } catch (error) {
    return jsonError(toHttpError(error));
  }
}
