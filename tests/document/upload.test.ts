import { describe, expect, it } from "vitest";
import { UPLOAD_ACCEPT, isImageUpload, uploadMediaType } from "@/lib/document/upload";

describe("uploadMediaType", () => {
  it("trusts a known declared type, whatever the extension", () => {
    expect(uploadMediaType({ type: "application/pdf", name: "x.bin" })).toBe("application/pdf");
    expect(uploadMediaType({ type: "IMAGE/JPEG", name: "x" })).toBe("image/jpeg");
  });

  it("falls back to the extension when the browser gives no usable type", () => {
    expect(uploadMediaType({ type: "", name: "Scan.JPG" })).toBe("image/jpeg");
    expect(uploadMediaType({ type: "application/octet-stream", name: "a.png" })).toBe("image/png");
    expect(uploadMediaType({ type: "", name: "a.webp" })).toBe("image/webp");
    expect(uploadMediaType({ type: "", name: "a.pdf" })).toBe("application/pdf");
  });

  it("rejects everything else, including files with no extension", () => {
    expect(uploadMediaType({ type: "text/plain", name: "a.txt" })).toBeNull();
    expect(uploadMediaType({ type: "", name: "noext" })).toBeNull();
    expect(uploadMediaType({ type: "", name: "" })).toBeNull();
    expect(uploadMediaType({ type: "image/gif", name: "a.gif" })).toBeNull();
  });

  it("distinguishes images from PDFs and lists both in the accept string", () => {
    expect(isImageUpload("image/png")).toBe(true);
    expect(isImageUpload("application/pdf")).toBe(false);
    expect(UPLOAD_ACCEPT).toContain("application/pdf");
    expect(UPLOAD_ACCEPT).toContain(".jpeg");
  });
});
