/** Log photos: one optional photo per Log, in the private `log-photos` bucket. */

export const LOG_PHOTOS_BUCKET = "log-photos";

/** Log photos are resized in the browser to this long edge before upload. */
export const PHOTO_MAX_EDGE = 1600;

/** The form field the Log form's photo choice travels in. */
export const LOG_PHOTO_FIELD = "photo";

/** How Log photo uploads are saved (see `saveImageChoice`). */
export const LOG_PHOTO_UPLOAD = {
  bucket: LOG_PHOTOS_BUCKET,
  field: LOG_PHOTO_FIELD,
  uploadError: "We couldn't upload your photo. Try again.",
};
