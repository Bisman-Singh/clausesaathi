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

const MAGIC: Array<{ type: UploadMediaType; bytes: number[]; at?: number }> = [
  { type: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  { type: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { type: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { type: "image/webp", bytes: [0x57, 0x45, 0x42, 0x50], at: 8 },
];

/** The media type the bytes actually are, from their signature, or null when none matches. */
export function sniffMediaType(bytes: Uint8Array): UploadMediaType | null {
  const match = MAGIC.find(({ bytes: signature, at = 0 }) =>
    signature.every((value, index) => bytes[at + index] === value),
  );
  return match ? match.type : null;
}

/** Whether the upload is an image, which always needs transcription. */
export function isImageUpload(mediaType: UploadMediaType): boolean {
  return mediaType.startsWith("image/");
}
