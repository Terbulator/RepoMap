import assert from "node:assert/strict";
import { test } from "node:test";
import { parseBobOutput } from "./output.ts";
import { BobProviderError } from "./provider.ts";

const analysis = {
  projectSummary: "A demo service.",
  stack: ["TypeScript"],
  modules: [{ name: "web", path: "src/web", purpose: "Serves the UI." }],
  recommendedFiles: [{ path: "README.md", reason: "Start here." }],
};

test("reads a single JSON document", () => {
  const result = parseBobOutput(JSON.stringify({ ...analysis, taskId: "task_1" }));
  assert.equal(result.projectSummary, "A demo service.");
  assert.equal(result.trace.taskId, "task_1");
});

test("reads the last document of a JSON stream", () => {
  const stream = [
    JSON.stringify({ type: "start" }),
    JSON.stringify({ type: "message", text: "thinking" }),
    JSON.stringify({ ...analysis, taskId: "task_2" }),
  ].join("\n");

  const result = parseBobOutput(stream);
  assert.equal(result.trace.taskId, "task_2");
  assert.equal(result.modules?.length, 1);
});

test("reads JSON wrapped in a fence inside an envelope", () => {
  const output = JSON.stringify({ data: "```json\n" + JSON.stringify(analysis) + "\n```" });
  assert.equal(parseBobOutput(output).projectSummary, "A demo service.");
});

test("reads the `bob run --format json` result envelope", () => {
  const stdout = JSON.stringify({
    type: "result",
    timestamp: "2026-01-01T00:00:00.000Z",
    status: "success",
    stats: {
      task_id: "task_3",
      duration_ms: 34_957,
      session_costs: 0.13,
      max_cost: 0,
      tool_calls: 12,
    },
    last_message: JSON.stringify(analysis),
  });

  const result = parseBobOutput(stdout);
  assert.equal(result.projectSummary, "A demo service.");
  assert.equal(result.trace.taskId, "task_3");
  assert.equal(result.modules?.length, 1);
  assert.equal(result.recommendedFiles?.length, 1);
});

test("reports a clear failure for empty or unparsable output", () => {
  assert.throws(() => parseBobOutput("   "), BobProviderError);
  assert.throws(() => parseBobOutput("I could not read the repository."), BobProviderError);
});
