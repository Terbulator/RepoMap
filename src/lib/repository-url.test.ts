import assert from "node:assert/strict";
import { test } from "node:test";
import { parseRepositoryRef, InvalidRepositoryError } from "./repository-url.ts";

test("accepts a full GitHub URL", () => {
  assert.deepEqual(parseRepositoryRef("https://github.com/Terbulator/RepoMap"), {
    url: "https://github.com/Terbulator/RepoMap",
    slug: "Terbulator/RepoMap",
    name: "RepoMap",
  });
});

test("accepts owner/repo shorthand and trailing slashes or .git", () => {
  assert.equal(parseRepositoryRef("vercel/next.js").url, "https://github.com/vercel/next.js");
  assert.equal(
    parseRepositoryRef("https://github.com/vercel/next.js.git/").url,
    "https://github.com/vercel/next.js",
  );
});

test("rejects non-https, non-GitHub and incomplete input", () => {
  assert.throws(() => parseRepositoryRef("http://github.com/a/b"), InvalidRepositoryError);
  assert.throws(() => parseRepositoryRef("https://gitlab.com/a/b"), InvalidRepositoryError);
  assert.throws(() => parseRepositoryRef("https://github.com/owner"), InvalidRepositoryError);
  assert.throws(() => parseRepositoryRef("   "), InvalidRepositoryError);
});
