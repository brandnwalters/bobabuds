-- Friend visibility for Logs, and the Feed's ordering index.
--
-- The shared "can view" rule: the signed-in user can see an author's Logs
-- (and, later, their Cheers and photos) if they are that author or friends
-- with them. Everything that gates on Log visibility should call this helper
-- so the rule lives in one place.

-- Can the signed-in user view `author`'s Logs? Security definer so it can read
-- the friendships table without nested row-level security; it only ever
-- answers for auth.uid(), so it can't be used to probe other people's
-- friendships.
create function public.can_view_logs_of(author uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select author = (select auth.uid())
    or exists (
      select 1 from public.friendships f
      where f.user_a = least(author, (select auth.uid()))
        and f.user_b = greatest(author, (select auth.uid()))
    );
$$;

revoke execute on function public.can_view_logs_of(uuid) from public, anon;
grant execute on function public.can_view_logs_of(uuid) to authenticated;

drop policy "Authors can read their own logs" on public.logs;

create policy "Authors and their friends can read logs"
  on public.logs for select
  to authenticated
  using (public.can_view_logs_of(author_id));

comment on table public.logs is
  'One drink entry by one user. Only the author can create; the author and their friends can read (public.can_view_logs_of).';

-- Feed order: newest created first, id as the tie-breaker (and cursor).
create index logs_newest on public.logs (created_at desc, id desc);
