import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  REPOMAP_STORAGE_KEY,
  getServerRepoMapSnapshot,
  getStoredRepoMapSnapshot,
  parseStoredRepoMap,
} from "./store.ts";
import { toRepoMap } from "./normalize.ts";
import type { Provenance, RepositoryRef } from "./schema.ts";

/** Loaded from disk so the test runs under plain Node, like the app fixture. */
const mockAnalysis = JSON.parse(
  readFileSync(path.join(process.cwd(), "src/data/mock-analysis.json"), "utf8"),
);

const repository: RepositoryRef = {
  url: "https://github.com/acme/demo",
  slug: "acme/demo",
  name: "demo",
};

const provenance: Provenance = {
  provider: "bob-2.0",
  bobTaskId: "task_123",
  generatedAt: "2026-09-25T00:00:00.000Z",
  durationMs: 5000,
  notice: null,
};

/**
 * What actually lands in localStorage: the normalised RepoMap, not the raw
 * provider analysis. The store re-validates on read, so the un-normalised
 * fixture would (correctly) be rejected.
 */
const storedRepoMap = toRepoMap(mockAnalysis, { repository, provenance });
const storedJson = JSON.stringify(storedRepoMap);

/** The minimal browser surface the store touches. */
function withStubbedLocalStorage(stored: string | null, run: () => void) {
  const previous = (globalThis as { window?: unknown }).window;

  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (key: string) => (key === REPOMAP_STORAGE_KEY ? stored : null),
      setItem: () => {},
    },
  };

  try {
    run();
  } finally {
    if (previous === undefined) delete (globalThis as { window?: unknown }).window;
    else (globalThis as { window?: unknown }).window = previous;
  }
}

test("the server snapshot is null with no browser at all", () => {
  assert.equal(getServerRepoMapSnapshot(), null);
});

test("the server snapshot stays null even when a repository is stored", () => {
  // This is the hydration invariant: React calls the server snapshot for the
  // first client render too, so it must never see the browser's localStorage.
  // If it did, the client would hydrate with a repository the server never had.
  withStubbedLocalStorage(storedJson, () => {
    assert.equal(getServerRepoMapSnapshot(), null);
  });
});

test("the browser snapshot does read the stored repository", () => {
  withStubbedLocalStorage(storedJson, () => {
    const stored = getStoredRepoMapSnapshot();

    assert.notEqual(stored, null);
    assert.equal(stored?.repository.slug, repository.slug);
  });
});

test("a stored value that no longer matches the schema is discarded", () => {
  assert.equal(parseStoredRepoMap('{"not":"a repo map"}'), null);
  assert.equal(parseStoredRepoMap(null), null);
});
