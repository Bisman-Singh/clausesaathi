import { describe, expect, it, vi } from "vitest";
import type { UIMessageChunk } from "ai";
import type { ModelSpec } from "@/lib/ai/models";
import { UNAVAILABLE_CHUNK, streamWithFallback } from "@/lib/qa/stream";

const spec = (id: string): ModelSpec => ({ provider: "google", id });

function chunks(...items: UIMessageChunk[]): ReadableStream<UIMessageChunk> {
  return new ReadableStream({
    start(controller) {
      for (const item of items) controller.enqueue(item);
      controller.close();
    },
  });
}

async function drain(stream: ReadableStream<UIMessageChunk>): Promise<UIMessageChunk[]> {
  const out: UIMessageChunk[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return out;
    out.push(value);
  }
}

const good: UIMessageChunk[] = [
  { type: "start" },
  { type: "text-start", id: "t" },
  { type: "text-delta", id: "t", delta: "Yes" },
  { type: "text-delta", id: "t", delta: ", with notice." },
  { type: "text-end", id: "t" },
  { type: "finish" },
];

describe("streamWithFallback", () => {
  it("skips a model that fails before answering and replays the next one from its start", async () => {
    const onError = vi.fn();
    const start = vi.fn((model: ModelSpec) =>
      model.id === "a"
        ? chunks({ type: "start" }, { type: "error", errorText: "overloaded" })
        : chunks(...good),
    );
    const out = await drain(streamWithFallback([spec("a"), spec("b")], start, { onError }));
    expect(out).toEqual(good);
    expect(start).toHaveBeenCalledTimes(2);
    expect(onError).toHaveBeenCalledWith(spec("a"));
  });

  it("keeps the first model when it answers, including a tool call before any text", async () => {
    const withTool: UIMessageChunk[] = [
      { type: "start" },
      { type: "tool-input-start", toolCallId: "1", toolName: "lookupStatute" },
      { type: "error", errorText: "late failure" },
    ];
    const start = vi.fn(() => chunks(...withTool));
    const out = await drain(streamWithFallback([spec("a"), spec("b")], start));
    expect(out).toEqual(withTool);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("treats a stream that ends without content as an answer, not a failure", async () => {
    const empty: UIMessageChunk[] = [{ type: "start" }];
    const out = await drain(streamWithFallback([spec("a"), spec("b")], () => chunks(...empty)));
    expect(out).toEqual(empty);
  });

  it("sends one unavailable error when every model fails", async () => {
    const out = await drain(
      streamWithFallback([spec("a"), spec("b")], () =>
        chunks({ type: "error", errorText: "down" }),
      ),
    );
    expect(out).toEqual([UNAVAILABLE_CHUNK]);
  });
});

describe("streamWithFallback cancellation", () => {
  it("cancels the active model stream when the client stops reading", async () => {
    const cancel = vi.fn();
    const endless = new ReadableStream<UIMessageChunk>({
      start(controller) {
        controller.enqueue({ type: "start" });
        controller.enqueue({ type: "text-delta", id: "t", delta: "Yes" });
      },
      cancel,
    });
    const stream = streamWithFallback([spec("a")], () => endless);
    const reader = stream.getReader();
    await reader.read();
    await reader.cancel("client left");
    expect(cancel).toHaveBeenCalled();
  });

  it("cancels a failed model stream instead of leaving it open", async () => {
    const cancel = vi.fn();
    const failing = new ReadableStream<UIMessageChunk>({
      start(controller) {
        controller.enqueue({ type: "error", errorText: "down" });
      },
      cancel,
    });
    await drain(streamWithFallback([spec("a")], () => failing));
    expect(cancel).toHaveBeenCalled();
  });
});
