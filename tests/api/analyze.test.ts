import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/analyze/route";
import type { DocumentBriefWire } from "@/lib/analysis/schemas";
import { LIMITS } from "@/lib/constants";
import { setServerDeps } from "@/lib/server/deps";
import { buildSimplePdf } from "@/tests/fixtures/pdf";
import { SAMPLE_TEXT, fakeDeps, jsonPost } from "@/tests/api/helpers";

const brief: DocumentBriefWire = {
  documentType: "Rent agreement",
  parties: ["Landlord", "Tenant"],
  summary: [{ text: "Deposit is three months rent.", clauseIds: ["c1"] }],
  keyTerms: [],
  obligations: [],
  risks: [],
  inconsistencies: [],
  nextSteps: [],
  questionsForLawyer: [],
  checklist: [],
};

afterEach(() => setServerDeps(null));

describe("POST /api/analyze", () => {
  it("analyses pasted text and returns the document with its brief", async () => {
    const generate = vi.fn<(...args: unknown[]) => Promise<{ output: DocumentBriefWire }>>(() =>
      Promise.resolve({ output: brief }),
    );
    setServerDeps(fakeDeps(generate));
    const response = await POST(
      jsonPost("/api/analyze", {
        text: SAMPLE_TEXT,
        situation: "tenant",
        locale: "hi",
        state: "Karnataka",
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.document.clauses).toHaveLength(2);
    expect(body.result.brief.documentType).toBe("Rent agreement");
    expect(body.result.model).toBe("google/gemini-3.6-flash");
    const call = generate.mock.calls[0]?.[0] as unknown as { system: string; prompt: string };
    expect(call.system).toContain("Hindi");
    expect(call.prompt).toContain("tenant");
  });

  it("analyses an uploaded PDF", async () => {
    setServerDeps(fakeDeps(vi.fn(async () => ({ output: brief }))));
    const form = new FormData();
    const pdf = buildSimplePdf([SAMPLE_TEXT.split("\n").filter(Boolean)]);
    form.append(
      "file",
      new File([pdf as unknown as BlobPart], "agreement.pdf", { type: "application/pdf" }),
    );
    form.append("situation", new File([new Uint8Array(2)], "not-a-string.bin"));
    form.append("locale", "en");
    form.append("state", "Nowhere");
    const response = await POST(
      new Request("https://app.example/api/analyze", {
        method: "POST",
        headers: { "sec-fetch-site": "same-origin" },
        body: form,
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.document.clauses.length).toBeGreaterThan(0);
  });

  it("treats a body without a content type as JSON", async () => {
    setServerDeps(fakeDeps(vi.fn(() => Promise.resolve({ output: brief }))));
    const response = await POST(
      new Request("https://app.example/api/analyze", {
        method: "POST",
        headers: { "sec-fetch-site": "same-origin" },
        body: JSON.stringify({ text: SAMPLE_TEXT }),
      }),
    );
    expect(response.status).toBe(200);
  });

  it("rejects a multipart request without a file", async () => {
    setServerDeps(fakeDeps(vi.fn()));
    const form = new FormData();
    form.append("situation", "x");
    const response = await POST(
      new Request("https://app.example/api/analyze", {
        method: "POST",
        headers: { "sec-fetch-site": "same-origin" },
        body: form,
      }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "missing_file" });
  });

  it("maps PDF problems to stable error codes", async () => {
    setServerDeps(fakeDeps(vi.fn()));
    const form = new FormData();
    form.append("file", new File([new TextEncoder().encode("nope")], "x.pdf"));
    const response = await POST(
      new Request("https://app.example/api/analyze", {
        method: "POST",
        headers: { "sec-fetch-site": "same-origin" },
        body: form,
      }),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "pdf_unreadable" });
  });

  it("rejects an oversized file by declared size", async () => {
    setServerDeps(fakeDeps(vi.fn()));
    const form = new FormData();
    form.append("file", new File([new Uint8Array(LIMITS.MAX_PDF_BYTES + 1)], "big.pdf"));
    const response = await POST(
      new Request("https://app.example/api/analyze", {
        method: "POST",
        headers: { "sec-fetch-site": "same-origin" },
        body: form,
      }),
    );
    await expect(response.json()).resolves.toMatchObject({ error: "pdf_too_large" });
  });

  it("rejects text that is too short or too long", async () => {
    setServerDeps(fakeDeps(vi.fn()));
    const short = await POST(jsonPost("/api/analyze", { text: "hi" }));
    await expect(short.json()).resolves.toMatchObject({ error: "too_short" });
    const long = await POST(
      jsonPost("/api/analyze", { text: "x".repeat(LIMITS.MAX_DOCUMENT_CHARS + 1) }),
    );
    await expect(long.json()).resolves.toMatchObject({ error: "too_long" });
  });

  it("refuses cross-site callers", async () => {
    setServerDeps(fakeDeps(vi.fn()));
    const response = await POST(
      jsonPost("/api/analyze", { text: SAMPLE_TEXT }, { "sec-fetch-site": "cross-site" }),
    );
    expect(response.status).toBe(403);
  });

  it("returns 503 when every model fails", async () => {
    setServerDeps(fakeDeps(vi.fn(async () => Promise.reject(new Error("quota")))));
    const response = await POST(jsonPost("/api/analyze", { text: SAMPLE_TEXT }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "ai_unavailable" });
  });

  it("builds real dependencies once when none are injected", async () => {
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "g");
    const { serverDeps } = await import("@/lib/server/deps");
    const first = serverDeps();
    expect(serverDeps()).toBe(first);
    expect(first.env.GOOGLE_GENERATIVE_AI_API_KEY).toBe("g");
    vi.unstubAllEnvs();
  });
});
