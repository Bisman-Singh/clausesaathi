import { stepCountIs, streamText, type ModelMessage } from "ai";
import { z } from "zod";
import { modelChain } from "@/lib/ai/models";
import { AI_TIMEOUT_MS, LIMITS } from "@/lib/constants";
import { segmentDocument } from "@/lib/document/segment";
import { guardAiRequest, toHttpError } from "@/lib/http/ai-request";
import { HttpError, jsonError, readJson } from "@/lib/http/guard";
import { toLocale } from "@/lib/i18n";
import { qaSystemPrompt } from "@/lib/qa/prompt";
import { statuteTools } from "@/lib/qa/tools";
import { aiRateLimiter, serverDeps } from "@/lib/server/deps";
import { isIndianState } from "@/lib/statute/jurisdiction";

export const maxDuration = 60;

const partSchema = z.object({ type: z.string(), text: z.string().optional() });
const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  parts: z.array(partSchema),
});
const bodySchema = z.object({
  document: z.string().min(LIMITS.MIN_DOCUMENT_CHARS).max(LIMITS.MAX_DOCUMENT_CHARS),
  messages: z.array(messageSchema).min(1).max(LIMITS.MAX_CHAT_MESSAGES),
  locale: z.string().optional(),
  state: z.string().optional(),
});

const MAX_BODY_BYTES = LIMITS.MAX_DOCUMENT_CHARS * 4 + LIMITS.MAX_CHAT_MESSAGES * 4096;

/** Keep only the text of each turn; tool parts from earlier turns are not replayed. */
export function toModelMessages(messages: z.infer<typeof bodySchema>["messages"]): ModelMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.parts
      .filter((part) => part.type === "text" && part.text)
      .map((part) => (part.text as string).slice(0, LIMITS.MAX_QUESTION_CHARS))
      .join("\n"),
  }));
}

/**
 * POST /api/ask
 *
 * Streams an answer grounded in the supplied document, with one read-only
 * statute lookup tool. The first model in the chain is used; streaming cannot
 * switch models mid-response, so failures surface as an error part.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    guardAiRequest(request, aiRateLimiter);
    const body = await readJson(request, bodySchema, MAX_BODY_BYTES);
    const deps = serverDeps();
    const [spec] = modelChain(deps.env);
    if (!spec) throw new HttpError(503, "ai_unavailable");
    const state = body.state && isIndianState(body.state) ? body.state : null;

    const result = streamText({
      model: deps.factory(spec),
      system: qaSystemPrompt(segmentDocument(body.document), toLocale(body.locale)),
      messages: toModelMessages(body.messages),
      tools: statuteTools(deps.statutes, state),
      stopWhen: stepCountIs(3),
      maxOutputTokens: 1200,
      temperature: 0.2,
      abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
    return result.toUIMessageStreamResponse();
  } catch (error) {
    return jsonError(toHttpError(error));
  }
}
