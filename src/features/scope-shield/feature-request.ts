/**
 * Stage 1 of ScopeShield (PRD 5.2): the free-text feature request itself.
 *
 * No React and no AI calls live here on purpose. Later stages read the stored
 * request through these helpers, so the key and the text rules are declared in
 * exactly one place.
 */

export const FEATURE_REQUEST_STORAGE_KEY = "featureRequest";

export const EMPTY_REQUEST_MESSAGE =
  "Please describe the feature you want to build.";

export const STORED_REQUEST_MESSAGE = "Feature request stored successfully!";

/** Trims the input and squeezes every run of whitespace into a single space. */
export function normalizeFeatureRequest(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function isEmptyFeatureRequest(input: string): boolean {
  return normalizeFeatureRequest(input).length === 0;
}

/** True in the browser, false while server-rendering. */
function canUseLocalStorage(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

/** Normalises and stores the request. Returns what was stored. */
export function saveFeatureRequest(input: string): string {
  const request = normalizeFeatureRequest(input);

  if (canUseLocalStorage()) {
    window.localStorage.setItem(FEATURE_REQUEST_STORAGE_KEY, request);
  }

  return request;
}

/** The stored request, or null when nothing has been stored yet. */
export function readFeatureRequest(): string | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  return window.localStorage.getItem(FEATURE_REQUEST_STORAGE_KEY);
}
