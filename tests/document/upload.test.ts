import { describe, expect, it } from "vitest";
import {
  UPLOAD_ACCEPT,
  isImageUpload,
  sniffMediaType,
  uploadMediaType,
} from "@/lib/document/upload";

describe("sniffMediaType", () => {
  it("recognises the four accepted formats by their signatures", () => {
    expect(sniffMediaType(new TextEncoder().encode("%PDF-1.7\n"))).toBe("application/pdf");
    expect(sniffMediaType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffMediaType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe("image/png");
    const webp = new Uint8Array(16);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([0x57, 0x45, 0x42, 0x50], 8);
    expect(sniffMediaType(webp)).toBe("image/webp");
  });

  it("returns null for anything else, including empty input", () => {
    expect(sniffMediaType(new Uint8Array(0))).toBeNull();
    expect(sniffMediaType(new TextEncoder().encode("GIF89a"))).toBeNull();
  });
});

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
