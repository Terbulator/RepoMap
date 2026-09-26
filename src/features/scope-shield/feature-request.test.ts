import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FEATURE_REQUEST_STORAGE_KEY,
  isEmptyFeatureRequest,
  normalizeFeatureRequest,
} from "./feature-request.ts";

test("stores under the featureRequest key", () => {
  assert.equal(FEATURE_REQUEST_STORAGE_KEY, "featureRequest");
});

test("trims and squeezes unnecessary whitespace", () => {
  assert.equal(
    normalizeFeatureRequest("  Add   authentication\n\nto the project  "),
    "Add authentication to the project",
  );
});

test("treats blank and whitespace-only input as empty", () => {
  assert.equal(isEmptyFeatureRequest(""), true);
  assert.equal(isEmptyFeatureRequest("   \n\t  "), true);
});

test("treats real text as non-empty", () => {
  assert.equal(isEmptyFeatureRequest("  Add authentication "), false);
});
