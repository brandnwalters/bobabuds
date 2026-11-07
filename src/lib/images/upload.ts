/**
 * Image uploads, browser half: resize/compress a picked image and carry the
 * user's choice (keep / new image / remove) through a form submission. The
 * server half is `@/lib/images/storage`. Used for Log photos and avatars.
 */

/** Types the image buckets accept (what `resizeImage` produces). */
export const IMAGE_TYPES = ["image/webp", "image/jpeg"] as const;
/** Largest upload the server accepts (the buckets' file size limit too). */
export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export type ResizeOptions = {
  /** Longest edge of the output in pixels; smaller images aren't upscaled. */
  maxEdge: number;
  /** Encoder quality, 0-1. */
  quality?: number;
};

/**
 * Resizes and compresses an image in the browser: long edge capped at
 * `maxEdge`, encoded as WebP (JPEG where the browser can't encode WebP).
 * Honors EXIF orientation. Throws if the file isn't a readable image.
 */
export async function resizeImage(
  file: Blob,
  { maxEdge, quality = 0.82 }: ResizeOptions,
): Promise<File> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not available");
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);

    const encode = (type: string) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    // Browsers that can't encode WebP silently fall back to PNG.
    let blob = await encode("image/webp");
    if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg");
    if (!blob) throw new Error("Couldn't encode the image");

    const extension = blob.type === "image/webp" ? "webp" : "jpg";
    return new File([blob], `image.${extension}`, { type: blob.type });
  } finally {
    bitmap.close();
  }
}

/** What the user did with an image field. */
export type ImageChoice =
  | { status: "unchanged" }
  | { status: "new"; file: File }
  | { status: "removed" };

const REMOVED = "remove";

/**
 * Puts an image choice into form data under `name` (a file for a new image,
 * a marker for removal, nothing when unchanged). Call it from the form's
 * action wrapper, since React resets file inputs after an action.
 */
export function setImageChoice(formData: FormData, name: string, choice: ImageChoice) {
  formData.delete(name);
  if (choice.status === "new") formData.set(name, choice.file);
  if (choice.status === "removed") formData.set(name, REMOVED);
}

/** Reads (and checks) what `setImageChoice` wrote. */
export function readImageChoice(
  formData: FormData,
  name: string,
): ImageChoice | { status: "invalid"; error: string } {
  const value = formData.get(name);
  if (value === null || value === "") return { status: "unchanged" };
  if (value === REMOVED) return { status: "removed" };
  if (typeof value === "string") return { status: "invalid", error: "That photo didn't upload. Try again." };
  if (!(IMAGE_TYPES as readonly string[]).includes(value.type)) {
    return { status: "invalid", error: "Photos must be JPEG or WebP images." };
  }
  if (value.size === 0 || value.size > IMAGE_MAX_BYTES) {
    return { status: "invalid", error: "That photo is too big. Try another one." };
  }
  return { status: "new", file: value };
}
