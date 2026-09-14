import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/compare/route";
import {
  MAX_EXPLAINED_PAIRS,
  explainSystemPrompt,
  explainUserPrompt,
  modifiedPairs,
} from "@/lib/compare/explain";
import { diffDocuments } from "@/lib/compare/diff";
import { segmentDocument } from "@/lib/document/segment";
import { setServerDeps } from "@/lib/server/deps";
import { RENT_AGREEMENT_V1, RENT_AGREEMENT_V2 } from "@/lib/samples";
import { fakeDeps, jsonPost } from "@/tests/api/helpers";

afterEach(() => setServerDeps(null));

describe("POST /api/compare", () => {
  it("diffs two versions and returns explanations for changed clauses only", async () => {
    const changes = diffDocuments(
      segmentDocument(RENT_AGREEMENT_V1),
      segmentDocument(RENT_AGREEMENT_V2),
    );
    const pairs = modifiedPairs(changes);
    expect(pairs.length).toBeGreaterThan(0);
    const generate = vi.fn<(...args: unknown[]) => Promise<unknown>>(() =>
      Promise.resolve({
        output: {
          changes: [
            {
              index: pairs[0]?.index,
              whatChanged: "Interest drops.",
              whoBenefits: "Tenant",
              severity: "medium",
            },
            { index: 999, whatChanged: "made up", whoBenefits: "neither", severity: "low" },
          ],
        },
      }),
    );
    setServerDeps(fakeDeps(generate));

    const response = await POST(
      jsonPost("/api/compare", {
        before: RENT_AGREEMENT_V1,
        after: RENT_AGREEMENT_V2,
        locale: "en",
      }),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.summary.modified).toBeGreaterThan(0);
    expect(body.explanations).toEqual([
      {
        index: pairs[0]?.index,
        whatChanged: "Interest drops.",
        whoBenefits: "Tenant",
        severity: "medium",
      },
    ]);
    expect(body.model).toBe("google/gemini-3.6-flash");
    const call = generate.mock.calls[0]?.[0] as unknown as { system: string; prompt: string };
    expect(call.system).toBe(explainSystemPrompt("en"));
    expect(call.prompt).toBe(explainUserPrompt(pairs));
    expect(call.prompt).toContain(`Change ${pairs[0]?.index}`);
  });

  it("skips the model entirely when nothing changed", async () => {
    const generate = vi.fn();
    setServerDeps(fakeDeps(generate));
    const response = await POST(
      jsonPost("/api/compare", { before: RENT_AGREEMENT_V1, after: RENT_AGREEMENT_V1 }),
    );
    const body = await response.json();
    expect(body.summary.modified).toBe(0);
    expect(body.explanations).toEqual([]);
    expect(body.model).toBe("none");
    expect(generate).not.toHaveBeenCalled();
  });

  it("validates the body", async () => {
    setServerDeps(fakeDeps(vi.fn()));
    const response = await POST(
      jsonPost("/api/compare", { before: "short", after: RENT_AGREEMENT_V2 }),
    );
    expect(response.status).toBe(400);
    const blank = await POST(
      jsonPost("/api/compare", { before: " ".repeat(100), after: RENT_AGREEMENT_V2 }),
    );
    await expect(blank.json()).resolves.toMatchObject({ error: "too_short" });
    const unknown = await POST(
      jsonPost("/api/compare", { before: RENT_AGREEMENT_V2, after: RENT_AGREEMENT_V2, extra: 1 }),
    );
    await expect(unknown.json()).resolves.toMatchObject({ error: "invalid_request" });
  });
});

describe("modifiedPairs cap", () => {
  it("explains the least similar pairs first when there are more than the cap", () => {
    const changes = Array.from({ length: MAX_EXPLAINED_PAIRS + 5 }, (_, index) => ({
      kind: "modified" as const,
      before: { id: `c${index}`, index, heading: null, text: `before ${index}` },
      after: { id: `c${index}`, index, heading: null, text: `after ${index}` },
      similarity: index / 100,
      segments: null,
    }));
    const pairs = modifiedPairs(changes);
    expect(pairs).toHaveLength(MAX_EXPLAINED_PAIRS);
    expect(pairs.map((pair) => pair.index)).toEqual(
      Array.from({ length: MAX_EXPLAINED_PAIRS }, (_, index) => index),
    );
  });
});
