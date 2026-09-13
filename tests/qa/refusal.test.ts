import { describe, expect, it } from "vitest";
import type { UIMessageChunk } from "ai";
import { REFUSAL, UNGROUNDED_NOTE } from "@/lib/qa/guard";
import { refusalStream, textTurn, withGroundingCheck } from "@/lib/qa/refusal";

async function drain(stream: ReadableStream<UIMessageChunk>): Promise<UIMessageChunk[]> {
  const out: UIMessageChunk[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return out;
    out.push(value);
  }
}

function chunks(...items: UIMessageChunk[]): ReadableStream<UIMessageChunk> {
  return new ReadableStream({
    start(controller) {
      for (const item of items) controller.enqueue(item);
      controller.close();
    },
  });
}

describe("refusalStream and textTurn", () => {
  it("is one complete assistant turn with the refusal text", async () => {
    const out = await drain(refusalStream("hi"));
    expect(out.map((chunk) => chunk.type)).toEqual([
      "start",
      "text-start",
      "text-delta",
      "text-end",
      "finish",
    ]);
    expect(out[2]).toMatchObject({ delta: REFUSAL.hi });
    expect((await drain(textTurn("x")))[2]).toMatchObject({ delta: "x" });
  });
});

describe("withGroundingCheck", () => {
  it("passes a cited answer through untouched", async () => {
    const answer: UIMessageChunk[] = [
      { type: "start" },
      { type: "text-delta", id: "t", delta: "See [c2]." },
      { type: "finish" },
    ];
    expect(await drain(withGroundingCheck(chunks(...answer), "en"))).toEqual(answer);
  });

  it("appends a caution before the finish when the answer never cites the document", async () => {
    const out = await drain(
      withGroundingCheck(
        chunks(
          { type: "start" },
          { type: "text-delta", id: "t", delta: "Paris is " },
          { type: "text-delta", id: "t", delta: "the capital." },
          { type: "finish" },
        ),
        "en",
      ),
    );
    const deltas = out.filter((chunk) => chunk.type === "text-delta").map((chunk) => chunk.delta);
    expect(deltas.at(-1)).toContain(UNGROUNDED_NOTE.en);
    expect(out.at(-1)).toEqual({ type: "finish" });
  });
});
