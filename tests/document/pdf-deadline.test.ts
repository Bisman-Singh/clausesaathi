import { describe, expect, it, vi } from "vitest";
import { PDF_TIMEOUT_MS, extractPdfText } from "@/lib/document/pdf";
import { buildSimplePdf } from "@/tests/fixtures/pdf";

vi.mock("unpdf", () => ({
  // A parser that never comes back, standing in for a crafted file that keeps pdf.js busy.
  getDocumentProxy: () => new Promise(() => undefined),
  extractText: vi.fn(),
}));

describe("extractPdfText deadline", () => {
  it("gives up on a parse that outlives the deadline and reports the file as unreadable", async () => {
    const pdf = buildSimplePdf([["Some text that will never be read."]]);
    await expect(extractPdfText(pdf, 20)).rejects.toMatchObject({ code: "unreadable" });
  });

  it("allows a generous default for real documents", () => {
    expect(PDF_TIMEOUT_MS).toBeGreaterThanOrEqual(10_000);
  });
});
