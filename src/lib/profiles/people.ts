/** The basic, public profile fields shown wherever a person is listed. */
export type Bud = {
  id: string;
  username: string;
  displayName: string;
  avatarPath: string | null;
  /** Short-lived signed URL of the avatar (null without one). */
  avatarUrl: string | null;
};

/** The profiles columns behind a `Bud` (select them, or embed them). */
export const BUD_COLUMNS = "id, username, display_name, avatar_path";

export type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_path: string | null;
};

/** A Bud without its signed avatar URL yet (see `withAvatarUrls`). */
export function toBud(row: ProfileRow): Omit<Bud, "avatarUrl"> {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarPath: row.avatar_path,
  };
}
