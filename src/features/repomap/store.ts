import { repoMapSchema } from "./schema.ts";
import type { RepoMap } from "./schema.ts";

/**
 * The handoff between the two halves of the product.
 *
 * A successful Onboarding Map run is the only source of repository truth
 * ScopeShield is allowed to use, so it is stored once here and read by both
 * sides. Reading re-validates against `repoMapSchema`: localStorage is
 * user-writable and survives deploys, so a stale or hand-edited value is
 * discarded rather than trusted.
 */
export const REPOMAP_STORAGE_KEY = "repomap";

/** True in the browser, false while server-rendering. */
function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/**
 * Same-tab subscribers.
 *
 * A native `storage` event only fires in *other* documents, so a tab that
 * writes the map is never told about its own write. Without this set, a
 * `useSyncExternalStore` subscriber in the writing tab (ScopeShield, mounted
 * alongside Onboarding Map) keeps rendering the previous repository until
 * something else re-reads the snapshot.
 */
const sameTabListeners = new Set<() => void>();

function notifyRepoMapStoreChanged(): void {
  // Copied first: a listener may unsubscribe while being notified.
  for (const listener of [...sameTabListeners]) {
    listener();
  }
}

export function saveRepoMap(repoMap: RepoMap): void {
  if (!canUseLocalStorage()) return;

  let written: string | null = null;
  try {
    window.localStorage.setItem(REPOMAP_STORAGE_KEY, JSON.stringify(repoMap));
    written = window.localStorage.getItem(REPOMAP_STORAGE_KEY);
  } catch {
    // A full or blocked storage must not break the analysis that just succeeded.
    return;
  }

  // Announce the write only once it is known to be readable and valid. A failed
  // or corrupt write is not a successful save and must not be announced as one.
  if (parseStoredRepoMap(written) === null) return;

  notifyRepoMapStoreChanged();
}

export function readStoredRepoMap(): RepoMap | null {
  if (!canUseLocalStorage()) return null;

  return parseStoredRepoMap(window.localStorage.getItem(REPOMAP_STORAGE_KEY));
}

/** The validating read, separated out so it is testable without a browser. */
export function parseStoredRepoMap(raw: string | null): RepoMap | null {
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = repoMapSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

let cachedRaw: string | null = null;
let cachedMap: RepoMap | null = null;

/**
 * A snapshot for `useSyncExternalStore`. The same stored string has to keep
 * returning the same object, or React re-renders forever.
 */
export function getStoredRepoMapSnapshot(): RepoMap | null {
  if (!canUseLocalStorage()) return null;

  const raw = window.localStorage.getItem(REPOMAP_STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedMap = parseStoredRepoMap(raw);
  }

  return cachedMap;
}

/**
 * The server snapshot for `useSyncExternalStore`.
 *
 * This MUST NOT read localStorage. React calls the server snapshot both while
 * rendering on the server and for the first client render during hydration, so
 * whatever it returns has to be identical on both sides. Returning null says
 * "no repository yet" on the server, which is true — the browser's localStorage
 * is not visible there. After hydration React switches to
 * `getStoredRepoMapSnapshot`, so the real map appears as soon as it is mounted.
 *
 * Passing the localStorage reader here instead is what produces a hydration
 * mismatch: the server renders the "no repository analysed yet" state while the
 * client hydrates with the stored map already present.
 */
export function getServerRepoMapSnapshot(): RepoMap | null {
  return null;
}

/**
 * Re-reads when this tab saves a new map, and when another tab replaces the
 * stored one. Unsubscribing removes both registrations.
 */
export function subscribeToStoredRepoMap(onStoreChange: () => void): () => void {
  if (!canUseLocalStorage()) return () => {};

  sameTabListeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    sameTabListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}
