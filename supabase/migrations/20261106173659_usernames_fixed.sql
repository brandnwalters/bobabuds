-- A username is chosen once, at onboarding. Afterwards users may change only
-- their display name and avatar.
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_path) on public.profiles to authenticated;
