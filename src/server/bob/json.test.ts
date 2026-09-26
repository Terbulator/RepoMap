import assert from "node:assert/strict";
import { test } from "node:test";
import { extractJsonPayload, readString } from "./json.ts";

test("parses a plain JSON object", () => {
  assert.deepEqual(extractJsonPayload({ summary: "hello" }), { summary: "hello" });
});

test("parses a JSON string body", () => {
  assert.deepEqual(extractJsonPayload('{"summary":"hello"}'), { summary: "hello" });
});

test("parses JSON wrapped in a markdown fence", () => {
  const fenced = '```json\n{"summary":"hello"}\n```';
  assert.deepEqual(extractJsonPayload(fenced), { summary: "hello" });
});

test("parses JSON embedded in prose", () => {
  const prose = 'Here is the analysis:\n{"summary":"hello"}\nHope that helps.';
  assert.deepEqual(extractJsonPayload(prose), { summary: "hello" });
});

test("unwraps common envelope keys", () => {
  assert.deepEqual(extractJsonPayload({ data: { summary: "hello" } }), { summary: "hello" });
  assert.deepEqual(extractJsonPayload({ result: '{"summary":"hello"}' }), { summary: "hello" });
});

test("returns null when there is nothing to parse", () => {
  assert.equal(extractJsonPayload(null), null);
  assert.equal(extractJsonPayload("   "), null);
  assert.equal(extractJsonPayload("no json here"), null);
});

test("readString ignores blank values", () => {
  assert.equal(readString("  task_1 "), "task_1");
  assert.equal(readString("  "), null);
  assert.equal(readString(7), null);
});
