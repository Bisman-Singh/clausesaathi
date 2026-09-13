import type { UIMessageChunk } from "ai";
import type { ModelSpec } from "@/lib/ai/models";

/**
 * Model fallback for a streamed answer.
 *
 * A stream cannot change model half-way through an answer, but it can before
 * the answer starts. Each model's stream is read until it either produces
 * content (text, reasoning or a tool call) or fails; a failure before any
 * content moves on to the next model, and the first model that produces
 * content is the one the client sees, from its first chunk.
 */

export type ChunkStream = ReadableStream<UIMessageChunk>;

/** Chunk types that prove the model is answering. */
const CONTENT_TYPES = new Set([
  "text-delta",
  "reasoning-delta",
  "tool-input-start",
  "tool-input-delta",
  "tool-input-available",
  "finish",
]);

/** The error chunk sent when every model failed before answering. */
export const UNAVAILABLE_CHUNK: UIMessageChunk = { type: "error", errorText: "ai_unavailable" };

interface Probe {
  chunks: UIMessageChunk[];
  reader: ReadableStreamDefaultReader<UIMessageChunk>;
}

/** Buffer a stream up to its first content chunk; null when it fails first. */
async function probe(stream: ChunkStream): Promise<Probe | null> {
  const reader = stream.getReader();
  const chunks: UIMessageChunk[] = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return { chunks, reader };
    if (value.type === "error") {
      reader.releaseLock();
      return null;
    }
    chunks.push(value);
    if (CONTENT_TYPES.has(value.type)) return { chunks, reader };
  }
}

export interface StreamFallbackOptions {
  onError?: (spec: ModelSpec) => void;
}

/**
 * The first model's stream that gets as far as content, replayed from its
 * start, or a single unavailable error when none does.
 */
export function streamWithFallback(
  chain: ModelSpec[],
  start: (spec: ModelSpec) => ChunkStream,
  options: StreamFallbackOptions = {},
): ChunkStream {
  return new ReadableStream<UIMessageChunk>({
    async start(controller) {
      for (const spec of chain) {
        const probed = await probe(start(spec));
        if (!probed) {
          options.onError?.(spec);
          continue;
        }
        for (const chunk of probed.chunks) controller.enqueue(chunk);
        for (;;) {
          const { value, done } = await probed.reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        controller.close();
        return;
      }
      controller.enqueue(UNAVAILABLE_CHUNK);
      controller.close();
    },
  });
}
