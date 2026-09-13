import { describe, expect, it } from "vitest";
import { AiUnavailableError } from "@/lib/ai/client";
import { PdfError } from "@/lib/document/pdf";
import { guardAiRequest, toHttpError } from "@/lib/http/ai-request";
import { HttpError } from "@/lib/http/guard";
import { RateLimiter } from "@/lib/http/rate-limit";

const request = () =>
  new Request("https://app.example/api/x", {
    method: "POST",
    headers: { "sec-fetch-site": "same-origin", "x-forwarded-for": "9.9.9.9" },
  });

describe("guardAiRequest", () => {
  it("lets requests through until the limiter refuses", () => {
    const limiter = new RateLimiter(1, 60_000, () => 0);
    expect(() => guardAiRequest(request(), limiter)).not.toThrow();
    expect(() => guardAiRequest(request(), limiter)).toThrow(HttpError);
    try {
      guardAiRequest(request(), limiter);
    } catch (error) {
      expect((error as HttpError).status).toBe(429);
    }
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
