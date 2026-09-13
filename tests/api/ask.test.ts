import { afterEach, describe, expect, it, vi } from "vitest";
import type * as AiModule from "ai";

const streamText = vi.fn();
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof AiModule>();
  return { ...actual, streamText: (...args: unknown[]) => streamText(...args) };
});

import { POST, toModelMessages } from "@/app/api/ask/route";
import { setServerDeps } from "@/lib/server/deps";
import { fakeDeps, fakeStatutes, jsonPost, SAMPLE_TEXT } from "@/tests/api/helpers";

afterEach(() => {
  setServerDeps(null);
  streamText.mockReset();
});

const messages = [
  { role: "user", parts: [{ type: "text", text: "Can I leave early?" }] },
  { role: "assistant", parts: [{ type: "text", text: "Yes with notice." }, { type: "tool-x" }] },
  { role: "user", parts: [{ type: "text", text: "How much notice?" }] },
];

describe("POST /api/ask", () => {
  it("streams an answer grounded in the document with the statute tool", async () => {
    streamText.mockReturnValue({
      toUIMessageStreamResponse: () => new Response("stream", { status: 200 }),
    });
    setServerDeps(fakeDeps(vi.fn()));
    const response = await POST(
      jsonPost("/api/ask", { document: SAMPLE_TEXT, messages, locale: "hi", state: "Kerala" }),
    );
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("stream");

    const call = streamText.mock.calls[0]?.[0] as {
      system: string;
      messages: unknown;
      tools: Record<string, { execute: (input: { query: string }) => Promise<unknown> }>;
    };
    expect(call.system).toContain("Hindi");
    expect(call.system).toContain("[c1] 1. Deposit");
    expect(call.messages).toEqual([
      { role: "user", content: "Can I leave early?" },
      { role: "assistant", content: "Yes with notice." },
      { role: "user", content: "How much notice?" },
    ]);

    const lookup = call.tools.lookupStatute as {
      execute: (input: { query: string }) => Promise<unknown>;
    };
    await expect(lookup.execute({ query: "notice period tenant" })).resolves.toEqual({
      found: false,
    });
    (fakeStatutes.search as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      {
        ref: "a/1",
        title: "Notice",
        act: "The Transfer of Property Act, 1882",
        snippet: "s",
        url: "https://u/",
      },
    ]);
    await expect(lookup.execute({ query: "notice" })).resolves.toEqual({
      found: true,
      act: "The Transfer of Property Act, 1882",
      section: "Notice",
      excerpt: "s",
      url: "https://u/",
    });
  });

  it("works without a state preference", async () => {
    streamText.mockReturnValue({ toUIMessageStreamResponse: () => new Response("ok") });
    setServerDeps(fakeDeps(vi.fn()));
    const response = await POST(jsonPost("/api/ask", { document: SAMPLE_TEXT, messages }));
    expect(response.status).toBe(200);
  });

  it("rejects invalid bodies and missing providers", async () => {
    setServerDeps(fakeDeps(vi.fn()));
    const bad = await POST(jsonPost("/api/ask", { document: SAMPLE_TEXT, messages: [] }));
    expect(bad.status).toBe(400);

    setServerDeps({ ...fakeDeps(vi.fn()), env: {} });
    const none = await POST(jsonPost("/api/ask", { document: SAMPLE_TEXT, messages }));
    expect(none.status).toBe(503);
  });
});

describe("toModelMessages", () => {
  it("keeps text parts only and caps their length", () => {
    const long = "y".repeat(1000);
    expect(
      toModelMessages([{ role: "user", parts: [{ type: "text", text: long }, { type: "file" }] }]),
    ).toEqual([{ role: "user", content: "y".repeat(500) }]);
  });
});
