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
// env.ts uses a Proxy that calls readEnv() on every property access, so we
// can test it via the exported `env` object without re-importing the module.
async function getEnv() {
  // Dynamic import with cache-busting timestamp so each test gets a fresh module.
  const mod = await import(`./env.ts?t=${Date.now()}`) as typeof import("./env.ts");
  return mod.env;
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

test("BOB_MAX_TURNS defaults to 8", async () => {
  const env = await getEnv();
  assert.equal(env.BOB_MAX_TURNS, 8);
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
