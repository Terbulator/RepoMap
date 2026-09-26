/**
 * Keyword matching shared by the mock detectors.
 *
 * Plain `includes` is wrong for short keywords: "ai" matches "email" and
 * "available", "sync" matches "async", "form" matches "platform", "file"
 * matches "profile", "env" matches "event", "table" matches "comfortable".
 * Those false hits put the wrong technologies and the wrong hidden-scope items
 * in front of the user.
 *
 * The rule here is word-prefix matching: a keyword matches when a whole word
 * starts with it. That keeps the useful stems ("auth" -> "authentication",
 * "pay" -> "payments") and drops the accidental substrings. Multi-word keywords
 * ("third party", "api key") are rare and distinctive enough to match literally.
 */

const NON_WORD = /[^a-z0-9+#.]+/g;

/** Hyphens and underscores read as spaces, so "sign-in" matches "sign in". */
const HYPHEN = /[-_]+/g;

function words(text: string): string[] {
  return text.toLowerCase().split(NON_WORD).filter(Boolean);
}

/**
 * Returns the first keyword that matches the text, or "" when none do.
 * Callers use it both as a boolean and to show the user what was matched.
 */
export function findSignal(keywords: string[], text: string): string {
  const lower = text.toLowerCase();
  const spaced = lower.replace(HYPHEN, " ");
  const parts = words(lower);

  for (const keyword of keywords) {
    if (keyword.includes(" ")) {
      if (spaced.includes(keyword)) return keyword;
      continue;
    }
    for (const part of parts) {
      if (part.startsWith(keyword)) {
        return keyword;
      }
    }
  }

  return "";
}

/** True when at least one keyword matches the text. */
export function matchesAny(keywords: string[], text: string): boolean {
  return findSignal(keywords, text) !== "";
}
