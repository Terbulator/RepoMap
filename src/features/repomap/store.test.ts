import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import {
  REPOMAP_STORAGE_KEY,
  getServerRepoMapSnapshot,
  getStoredRepoMapSnapshot,
  parseStoredRepoMap,
  saveRepoMap,
  subscribeToStoredRepoMap,
} from "./store.ts";
import { toRepoMap } from "./normalize.ts";
import type { Provenance, RepoMap, RepositoryRef } from "./schema.ts";

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

/** The second repository, used to prove one mounted subscriber sees a swap. */
const repositoryB: RepositoryRef = {
  url: "https://github.com/acme/bravo",
  slug: "acme/bravo",
  name: "bravo",
};
const repoMapB = toRepoMap(mockAnalysis, { repository: repositoryB, provenance });

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

/**
 * A writable stand-in for the browser, so a save is actually readable back and
 * a `storage` event can be raised the way another tab raises it.
 */
function createFakeBrowser(initial?: string) {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(REPOMAP_STORAGE_KEY, initial);
  const storageListeners = new Set<() => void>();

  return {
    localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
    },
    addEventListener: (type: string, listener: () => void) => {
      if (type === "storage") storageListeners.add(listener);
    },
    removeEventListener: (type: string, listener: () => void) => {
      if (type === "storage") storageListeners.delete(listener);
    },
    /** What the browser does when a *different* tab writes the key. */
    emitStorageEvent: (key: string) => {
      if (key !== REPOMAP_STORAGE_KEY) return;
      for (const listener of [...storageListeners]) listener();
    },
    listenerCount: () => storageListeners.size,
  };
}

function withFakeBrowser<T>(browser: ReturnType<typeof createFakeBrowser>, run: () => T): T {
  const previous = (globalThis as { window?: unknown }).window;
  (globalThis as { window?: unknown }).window = browser;

  try {
    return run();
  } finally {
    if (previous === undefined) delete (globalThis as { window?: unknown }).window;
    else (globalThis as { window?: unknown }).window = previous;
  }
}

test("saveRepoMap writes the map to localStorage", () => {
  const browser = createFakeBrowser();

  withFakeBrowser(browser, () => {
    saveRepoMap(storedRepoMap);
  });

  assert.equal(browser.localStorage.getItem(REPOMAP_STORAGE_KEY), JSON.stringify(storedRepoMap));
});

test("saveRepoMap notifies same-tab subscribers", () => {
  withFakeBrowser(createFakeBrowser(), () => {
    let notifications = 0;
    const unsubscribe = subscribeToStoredRepoMap(() => {
      notifications += 1;
    });

    saveRepoMap(storedRepoMap);
    assert.equal(notifications, 1);

    // A second save notifies again, so the count tracks writes rather than
    // firing once per subscription.
    saveRepoMap(repoMapB);
    assert.equal(notifications, 2);

    unsubscribe();
  });
});

test("a subscriber sees repository B after a save, with no refresh and no re-subscribe", () => {
  withFakeBrowser(createFakeBrowser(), () => {
    // Repository A is analysed and saved.
    saveRepoMap(storedRepoMap);
    assert.equal(getStoredRepoMapSnapshot()?.repository.slug, repository.slug);

    // ScopeShield mounts: one subscription, and it reads the snapshot to
    // render. This is the whole of what useSyncExternalStore does.
    let notifications = 0;
    const unsubscribe = subscribeToStoredRepoMap(() => {
      notifications += 1;
    });
    assert.equal(getStoredRepoMapSnapshot()?.repository.slug, repository.slug);

    // The user returns to Onboarding Map and analyses repository B. The write
    // raises no native storage event here, so the store has to announce it.
    saveRepoMap(repoMapB);

    assert.equal(notifications, 1);
    assert.equal(getStoredRepoMapSnapshot()?.repository.slug, repositoryB.slug);

    unsubscribe();
  });
});

test("unsubscribing stops the notifications and leaves nothing behind", () => {
  withFakeBrowser(createFakeBrowser(), () => {
    let notifications = 0;
    const unsubscribe = subscribeToStoredRepoMap(() => {
      notifications += 1;
    });
    unsubscribe();

    saveRepoMap(storedRepoMap);
    saveRepoMap(repoMapB);

    assert.equal(notifications, 0);
  });
});

test("a write that is not a valid RepoMap is not announced as a successful save", () => {
  const browser = createFakeBrowser();

  withFakeBrowser(browser, () => {
    let notifications = 0;
    const unsubscribe = subscribeToStoredRepoMap(() => {
      notifications += 1;
    });

    saveRepoMap({ not: "a repo map" } as unknown as RepoMap);
    assert.equal(notifications, 0);
    assert.equal(getStoredRepoMapSnapshot(), null);

    // The store is still usable afterwards.
    saveRepoMap(storedRepoMap);
    assert.equal(notifications, 1);
    assert.equal(getStoredRepoMapSnapshot()?.repository.slug, repository.slug);

    unsubscribe();
  });
});

test("a storage event from another tab still notifies subscribers", () => {
  const browser = createFakeBrowser();

  withFakeBrowser(browser, () => {
    let notifications = 0;
    const unsubscribe = subscribeToStoredRepoMap(() => {
      notifications += 1;
    });

    // Another tab's write: this tab never calls saveRepoMap, so only the
    // native event can report it.
    browser.localStorage.setItem(REPOMAP_STORAGE_KEY, JSON.stringify(repoMapB));
    browser.emitStorageEvent(REPOMAP_STORAGE_KEY);

    assert.equal(notifications, 1);
    assert.equal(getStoredRepoMapSnapshot()?.repository.slug, repositoryB.slug);

    unsubscribe();
  });
});

test("both the same-tab and the cross-tab listener are removed on unsubscribe", () => {
  const browser = createFakeBrowser();

  withFakeBrowser(browser, () => {
    const unsubscribe = subscribeToStoredRepoMap(() => {});
    assert.equal(browser.listenerCount(), 1);

    unsubscribe();
    assert.equal(browser.listenerCount(), 0);
  });
});

test("the server snapshot stays null after this tab saves, so hydration is unaffected", () => {
  withFakeBrowser(createFakeBrowser(), () => {
    saveRepoMap(storedRepoMap);

    // The notification only ever runs from an explicit save, never during a
    // render, so the server snapshot remains the hydration invariant it is.
    assert.equal(getServerRepoMapSnapshot(), null);
  });
});
