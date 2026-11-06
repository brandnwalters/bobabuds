/** Avatars: one optional avatar per profile, in the private `avatars` bucket. */

export const AVATARS_BUCKET = "avatars";

/** Avatars are resized in the browser to this long edge before upload. */
export const AVATAR_MAX_EDGE = 512;

/** The avatar picker's labels (the file input is labelled add/replace). */
export const AVATAR_PICKER_LABELS = {
  add: "Add avatar",
  replace: "Change avatar",
  remove: "Remove avatar",
  preview: "Avatar preview",
};

/** The form field the avatar picker's choice travels in. */
export const AVATAR_FIELD = "avatar";
