import assert from "node:assert/strict";
import { test } from "node:test";
import { parseScopeOutput } from "./output.ts";
import { BobProviderError } from "./provider.ts";

const VALID = {
  risk: { level: "high", summary: "Auth touches every layer." },
  hiddenScope: [
    {
      layer: "security-auth",
      title: "Session storage",
      detail: "Must be decided before middleware runs.",
      tags: ["session"],
    },
  ],
  clarifyingQuestions: [
    { question: "Roles or permissions?", reason: "Changes the model.", category: "security-auth" },
  ],
  draftedReply: "Here is the plan.",
  stack: { languages: ["TypeScript"], frameworks: ["Next.js"], data: [], integrations: [] },
  grounding: "Grounded in src/middleware.ts.",
};

test("ScopeShield output is parsed out of the real Bob result envelope", () => {
  const { scope, trace } = parseScopeOutput(
    JSON.stringify({
      type: "result",
      timestamp: "2026-09-27T00:00:00Z",
      status: "success",
      stats: { task_id: "task-1", duration_ms: 41000, max_cost: 5, tool_calls: 3 },
      last_message: JSON.stringify(VALID),
    }),
  );

  assert.deepEqual(scope, VALID);
  assert.equal(trace.taskId, "task-1");
  // The real envelope carries no model field, so nothing is invented for it.
  assert.equal(trace.model, null);
});

test("a bare JSON payload without an envelope still parses", () => {
  const { scope } = parseScopeOutput(JSON.stringify(VALID));
  assert.deepEqual(scope, VALID);
});

test("prose around the JSON is tolerated, as with the repo map", () => {
  const { scope } = parseScopeOutput(
    `I analysed the repository.\n\n\`\`\`json\n${JSON.stringify(VALID)}\n\`\`\``,
  );
  assert.deepEqual(scope, VALID);
});

test("a missing risk level is a provider failure, not a default", () => {
  const withoutRisk = { ...VALID } as Record<string, unknown>;
  delete withoutRisk.risk;

  assert.throws(
    () => parseScopeOutput(JSON.stringify(withoutRisk)),
    (error: unknown) => {
      assert.ok(error instanceof BobProviderError);
      assert.match(error.message, /scope/i);
      return true;
    },
  );
});

test("a truncated Bob answer is a provider failure, never a partial result", () => {
  assert.throws(() => parseScopeOutput(JSON.stringify({ risk: VALID.risk })), BobProviderError);
});

test("an empty hiddenScope from Bob is rejected rather than shown as no risk", () => {
  assert.throws(
    () => parseScopeOutput(JSON.stringify({ ...VALID, hiddenScope: [] })),
    BobProviderError,
  );
});

test("a non-JSON reply is a provider failure", () => {
  assert.throws(() => parseScopeOutput("I could not complete the analysis."), BobProviderError);
});

test("running out of turns says so, instead of reporting a schema mismatch", () => {
  const ranOutOfTurns = JSON.stringify({
    type: "error",
    message: "The task reached the maximum of 12 turns.",
  });
  const truncatedEnvelope = JSON.stringify({
    type: "result",
    status: "success",
    stats: { task_id: "task-1" },
    last_message: "I ran out of turns before finishing the analysis.",
  });

  assert.throws(
    () => parseScopeOutput(`${ranOutOfTurns}\n${truncatedEnvelope}`),
    (error: unknown) => {
      assert.ok(error instanceof BobProviderError);
      assert.match(error.message, /maximum of 12 turns/);
      assert.match(error.message, /BOB_MAX_TURNS/);
      return true;
    },
  );
});
