import { vi } from "vitest";
import type { LanguageModel } from "ai";
import type { AnalyzeDeps } from "@/lib/analysis/analyze";
import type { IndiaCodeClient } from "@/lib/statute/indiacode";

/** A same-origin JSON POST as a browser on the site would send it. */
export function jsonPost(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request(`https://app.example${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "sec-fetch-site": "same-origin", ...headers },
    body: JSON.stringify(body),
  });
}

export const fakeStatutes: IndiaCodeClient = {
  search: vi.fn(async () => []),
  getSection: vi.fn(async () => null),
};

/** Dependencies whose model call is replaced by `generate`. */
export function fakeDeps(generate: unknown): AnalyzeDeps {
  return {
    factory: () => ({ modelId: "fake" }) as unknown as LanguageModel,
    env: { GOOGLE_GENERATIVE_AI_API_KEY: "test-key" },
    statutes: fakeStatutes,
    generate: generate as AnalyzeDeps["generate"],
  };
}

export const SAMPLE_TEXT = `RENT AGREEMENT

1. Deposit
The tenant pays a deposit of three months rent, refundable within thirty days of vacating.

2. Notice
Either party may end this agreement with thirty days written notice.`;
