/**
 * What an uploaded file is, decided from its declared type with the file
 * extension as a fallback, because browsers leave `type` empty for some
 * files and a wrong declaration is worth catching before any parsing.
 */

export const UPLOAD_MEDIA_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type UploadMediaType = (typeof UPLOAD_MEDIA_TYPES)[number];

/** The `accept` attribute for the upload input, types and extensions both. */
export const UPLOAD_ACCEPT = `${UPLOAD_MEDIA_TYPES.join(",")},.pdf,.jpg,.jpeg,.png,.webp`;

const BY_EXTENSION: Record<string, UploadMediaType> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function isUploadMediaType(value: string): value is UploadMediaType {
  return (UPLOAD_MEDIA_TYPES as readonly string[]).includes(value);
}

/** The media type of an upload, or null when it is not a kind the app reads. */
export function uploadMediaType(file: { type: string; name: string }): UploadMediaType | null {
  const declared = file.type.toLowerCase();
  if (isUploadMediaType(declared)) return declared;
  const name = file.name.toLowerCase();
  const extension = name.slice(name.lastIndexOf(".") + 1);
  return BY_EXTENSION[extension] ?? null;
}

/** Whether the upload is an image, which always needs transcription. */
export function isImageUpload(mediaType: UploadMediaType): boolean {
  return mediaType.startsWith("image/");
}
