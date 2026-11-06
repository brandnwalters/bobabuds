-- Authors can edit and delete their own Logs.
--
-- author_id is deliberately not updatable, so a Log can't be handed to
-- someone else. Tables that hang off a Log (Cheers) must reference
-- public.logs with `on delete cascade` so deleting a Log removes them too.

grant update (shop_id, drink_name, rating, drank_on, sweetness, ice, toppings, note)
  on public.logs to authenticated;
grant delete on public.logs to authenticated;

create policy "Authors can update their own logs"
  on public.logs for update
  to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy "Authors can delete their own logs"
  on public.logs for delete
  to authenticated
  using (author_id = (select auth.uid()));
