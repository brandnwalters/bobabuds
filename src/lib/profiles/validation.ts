/**
 * Profile field rules. These mirror the check constraints on public.profiles,
 * which remain the real boundary; this gives friendly messages first.
 */
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const DISPLAY_NAME_MAX = 40;

/** The characters a username may use (a regex character class body). */
const USERNAME_CHARS = "A-Za-z0-9_";

/** A whole, well-formed username. */
export const USERNAME = new RegExp(
  `^[${USERNAME_CHARS}]{${USERNAME_MIN},${USERNAME_MAX}}$`,
);

/** The start of a username (for prefix search): 1 to USERNAME_MAX characters. */
export const USERNAME_PREFIX = new RegExp(`^[${USERNAME_CHARS}]{1,${USERNAME_MAX}}$`);

/** A message explaining why `username` isn't allowed, or null if it is. */
export function usernameProblem(username: string): string | null {
  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    return `Usernames are ${USERNAME_MIN} to ${USERNAME_MAX} characters.`;
  }
  if (!USERNAME.test(username)) {
    return "Use only letters, numbers and underscores.";
  }
  return null;
}

/** A message explaining why `displayName` isn't allowed, or null if it is. */
export function displayNameProblem(displayName: string): string | null {
  if (displayName.length === 0) return "Enter a display name.";
  if (displayName.length > DISPLAY_NAME_MAX) {
    return `Display names are at most ${DISPLAY_NAME_MAX} characters.`;
  }
  return null;
}
