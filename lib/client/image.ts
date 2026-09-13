/**
 * Shrinking a photo in the browser before it is uploaded.
 *
 * Phone cameras produce 4 to 12 MB JPEGs; the upload cap is 4 MB and the model
 * reads text fine from a 2000-pixel image. Re-encoding through a canvas also
 * drops EXIF metadata (GPS position, device, timestamp), so a photo of a
 * notice does not carry the user's location to the server or the provider.
 * Anything that fails falls back to the original file untouched.
 */

export interface ShrinkOptions {
  /** Longest side of the output, in pixels. */
  maxSide: number;
  /** JPEG quality, 0 to 1. */
  quality: number;
}

export const DEFAULT_SHRINK: ShrinkOptions = { maxSide: 2000, quality: 0.85 };

function targetSize(width: number, height: number, maxSide: number): [number, number] {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return [Math.round(width * scale), Math.round(height * scale)];
}

/** A JPEG no larger than `maxSide` on its long edge, or the original when shrinking is impossible. */
export async function shrinkImage(
  file: File,
  options: ShrinkOptions = DEFAULT_SHRINK,
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const [width, height] = targetSize(bitmap.width, bitmap.height, options.maxSide);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", options.quality),
    );
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
