"use server";

import { redirect } from "next/navigation";

import { parseLogForm, type LogErrors } from "@/lib/logs/fields";
import { upsertShop } from "@/lib/shops/upsert";
import { createClient } from "@/lib/supabase/server";

export type LogFormState = { errors: LogErrors };

/** Creates a Log for the signed-in user (adding its shop if new), then opens it. */
export async function createLog(
  _previous: LogFormState,
  formData: FormData,
): Promise<LogFormState> {
  const { input, errors } = parseLogForm(formData);
  if (errors) return { errors };

  const supabase = await createClient();
  const userId = (await supabase.auth.getClaims()).data?.claims.sub;
  if (!userId) redirect("/sign-in?next=/log");

  const shopId = await upsertShop(supabase, input.shop);
  if (!shopId) {
    return { errors: { form: "We couldn't save that shop. Try again." } };
  }

  const { data, error } = await supabase
    .from("logs")
    .insert({
      author_id: userId,
      shop_id: shopId,
      drink_name: input.drinkName,
      rating: input.rating,
      drank_on: input.drankOn,
      sweetness: input.sweetness,
      ice: input.ice,
      toppings: input.toppings,
      note: input.note,
    })
    .select("id")
    .single();
  if (error || !data) {
    return { errors: { form: "We couldn't save your Log. Try again." } };
  }

  redirect(`/logs/${data.id}`);
}
