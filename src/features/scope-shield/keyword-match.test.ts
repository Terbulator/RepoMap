import assert from "node:assert/strict";
import { test } from "node:test";
import { findSignal, matchesAny } from "./keyword-match.ts";

test("matches a word that starts with the keyword", () => {
  assert.equal(findSignal(["auth"], "add authentication to the project"), "auth");
  assert.equal(findSignal(["payment"], "add payments"), "payment");
});

test("does not match a keyword hiding inside a longer word", () => {
  assert.equal(findSignal(["ai"], "send an email reminder"), "");
  assert.equal(findSignal(["sync"], "async processing"), "");
  assert.equal(findSignal(["form"], "new platform screen"), "");
  assert.equal(findSignal(["file"], "user profile page"), "");
  assert.equal(findSignal(["env"], "calendar event feed"), "");
  assert.equal(findSignal(["api"], "rapid response"), "");
  assert.equal(findSignal(["table"], "a comfortable layout"), "");
  assert.equal(findSignal(["store"], "restore a backup"), "");
});

test("prefix collisions are avoided in the keyword lists, not the matcher", () => {
  // "important" really does start with "import", so the matcher is right to
  // match it. That is why no rule uses a bare "import" keyword.
  assert.equal(findSignal(["import"], "this is important"), "import");
  assert.equal(findSignal(["data import"], "this is important"), "");
  assert.equal(findSignal(["ai model"], "book a flight"), "");
});

test("multi-word keywords still match literally", () => {
  assert.equal(findSignal(["third party", "api key"], "rotate the api key"), "api key");
});

test("hyphens and underscores read as spaces in multi-word keywords", () => {
  assert.equal(findSignal(["sign in"], "add sign-in and sign-up"), "sign in");
  assert.equal(findSignal(["api key"], "rotate the api_key"), "api key");
  assert.equal(findSignal(["third party"], "a third-party vendor"), "third party");
});

test("returns the first keyword that matches", () => {
  assert.equal(
    findSignal(["payment", "pay"], "add payments with stripe"),
    "payment",
  );
});

test("matchesAny is the boolean form of findSignal", () => {
  assert.equal(matchesAny(["role"], "create user roles"), true);
  assert.equal(matchesAny(["refund"], "add authentication"), false);
});
