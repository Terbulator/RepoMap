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

export function saveRepoMap(repoMap: RepoMap): void {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(REPOMAP_STORAGE_KEY, JSON.stringify(repoMap));
  } catch {
    // A full or blocked storage must not break the analysis that just succeeded.
  }
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

/** Re-reads when another tab replaces the stored map. */
export function subscribeToStoredRepoMap(onStoreChange: () => void): () => void {
  if (!canUseLocalStorage()) return () => {};

  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}
