"use server";

import { redirect } from "next/navigation";

import { removeImages, saveImageChoice } from "@/lib/images/storage";
import { type LogInput, parseLogForm, type LogErrors } from "@/lib/logs/fields";
import { LOG_PHOTO_UPLOAD, LOG_PHOTOS_BUCKET } from "@/lib/logs/photos";
import { findOrAddShop } from "@/lib/shops/find-or-add";
import {
  createClient,
  getViewerId,
  type ServerSupabase,
} from "@/lib/supabase/server";

export type LogFormState = { errors: LogErrors };

/** The logs columns a form submission sets (shop already resolved to its id). */
function logColumns(input: LogInput, shopId: string) {
  return {
    shop_id: shopId,
    drink_name: input.drinkName,
    rating: input.rating,
    drank_on: input.drankOn,
    sweetness: input.sweetness,
    ice: input.ice,
    toppings: input.toppings,
    note: input.note,
  };
}

async function signedInUser(supabase: ServerSupabase, next: string) {
  const userId = await getViewerId(supabase);
  if (!userId) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return userId;
}

/** Creates a Log for the signed-in user (adding its shop if new), then opens it. */
export async function createLog(
  _previous: LogFormState,
  formData: FormData,
): Promise<LogFormState> {
  const { input, errors } = parseLogForm(formData);
  if (errors) return { errors };

  const supabase = await createClient();
  const userId = await signedInUser(supabase, "/log");

  const shopId = await findOrAddShop(input.shop.placeId);
  if (!shopId) {
    return { errors: { form: "We couldn't save that shop. Try again." } };
  }

  const photo = await saveImageChoice(supabase, {
    ...LOG_PHOTO_UPLOAD,
    ownerId: userId,
    formData,
  });
  if (photo.error) return { errors: { photo: photo.error } };

  const { data, error } = await supabase
    .from("logs")
    .insert({
      author_id: userId,
      ...logColumns(input, shopId),
      photo_path: photo.path ?? null,
    })
    .select("id")
    .single();
  if (error || !data) {
    await removeImages(supabase, LOG_PHOTOS_BUCKET, [photo.path]);
    return { errors: { form: "We couldn't save your Log. Try again." } };
  }

  redirect(`/logs/${data.id}`);
}

/**
 * Saves the form over an existing Log, then opens it. Row-level security
 * limits this to the author; anyone else updates nothing and gets an error.
 * A replaced or removed photo is deleted from Storage.
 * Bind the Log id: `updateLog.bind(null, id)`.
 */
export async function updateLog(
  id: string,
  _previous: LogFormState,
  formData: FormData,
): Promise<LogFormState> {
  const { input, errors } = parseLogForm(formData);
  if (errors) return { errors };

  const supabase = await createClient();
  const userId = await signedInUser(supabase, `/logs/${id}/edit`);

  const shopId = await findOrAddShop(input.shop.placeId);
  if (!shopId) {
    return { errors: { form: "We couldn't save that shop. Try again." } };
  }

  // The current photo, to delete once it's replaced or removed.
  const { data: current } = await supabase
    .from("logs")
    .select("photo_path")
    .eq("id", id)
    .eq("author_id", userId)
    .maybeSingle<{ photo_path: string | null }>();
  if (!current) {
    return { errors: { form: "We couldn't save your changes. Try again." } };
  }

  const photo = await saveImageChoice(supabase, {
    ...LOG_PHOTO_UPLOAD,
    ownerId: userId,
    formData,
  });
  if (photo.error) return { errors: { photo: photo.error } };
  const photoChanged = photo.path !== undefined;

  const { data, error } = await supabase
    .from("logs")
    .update({
      ...logColumns(input, shopId),
      ...(photoChanged ? { photo_path: photo.path } : {}),
    })
    .eq("id", id)
    .select("id");
  if (error || !data || data.length === 0) {
    await removeImages(supabase, LOG_PHOTOS_BUCKET, [photo.path]);
    return { errors: { form: "We couldn't save your changes. Try again." } };
  }
  if (photoChanged) {
    await removeImages(supabase, LOG_PHOTOS_BUCKET, [current.photo_path]);
  }

  redirect(`/logs/${id}`);
}

export type DeleteLogState = { error?: string };

/**
 * Deletes a Log (the database removes anything that hangs off it) and its
 * photo, then opens the Profile. Only the author can; anyone else deletes
 * nothing. Bind the Log id: `deleteLog.bind(null, id)`.
 */
export async function deleteLog(id: string): Promise<DeleteLogState> {
  const supabase = await createClient();
  await signedInUser(supabase, `/logs/${id}`);

  const { data, error } = await supabase
    .from("logs")
    .delete()
    .eq("id", id)
    .select("id, photo_path")
    .returns<{ id: string; photo_path: string | null }[]>();
  if (error || !data || data.length === 0) {
    return { error: "We couldn't delete this Log. Try again." };
  }
  await removeImages(
    supabase,
    LOG_PHOTOS_BUCKET,
    data.map((log) => log.photo_path),
  );

  redirect("/profile");
}
