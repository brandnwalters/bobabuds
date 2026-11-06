"use server";

import { redirect } from "next/navigation";

import { type LogInput, parseLogForm, type LogErrors } from "@/lib/logs/fields";
import { upsertShop } from "@/lib/shops/upsert";
import { createClient } from "@/lib/supabase/server";

export type LogFormState = { errors: LogErrors };

type Supabase = Awaited<ReturnType<typeof createClient>>;

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

async function signedInUser(supabase: Supabase, next: string) {
  const userId = (await supabase.auth.getClaims()).data?.claims.sub;
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

  const shopId = await upsertShop(supabase, input.shop);
  if (!shopId) {
    return { errors: { form: "We couldn't save that shop. Try again." } };
  }

  const { data, error } = await supabase
    .from("logs")
    .insert({ author_id: userId, ...logColumns(input, shopId) })
    .select("id")
    .single();
  if (error || !data) {
    return { errors: { form: "We couldn't save your Log. Try again." } };
  }

  redirect(`/logs/${data.id}`);
}

/**
 * Saves the form over an existing Log, then opens it. Row-level security
 * limits this to the author; anyone else updates nothing and gets an error.
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
  await signedInUser(supabase, `/logs/${id}/edit`);

  const shopId = await upsertShop(supabase, input.shop);
  if (!shopId) {
    return { errors: { form: "We couldn't save that shop. Try again." } };
  }

  const { data, error } = await supabase
    .from("logs")
    .update(logColumns(input, shopId))
    .eq("id", id)
    .select("id");
  if (error || !data || data.length === 0) {
    return { errors: { form: "We couldn't save your changes. Try again." } };
  }

  redirect(`/logs/${id}`);
}

export type DeleteLogState = { error?: string };

/**
 * Deletes a Log (the database removes anything that hangs off it), then
 * opens the Profile. Only the author can; anyone else deletes nothing.
 * Bind the Log id: `deleteLog.bind(null, id)`.
 */
export async function deleteLog(id: string): Promise<DeleteLogState> {
  const supabase = await createClient();
  await signedInUser(supabase, `/logs/${id}`);

  const { data, error } = await supabase
    .from("logs")
    .delete()
    .eq("id", id)
    .select("id");
  if (error || !data || data.length === 0) {
    return { error: "We couldn't delete this Log. Try again." };
  }

  redirect("/profile");
}
