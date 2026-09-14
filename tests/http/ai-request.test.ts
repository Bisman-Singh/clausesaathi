import { describe, expect, it } from "vitest";
import { AiUnavailableError } from "@/lib/ai/client";
import { PdfError } from "@/lib/document/pdf";
import { guardAiRequest, toHttpError } from "@/lib/http/ai-request";
import { HttpError } from "@/lib/http/guard";
import { RateLimiter } from "@/lib/http/rate-limit";
import { SharedRateLimiter } from "@/lib/http/shared-rate-limit";

const request = () =>
  new Request("https://app.example/api/x", {
    method: "POST",
    headers: { "sec-fetch-site": "same-origin", "x-forwarded-for": "9.9.9.9" },
  });

describe("guardAiRequest", () => {
  it("lets requests through until the limiter refuses", async () => {
    const limiter = new RateLimiter(1, 60_000, () => 0);
    await expect(guardAiRequest(request(), limiter)).resolves.toBeUndefined();
    await expect(guardAiRequest(request(), limiter)).rejects.toThrow(HttpError);
    const error = await guardAiRequest(request(), limiter).catch((e: unknown) => e);
    expect((error as HttpError).status).toBe(429);
  });

  it("works the same over a shared limiter", async () => {
    let calls = 0;
    const limiter = new SharedRateLimiter({ limit: async () => ({ success: calls++ === 0 }) });
    await expect(guardAiRequest(request(), limiter)).resolves.toBeUndefined();
    await expect(guardAiRequest(request(), limiter)).rejects.toMatchObject({ status: 429 });
  });
});

describe("toHttpError", () => {
  it("maps known failures and passes others through", () => {
    expect(toHttpError(new PdfError("no_text"))).toMatchObject({
      status: 400,
      code: "pdf_no_text",
    });
    expect(toHttpError(new AiUnavailableError("x", 3))).toMatchObject({
      status: 503,
      code: "ai_unavailable",
    });
    const other = new Error("other");
    expect(toHttpError(other)).toBe(other);
  });
});
