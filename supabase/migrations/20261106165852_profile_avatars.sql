-- One optional avatar per profile, kept in a private Storage bucket.
--
-- Objects live at `<user id>/<file>` in the `avatars` bucket. The owner can
-- upload, replace and delete objects in their own folder; any signed-in user
-- can read them (avatars show next to names everywhere, like the basic
-- profile fields). The app shows them through short-lived signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2 * 1024 * 1024, array['image/jpeg', 'image/webp']);

create policy "Avatars: owners upload into their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and public.storage_object_owner(name) = (select auth.uid())
  );

create policy "Avatars: owners replace their own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and public.storage_object_owner(name) = (select auth.uid())
  )
  with check (
    bucket_id = 'avatars'
    and public.storage_object_owner(name) = (select auth.uid())
  );

create policy "Avatars: owners delete their own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and public.storage_object_owner(name) = (select auth.uid())
  );

create policy "Avatars: readable by any signed-in user"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars');

-- The profile's avatar: a path in the avatars bucket, inside the user's folder.
alter table public.profiles
  add constraint profiles_avatar_in_own_folder
    check (avatar_path is null or avatar_path like id::text || '/_%');
