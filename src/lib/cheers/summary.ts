/**
 * The Cheers on a Log, as read alongside the Log: embed `CHEERS_EMBED` in a
 * `logs` select and map the rows with `toCheers`. Row-level security already
 * limits the rows to Logs the viewer can see.
 *
 * No server-only imports: Feed cards render in the browser too.
 */

export type Cheerer = {
  id: string;
  username: string;
  displayName: string;
};

export type CheersSummary = {
  count: number;
  /** Whether the signed-in viewer has cheered this Log. */
  viewerCheered: boolean;
  /** Who cheered, oldest Cheers first. */
  cheerers: Cheerer[];
};

/** Add to a `logs` select (after a comma) to fetch its Cheers. */
export const CHEERS_EMBED =
  "cheers(created_at, user:profiles!cheers_user_id_fkey(id, username, display_name))";

export type CheersRow = {
  created_at: string;
  user: { id: string; username: string; display_name: string };
};

export function toCheers(
  rows: CheersRow[],
  viewerId: string | null,
): CheersSummary {
  const cheerers = [...rows]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((row) => ({
      id: row.user.id,
      username: row.user.username,
      displayName: row.user.display_name,
    }));
  return {
    count: cheerers.length,
    viewerCheered: cheerers.some((cheerer) => cheerer.id === viewerId),
    cheerers,
  };
}

/** "No Cheers yet" / "1 Cheers" / "3 Cheers". */
export function cheersCountLabel(count: number) {
  return count === 0 ? "No Cheers yet" : `${count} Cheers`;
}
