-- Cheers: the single reaction on a Log ("🧋 cheers").
--
-- One row per (Log, user). Visibility follows the Log: a user can read the
-- Cheers on Logs they can view, and add or remove only their own Cheers on
-- those Logs (public.can_view_logs_of). Cheers go away with their Log
-- (and with the cheering user's profile).

create table public.cheers (
  log_id uuid not null references public.logs (id) on delete cascade,
  user_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (log_id, user_id)
);

comment on table public.cheers is
  'A user''s Cheers on a Log. Readable, and addable/removable by the cheering user, only on Logs the user can view (public.can_view_logs_of).';

-- "Which Logs did this user cheer" lookups and the user FK cascade.
create index cheers_user_id on public.cheers (user_id);

alter table public.cheers enable row level security;

grant select on public.cheers to authenticated;
grant insert (log_id, user_id) on public.cheers to authenticated;
grant delete on public.cheers to authenticated;

-- The subquery on logs runs under the logs select policy too, so a Log the
-- user can't see yields null and the check fails.
create policy "Users can read cheers on logs they can view"
  on public.cheers for select
  to authenticated
  using (
    public.can_view_logs_of(
      (select l.author_id from public.logs l where l.id = log_id)
    )
  );

create policy "Users can cheer logs they can view"
  on public.cheers for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and public.can_view_logs_of(
      (select l.author_id from public.logs l where l.id = log_id)
    )
  );

create policy "Users can remove their own cheers on logs they can view"
  on public.cheers for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and public.can_view_logs_of(
      (select l.author_id from public.logs l where l.id = log_id)
    )
  );
