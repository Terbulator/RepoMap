import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ANALYSIS_ERROR_MESSAGE,
  DEFAULT_BOB_TIMEOUT_MS,
  INVALID_REQUEST_MESSAGE,
  runScopeAnalysis,
  shouldMockProviderFail,
  validateFeatureRequest,
} from "./analysis-runner.ts";
import { EMPTY_REQUEST_MESSAGE } from "./feature-request.ts";

const run = (request: string) => runScopeAnalysis(request, 0);

test("empty input keeps the Stage 1 message", () => {
  assert.deepEqual(validateFeatureRequest("   \n\t "), {
    ok: false,
    message: EMPTY_REQUEST_MESSAGE,
  });
});

test("a too-short request is rejected as invalid", () => {
  const outcome = validateFeatureRequest("auth");
  assert.equal(outcome.ok, false);
  assert.equal(outcome.ok === false && outcome.message, INVALID_REQUEST_MESSAGE);
});

test("a real request passes validation trimmed", () => {
  assert.deepEqual(validateFeatureRequest("  Add authentication  "), {
    ok: true,
    request: "Add authentication",
  });
});

test("a successful run returns every stage output", async () => {
  const outcome = await run("Add authentication to the project");
  assert.equal(outcome.status, "success");
  if (outcome.status !== "success") return;

  const { result } = outcome;
  assert.equal(result.request, "Add authentication to the project");
  assert.ok(result.analysis.domains.length === 5);
  assert.ok(result.questions.length >= 3);
  assert.match(result.grounding, /^Grounded in Repo Analysis/);
  assert.ok(result.draft.includes(result.request));
});

test("a successful run marks the result source as mock when Bob is unavailable", async () => {
  const outcome = await run("Add authentication to the project");
  assert.equal(outcome.status, "success");
  if (outcome.status !== "success") return;
  assert.equal(outcome.result.source, "mock");
});

test("a failure keyword produces the error outcome, never a throw", async () => {
  const outcome = await run("Add authentication with a timeout fallback");
  assert.equal(outcome.status, "error");
  if (outcome.status !== "error") return;
  assert.equal(outcome.message, ANALYSIS_ERROR_MESSAGE);
});

test("a failure keyword after a Bob fallback reports fellBackToMock", async () => {
  const outcome = await run("Add authentication with a timeout fallback");
  assert.equal(outcome.status, "error");
  if (outcome.status !== "error") return;
  assert.equal(outcome.fellBackToMock, true);
});

test("failure detection is deterministic and word-based", () => {
  assert.equal(shouldMockProviderFail("Payment flow should not error out"), true);
  assert.equal(shouldMockProviderFail("Add authentication"), false);
  assert.equal(shouldMockProviderFail("Add a failover banner"), false);
});

test("the Bob scope timeout constant defaults to 15s", () => {
  assert.equal(DEFAULT_BOB_TIMEOUT_MS, 15_000);
});
