// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SHRINK, shrinkImage } from "@/lib/client/image";

const photo = new File([new Uint8Array(16)], "IMG_0042.HEIC.jpeg", { type: "image/jpeg" });

/** Stub the browser image pipeline with a bitmap of the given size and a canvas that yields `blob`. */
function stubCanvas(width: number, height: number, blob: Blob | null) {
  const close = vi.fn();
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ width, height, close })),
  );
  const drawImage = vi.fn();
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ({ drawImage })),
    toBlob: vi.fn((callback: (value: Blob | null) => void) => callback(blob)),
  };
  vi.spyOn(document, "createElement").mockReturnValue(canvas as unknown as HTMLElement);
  return { canvas, drawImage, close };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("shrinkImage", () => {
  it("scales a large photo down to the long-edge limit and re-encodes it as JPEG", async () => {
    const { canvas, drawImage, close } = stubCanvas(4000, 3000, new Blob([new Uint8Array(8)]));
    const out = await shrinkImage(photo);
    expect(canvas.width).toBe(DEFAULT_SHRINK.maxSide);
    expect(canvas.height).toBe(1500);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2000, 1500);
    expect(close).toHaveBeenCalled();
    expect(out.name).toBe("IMG_0042.HEIC.jpg");
    expect(out.type).toBe("image/jpeg");
    expect(out.size).toBe(8);
  });

  it("never enlarges a small image", async () => {
    const { canvas } = stubCanvas(800, 600, new Blob([new Uint8Array(4)]));
    await shrinkImage(photo);
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
  });

  it("leaves PDFs alone and falls back to the original when the browser cannot help", async () => {
    const pdf = new File([new Uint8Array(4)], "a.pdf", { type: "application/pdf" });
    expect(await shrinkImage(pdf)).toBe(pdf);

    stubCanvas(4000, 3000, null);
    expect(await shrinkImage(photo)).toBe(photo);

    const { canvas } = stubCanvas(4000, 3000, new Blob([new Uint8Array(4)]));
    canvas.getContext = vi.fn(() => null) as never;
    expect(await shrinkImage(photo)).toBe(photo);

    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => Promise.reject(new Error("no decoder"))),
    );
    expect(await shrinkImage(photo)).toBe(photo);

    const unnamed = new File([new Uint8Array(4)], ".png", { type: "image/png" });
    stubCanvas(10, 10, new Blob([new Uint8Array(4)]));
    expect((await shrinkImage(unnamed)).name).toBe("photo.jpg");
  });
});
