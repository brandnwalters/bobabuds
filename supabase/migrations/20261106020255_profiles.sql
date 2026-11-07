-- Profiles: one row per auth user, created when the user finishes onboarding.
-- A user has finished onboarding when they have a profile (and so a username).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Shown as typed; unique regardless of case (see profiles_username_lower_key).
  username text not null
    constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  display_name text not null
    constraint profiles_display_name_length check (
      display_name = btrim(display_name)
      and char_length(display_name) between 1 and 40
    ),
  -- Object path in the avatars storage bucket, or null for the initials fallback.
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per user who has finished onboarding. Basic fields are readable by any signed-in user.';

create unique index profiles_username_lower_key on public.profiles (lower(username));

-- Keep updated_at current on every update.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Access rules ---------------------------------------------------------------

alter table public.profiles enable row level security;

revoke all on public.profiles from anon;
revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant insert (id, username, display_name, avatar_path) on public.profiles to authenticated;
grant update (username, display_name, avatar_path) on public.profiles to authenticated;

create policy "Signed-in users can read profiles"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can create their own profile"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Onboarding: is this username free (ignoring case)? Only meaningful for
-- well-formed usernames; the caller validates the format first.
create function public.username_available(candidate text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles p where lower(p.username) = lower(candidate)
  );
$$;

revoke execute on function public.username_available(text) from public, anon;
grant execute on function public.username_available(text) to authenticated;
