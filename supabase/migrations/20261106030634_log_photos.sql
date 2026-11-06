-- One optional photo per Log, kept in a private Storage bucket.
--
-- Objects live at `<author id>/<file>` in the `log-photos` bucket. The author
-- can upload, replace and delete objects in their own folder; anyone who can
-- view the author's Logs (public.can_view_logs_of) can read them. The app
-- shows them through short-lived signed URLs.

-- The user id a Storage object belongs to: the first folder of its name, or
-- null when that isn't a uuid (so a stray name never errors in a policy).
-- Reuse it for other per-user buckets (e.g. avatars).
create function public.storage_object_owner(name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(name, '/', 1)::uuid
  end;
$$;

grant execute on function public.storage_object_owner(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('log-photos', 'log-photos', false, 2 * 1024 * 1024, array['image/jpeg', 'image/webp']);

create policy "Log photos: authors upload into their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'log-photos'
    and public.storage_object_owner(name) = (select auth.uid())
  );

create policy "Log photos: authors replace their own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'log-photos'
    and public.storage_object_owner(name) = (select auth.uid())
  )
  with check (
    bucket_id = 'log-photos'
    and public.storage_object_owner(name) = (select auth.uid())
  );

create policy "Log photos: authors delete their own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'log-photos'
    and public.storage_object_owner(name) = (select auth.uid())
  );

create policy "Log photos: readable by whoever can view the author's Logs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'log-photos'
    and public.can_view_logs_of(public.storage_object_owner(name))
  );

-- The Log's photo: a path in the log-photos bucket, inside the author's folder.
alter table public.logs
  add column photo_path text
    constraint logs_photo_in_author_folder
    check (photo_path is null or photo_path like author_id::text || '/_%');

grant insert (photo_path), update (photo_path) on public.logs to authenticated;
