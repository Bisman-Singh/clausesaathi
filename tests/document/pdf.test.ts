import { describe, expect, it } from "vitest";
import { LIMITS } from "@/lib/constants";
import { PdfError, extractPdfText } from "@/lib/document/pdf";
import { buildSimplePdf } from "@/tests/fixtures/pdf";

describe("extractPdfText", () => {
  it("extracts the text layer across pages", async () => {
    const pdf = buildSimplePdf([
      ["RENTAL AGREEMENT", "1. Term", "The tenancy runs for eleven months."],
      ["2. Notice", "Thirty days written notice by either party."],
    ]);
    const result = await extractPdfText(pdf);
    expect(result.pages).toBe(2);
    expect(result.text).toContain("RENTAL AGREEMENT");
    expect(result.text).toContain("Thirty days written notice");
  });

  it("rejects files above the size limit before parsing", async () => {
    const huge = new Uint8Array(LIMITS.MAX_UPLOAD_BYTES + 1);
    await expect(extractPdfText(huge)).rejects.toMatchObject({ code: "too_large" });
  });

  it("rejects documents with too many pages", async () => {
    const pages = Array.from({ length: LIMITS.MAX_PDF_PAGES + 1 }, (_, i) => [`Page ${i}`]);
    await expect(extractPdfText(buildSimplePdf(pages))).rejects.toMatchObject({
      code: "too_many_pages",
    });
  });

  it("rejects scans and near-empty files without consuming the caller's bytes", async () => {
    const scan = buildSimplePdf([["hi"]]);
    const length = scan.byteLength;
    await expect(extractPdfText(scan)).rejects.toMatchObject({ code: "no_text" });
    expect(scan.byteLength).toBe(length);
  });

  it("rejects bytes that are not a PDF", async () => {
    const error = await extractPdfText(new TextEncoder().encode("not a pdf at all")).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(PdfError);
    expect((error as PdfError).code).toBe("unreadable");
    expect((error as PdfError).message).toBe("pdf:unreadable");
  });
});
