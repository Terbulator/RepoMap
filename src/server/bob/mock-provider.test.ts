import assert from "node:assert/strict";
import { test } from "node:test";
import { createMockBobProvider, MOCK_NOTICE } from "./mock-provider.ts";
import { parseScopeOutput } from "./output.ts";
import { scopeProviderAnalysisSchema } from "../../features/scope-shield/provider-schema.ts";
import { toRepoMap } from "../../features/repomap/normalize.ts";
import { repoMapSchema } from "../../features/repomap/schema.ts";

const provider = createMockBobProvider();
const REQUEST = "Add authentication with a payment checkout";

/**
 * The mock exists for local development, so its one hard requirement is that it
 * satisfies exactly the same contract as IBM Bob 2.0. If it drifts, local work
 * stops predicting real behaviour.
 */
test("the mock scope run satisfies the real Bob schema", async () => {
  const { scope, trace } = await provider.analyzeScope(
    "https://github.com/Terbulator/demo-onboarding-map",
    REQUEST,
  );

  assert.deepEqual(scopeProviderAnalysisSchema.parse(scope), scope);
  assert.equal(trace.taskId, null);
  assert.equal(provider.name, "mock");
});

test("the mock scope run survives the real parser as if it came from Bob", async () => {
  const { scope } = await provider.analyzeScope("https://github.com/a/b", REQUEST);
  const { scope: parsed } = parseScopeOutput(
    JSON.stringify({ type: "result", status: "success", stats: { task_id: "mock-1" }, last_message: JSON.stringify(scope) }),
  );

  assert.deepEqual(parsed, scope);
});

test("the mock follows the request instead of returning a canned answer", async () => {
  const auth = await provider.analyzeScope("https://github.com/a/b", "Add authentication to the project");
  const payments = await provider.analyzeScope("https://github.com/a/b", "Add a payment checkout page");

  assert.notDeepEqual(auth.scope.draftedReply, payments.scope.draftedReply);
  assert.ok(payments.scope.stack.integrations.includes("Stripe"));
});

test("a mock scope run is always labelled as mock, never as a real analysis", async () => {
  const { scope } = await provider.analyzeScope("https://github.com/a/b", REQUEST);
  assert.ok(scope.grounding.includes(MOCK_NOTICE));
  assert.ok(scope.draftedReply.length > 0);
  assert.doesNotMatch(scope.grounding, /Repo map analysis by bob/i);
});

test("the repository analysis still returns a valid RepoMap", async () => {
  const analysis = await provider.analyzeRepository("https://github.com/Terbulator/demo-onboarding-map");
  const repoMap = toRepoMap(analysis, {
    repository: {
      url: "https://github.com/Terbulator/demo-onboarding-map",
      slug: "Terbulator/demo-onboarding-map",
      name: "demo-onboarding-map",
    },
    provenance: {
      provider: "mock",
      bobTaskId: analysis.trace.taskId,
      generatedAt: "2026-09-26T00:00:00Z",
      durationMs: 0,
      notice: MOCK_NOTICE,
    },
  });

  assert.deepEqual(repoMapSchema.parse(repoMap), repoMap);
  assert.equal(repoMap.provenance.provider, "mock");
  assert.equal(repoMap.provenance.notice, MOCK_NOTICE);
});
