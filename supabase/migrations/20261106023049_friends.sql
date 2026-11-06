-- Friends: Friend Requests and mutual Friendships.

create table public.friend_requests (
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (sender_id, recipient_id),
  constraint friend_requests_not_self check (sender_id <> recipient_id)
);

comment on table public.friend_requests is
  'Pending Friend Requests. Accepting, declining or cancelling deletes the row.';

create index friend_requests_recipient_idx on public.friend_requests (recipient_id);

-- A symmetric pair, stored once with the lower id first.
create table public.friendships (
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  constraint friendships_canonical_order check (user_a < user_b)
);

comment on table public.friendships is
  'Mutual Friendships, one row per pair (user_a < user_b). Unfriending deletes the row.';

create index friendships_user_b_idx on public.friendships (user_b);

-- Access rules ---------------------------------------------------------------
-- Rows are created only through the functions below, never inserted directly.

alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;

revoke all on public.friend_requests from anon, authenticated;
revoke all on public.friendships from anon, authenticated;
grant select, delete on public.friend_requests to authenticated;
grant select, delete on public.friendships to authenticated;

create policy "Senders and recipients can read their requests"
  on public.friend_requests for select
  to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));

-- The sender cancels, the recipient declines: both delete the request.
create policy "Senders can cancel and recipients can decline their requests"
  on public.friend_requests for delete
  to authenticated
  using ((select auth.uid()) in (sender_id, recipient_id));

create policy "Users can read their own friendships"
  on public.friendships for select
  to authenticated
  using ((select auth.uid()) in (user_a, user_b));

create policy "Either friend can unfriend"
  on public.friendships for delete
  to authenticated
  using ((select auth.uid()) in (user_a, user_b));

-- Functions ------------------------------------------------------------------

-- Are `a` and `b` friends? Security invoker: a signed-in user only sees their
-- own friendships, so it can't be used to probe other people's friend lists.
create function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.user_a = least(a, b) and f.user_b = greatest(a, b)
  );
$$;

-- Sends a Friend Request from the signed-in user to `recipient`. If the
-- recipient has already requested the signed-in user, the two become friends
-- at once instead. Returns 'requested' or 'friends'.
create function public.send_friend_request(recipient uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if recipient = me then
    raise exception 'You can''t send a friend request to yourself'
      using errcode = '23514';
  end if;
  if public.are_friends(me, recipient) then
    raise exception 'You''re already friends' using errcode = '23505';
  end if;

  delete from public.friend_requests
  where sender_id = recipient and recipient_id = me;
  if found then
    insert into public.friendships (user_a, user_b)
    values (least(me, recipient), greatest(me, recipient));
    return 'friends';
  end if;

  insert into public.friend_requests (sender_id, recipient_id)
  values (me, recipient);
  return 'requested';
end;
$$;

-- The signed-in user accepts the request `sender` sent them: deletes the
-- request and creates the Friendship together.
create function public.accept_friend_request(sender uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  delete from public.friend_requests
  where sender_id = sender and recipient_id = me;
  if not found then
    raise exception 'No friend request from this user'
      using errcode = 'P0002';
  end if;

  insert into public.friendships (user_a, user_b)
  values (least(me, sender), greatest(me, sender));
end;
$$;

revoke execute on function public.are_friends(uuid, uuid) from public, anon;
grant execute on function public.are_friends(uuid, uuid) to authenticated;
revoke execute on function public.send_friend_request(uuid) from public, anon;
revoke execute on function public.accept_friend_request(uuid) from public, anon;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.accept_friend_request(uuid) to authenticated;
