import type { UIMessageChunk } from "ai";
import type { Locale } from "@/lib/constants";
import { REFUSAL, UNGROUNDED_NOTE, looksGrounded } from "@/lib/qa/guard";

/** A complete assistant turn carrying one fixed text, in the chat's own stream format. */
export function textTurn(text: string): ReadableStream<UIMessageChunk> {
  const id = "guard";
  const chunks: UIMessageChunk[] = [
    { type: "start" },
    { type: "text-start", id },
    { type: "text-delta", id, delta: text },
    { type: "text-end", id },
    { type: "finish" },
  ];
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

/** The reply given instead of an answer when a question fails a guard. */
export function refusalStream(locale: Locale): ReadableStream<UIMessageChunk> {
  return textTurn(REFUSAL[locale]);
}

/**
 * Watches the answer as it streams and, when it ends without a single clause
 * citation or an explicit "not covered", appends a caution before the finish
 * chunk. The reader keeps the streaming answer and gets told it drifted.
 */
export function withGroundingCheck(
  stream: ReadableStream<UIMessageChunk>,
  locale: Locale,
): ReadableStream<UIMessageChunk> {
  let text = "";
  return stream.pipeThrough(
    new TransformStream<UIMessageChunk, UIMessageChunk>({
      transform(chunk, controller) {
        if (chunk.type === "text-delta") text += chunk.delta;
        if (chunk.type === "finish" && !looksGrounded(text, locale)) {
          const id = "grounding-note";
          controller.enqueue({ type: "text-start", id });
          controller.enqueue({ type: "text-delta", id, delta: `\n\n${UNGROUNDED_NOTE[locale]}` });
          controller.enqueue({ type: "text-end", id });
        }
        controller.enqueue(chunk);
      },
    }),
  );
}
