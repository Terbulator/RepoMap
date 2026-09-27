import assert from "node:assert/strict";
import { test, beforeEach, afterEach } from "node:test";

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Save and restore the env vars touched by these tests so sibling test files
 * are not affected. node:test runs each file in its own worker, so this is
 * belt-and-suspenders safety.
 */
const KEYS = [
  "REPOMAP_PROVIDER",
  "BOB_CLI_PATH",
  "BOB_MAX_TURNS",
  "BOB_TIMEOUT_MS",
  "REPOMAP_WORKSPACE_DIR",
  "REPOMAP_CLONE_TIMEOUT_MS",
  "BOB_API_KEY",
  "BOB_ENDPOINT",
  "BOB_SCOPE_TIMEOUT_MS",
] as const;

type SavedEnv = Partial<Record<(typeof KEYS)[number], string>>;

let saved: SavedEnv = {};

beforeEach(() => {
  saved = {};
  for (const key of KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = saved[key];
    }
  }
});

// ─── helpers to re-import env fresh ──────────────────────────────────────────
// env.ts exposes a lazy Proxy that calls readEnv() on every property access, so
// we can test it via the exported `env` object without re-importing the module.
async function getEnv() {
  // Dynamic import with cache-busting timestamp so each test gets a fresh module.
  const mod = await import(`./env.ts?t=${Date.now()}`) as typeof import("./env.ts");
  return mod.env;
}

async function getEnvModule() {
  return (await import(`./env.ts?t=${Date.now()}`)) as typeof import("./env.ts");
}

// ─── tests ───────────────────────────────────────────────────────────────────

test("REPOMAP_PROVIDER defaults to mock when not set", async () => {
  const env = await getEnv();
  assert.equal(env.REPOMAP_PROVIDER, "mock");
});

test("REPOMAP_PROVIDER=bob-2.0 is accepted", async () => {
  process.env.REPOMAP_PROVIDER = "bob-2.0";
  const env = await getEnv();
  assert.equal(env.REPOMAP_PROVIDER, "bob-2.0");
});

test("BOB_TIMEOUT_MS defaults to 900000 (15 minutes)", async () => {
  const env = await getEnv();
  assert.equal(env.BOB_TIMEOUT_MS, 900_000);
});

test("BOB_TIMEOUT_MS is overridable via environment variable", async () => {
  process.env.BOB_TIMEOUT_MS = "600000";
  const env = await getEnv();
  assert.equal(env.BOB_TIMEOUT_MS, 600_000);
});

test("BOB_CLI_PATH defaults to 'bob'", async () => {
  const env = await getEnv();
  assert.equal(env.BOB_CLI_PATH, "bob");
});

test("BOB_CLI_PATH is overridable", async () => {
  process.env.BOB_CLI_PATH = "/usr/local/bin/bob.js";
  const env = await getEnv();
  assert.equal(env.BOB_CLI_PATH, "/usr/local/bin/bob.js");
});

test("BOB_MAX_TURNS defaults to 32", async () => {
  const env = await getEnv();
  assert.equal(env.BOB_MAX_TURNS, 32);
});

test("REPOMAP_CLONE_TIMEOUT_MS defaults to 120000", async () => {
  const env = await getEnv();
  assert.equal(env.REPOMAP_CLONE_TIMEOUT_MS, 120_000);
});

test("REPOMAP_WORKSPACE_DIR is undefined when not set", async () => {
  const env = await getEnv();
  assert.equal(env.REPOMAP_WORKSPACE_DIR, undefined);
});

test("env proxy re-reads process.env on each access", async () => {
  // Set mock first, import, then change to bob-2.0 and verify the proxy picks it up.
  process.env.REPOMAP_PROVIDER = "mock";
  const env = await getEnv();
  assert.equal(env.REPOMAP_PROVIDER, "mock");

  // Now change the env var in the same process — Proxy must reflect the new value.
  process.env.REPOMAP_PROVIDER = "bob-2.0";
  assert.equal(env.REPOMAP_PROVIDER, "bob-2.0");
});

// Regression: an invalid .env.local value used to throw while env.ts was being
// imported, so the route handler never ran and the client received an empty
// non-JSON body instead of the JSON error envelope. Validation must now be
// deferred to property access so callers can catch it.
test("invalid config throws EnvConfigError on access, not on import", async () => {
  process.env.REPOMAP_PROVIDER = "bob-2.0bob_prod_secret";
  const { env: lazyEnv, EnvConfigError } = await getEnvModule();

  assert.throws(
    () => lazyEnv.REPOMAP_PROVIDER,
    (error: unknown) => error instanceof EnvConfigError && error.keys.includes("REPOMAP_PROVIDER"),
  );
});

test("EnvConfigError names the variable but never its value", async () => {
  process.env.BOB_API_KEY = "not-a-real-key-abcdef";
  process.env.BOB_ENDPOINT = "not a url";
  const { env: lazyEnv, EnvConfigError } = await getEnvModule();

  assert.throws(
    () => lazyEnv.BOB_ENDPOINT,
    (error: unknown) => {
      assert.ok(error instanceof EnvConfigError);
      assert.match(error.message, /BOB_ENDPOINT/);
      assert.doesNotMatch(error.message, /not a url/);
      assert.doesNotMatch(error.message, /not-a-real-key-abcdef/);
      return true;
    },
  );
});
