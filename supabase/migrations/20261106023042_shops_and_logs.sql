-- Shops and Logs.
--
-- A Shop is a boba shop identified by its Google place ID. It is added the
-- first time anyone logs at it (from Places autocomplete + place details) and
-- is never changed by users afterwards. Shop data is not private.
--
-- A Log is one drink entry by one user. For now only the author can read a
-- Log; friend visibility arrives with friendships (replace the select policy
-- with the shared "can view" helper then).

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  place_id text not null unique
    constraint shops_place_id_present check (char_length(btrim(place_id)) between 1 and 300),
  name text not null
    constraint shops_name_present check (char_length(btrim(name)) between 1 and 200),
  formatted_address text not null
    constraint shops_address_length check (char_length(formatted_address) <= 500),
  latitude double precision not null
    constraint shops_latitude_range check (latitude between -90 and 90),
  longitude double precision not null
    constraint shops_longitude_range check (longitude between -180 and 180),
  google_maps_url text not null
    constraint shops_google_maps_url_https check (
      google_maps_url ~ '^https://' and char_length(google_maps_url) <= 1000
    ),
  created_at timestamptz not null default now()
);

comment on table public.shops is
  'Boba shops, keyed by Google place ID. Readable by any signed-in user; added on first Log, never edited by users.';

-- Toppings mix preset values and custom text: each one non-blank, trimmed and short.
create function public.toppings_valid(toppings text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(toppings) <= 12
    and not exists (
      select 1 from unnest(toppings) as t(value)
      where value is null
        or value <> btrim(value)
        or char_length(value) not between 1 and 30
    );
$$;

create table public.logs (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  shop_id uuid not null references public.shops (id),
  drink_name text not null
    constraint logs_drink_name_length check (
      drink_name = btrim(drink_name) and char_length(drink_name) between 1 and 80
    ),
  rating numeric(2, 1) not null
    constraint logs_rating_half_steps check (
      rating between 0.5 and 5.0 and rating * 2 = trunc(rating * 2)
    ),
  -- The day the drink was had (defaults to today in the app's form).
  drank_on date not null default current_date,
  sweetness smallint
    constraint logs_sweetness_options check (sweetness in (0, 25, 50, 75, 100)),
  ice text
    constraint logs_ice_options check (ice in ('none', 'less', 'regular', 'extra')),
  toppings text[] not null default '{}'
    constraint logs_toppings_valid check (public.toppings_valid(toppings)),
  note text
    constraint logs_note_length check (char_length(note) between 1 and 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.logs is
  'One drink entry by one user. Only the author can create; reads are limited to the author (friends later).';

create index logs_author_newest on public.logs (author_id, drank_on desc, created_at desc);
create index logs_shop on public.logs (shop_id);

create trigger logs_set_updated_at
  before update on public.logs
  for each row execute function public.set_updated_at();

-- Access rules ---------------------------------------------------------------

alter table public.shops enable row level security;
alter table public.logs enable row level security;

revoke all on public.shops from anon;
revoke all on public.shops from authenticated;
grant select on public.shops to authenticated;
grant insert (place_id, name, formatted_address, latitude, longitude, google_maps_url)
  on public.shops to authenticated;

create policy "Signed-in users can read shops"
  on public.shops for select
  to authenticated
  using (true);

-- No update or delete policy: the first details stored for a place ID stay.
create policy "Signed-in users can add shops"
  on public.shops for insert
  to authenticated
  with check (true);

revoke all on public.logs from anon;
revoke all on public.logs from authenticated;
grant select on public.logs to authenticated;
grant insert (author_id, shop_id, drink_name, rating, drank_on, sweetness, ice, toppings, note)
  on public.logs to authenticated;

create policy "Authors can read their own logs"
  on public.logs for select
  to authenticated
  using (author_id = (select auth.uid()));

create policy "Users can create their own logs"
  on public.logs for insert
  to authenticated
  with check (author_id = (select auth.uid()));
