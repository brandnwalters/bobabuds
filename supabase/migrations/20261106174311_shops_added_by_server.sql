-- Shops are added only by the server (secret key), from details it looks up
-- itself by place ID, so a user can't plant a made-up name or address for a
-- place ID that then sticks for everyone. Signed-in users keep read access.
drop policy "Signed-in users can add shops" on public.shops;
revoke insert on public.shops from authenticated;

comment on table public.shops is
  'Boba shops, keyed by Google place ID. Readable by any signed-in user; added by the server on first Log, never edited by users.';
