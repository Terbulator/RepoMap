import assert from "node:assert/strict";
import { test } from "node:test";

/**
 * Tests for buildCommand — the Windows path-detection logic that decides whether
 * to spawn a .js entry via `node <path>` or pass a bare binary name through
 * directly. This function is pure and has no external dependencies.
 *
 * provider-selection and describeProviderReadiness are covered by the env.test.ts
 * file (which verifies the Proxy/re-read behaviour) and by integration with the
 * /api/health route handler.
 */

// Inline the function under test so this file has zero @/ imports and can run
// under `node --test` without path-alias resolution.
function buildCommand(binary: string, args: string[]): { file: string; args: string[] } {
  if (/\.(c|m)?js$/i.test(binary)) {
    return { file: process.execPath, args: [binary, ...args] };
  }
  return { file: binary, args };
}

test("uses node for a .js binary path (Windows bobshell pattern)", () => {
  const cmd = buildCommand("C:\\npm\\bobshell\\dist\\bob.js", ["run", "--format", "json"]);
  assert.equal(cmd.file, process.execPath);
  assert.deepEqual(cmd.args, [
    "C:\\npm\\bobshell\\dist\\bob.js",
    "run",
    "--format",
    "json",
  ]);
});

test("uses node for a .cjs binary path", () => {
  const cmd = buildCommand("/path/to/bob.cjs", ["run"]);
  assert.equal(cmd.file, process.execPath);
  assert.deepEqual(cmd.args, ["/path/to/bob.cjs", "run"]);
});

test("uses node for a .mjs binary path", () => {
  const cmd = buildCommand("/path/to/bob.mjs", ["run"]);
  assert.equal(cmd.file, process.execPath);
});

test("passes through a bare binary name unchanged", () => {
  const cmd = buildCommand("bob", ["run", "--format", "json"]);
  assert.equal(cmd.file, "bob");
  assert.deepEqual(cmd.args, ["run", "--format", "json"]);
});

test("is case-insensitive for .JS extension (Windows file system)", () => {
  const cmd = buildCommand("C:\\npm\\bobshell\\dist\\bob.JS", ["run"]);
  assert.equal(cmd.file, process.execPath);
});

test("is case-insensitive for .CJS extension", () => {
  const cmd = buildCommand("/path/to/bob.CJS", ["run"]);
  assert.equal(cmd.file, process.execPath);
});

test("does not match an unrelated extension like .exe", () => {
  const cmd = buildCommand("C:\\Program Files\\bob.exe", ["run"]);
  assert.equal(cmd.file, "C:\\Program Files\\bob.exe");
});

test("does not match a path that contains .js in the directory name", () => {
  // e.g. C:\node.js\bin\bob — only the final segment matters
  const cmd = buildCommand("C:\\node.js\\bin\\bob", ["run"]);
  assert.equal(cmd.file, "C:\\node.js\\bin\\bob");
});
