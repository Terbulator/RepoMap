import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ANALYSIS_ERROR_MESSAGE,
  DEFAULT_BOB_TIMEOUT_MS,
  INVALID_REQUEST_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  NO_REPOSITORY_MESSAGE,
  runScopeAnalysis,
  validateFeatureRequest,
} from "./analysis-runner.ts";
import { EMPTY_REQUEST_MESSAGE } from "./feature-request.ts";
import { parseStoredRepoMap } from "../repomap/store.ts";
import { repoMapSchema } from "../repomap/schema.ts";
import type { RepoMap } from "../repomap/schema.ts";

const REQUEST = "Add authentication to the project";

/** Parsed, not cast, so a schema change fails here instead of passing silently. */
const REPO_MAP_FIXTURE: RepoMap = repoMapSchema.parse({
  schemaVersion: 1,
  repository: {
    url: "https://github.com/Terbulator/demo-onboarding-map",
    slug: "Terbulator/demo-onboarding-map",
    name: "demo-onboarding-map",
  },
  provenance: {
    provider: "bob-2.0",
    bobTaskId: "task-1",
    generatedAt: "2026-09-27T00:00:00Z",
    durationMs: 41000,
    notice: null,
  },
  projectSummary: "A demo repository.",
  stack: ["Next.js"],
  modules: [
    { id: "m1", name: "app", path: "src/app", purpose: "Routes", files: ["page.tsx"], dependencies: [] },
  ],
  recommendedFiles: [{ path: "src/app/page.tsx", reason: "Entry point", rank: 1 }],
  gotchas: [],
  relationships: [],
});

/** A Response-alike, so the runner is tested without a network or a browser. */
function respondWith(body: unknown, status = 200): typeof fetch {
  return (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    })) as unknown as typeof fetch;
}

const SUCCESS_BODY = {
  success: true,
  result: {
    request: REQUEST,
    analysis: { request: REQUEST, riskLevel: "HIGH", summary: "Auth touches everything.", domains: [], totalItems: 0 },
    questions: [],
    stack: { languages: ["TypeScript"], frameworks: ["Next.js"], data: [], integrations: [] },
    grounding: "Grounded in Repo Analysis.",
    draft: "Here is the reply.",
    context: { repositoryName: "demo", primaryStack: ["Next.js"], authArchitecture: [], directories: [], provenance: {} },
    provider: "bob-2.0",
    bobTaskId: "task-1",
  },
};

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

test("no analysed repository stops the run instead of guessing one", async () => {
  const outcome = await runScopeAnalysis(REQUEST, { repoMap: null });
  assert.deepEqual(outcome, { status: "error", message: NO_REPOSITORY_MESSAGE });
});

test("a successful run returns the server result untouched", async () => {
  const outcome = await runScopeAnalysis(REQUEST, {
    repoMap: REPO_MAP_FIXTURE,
    fetchImpl: respondWith(SUCCESS_BODY),
  });

  assert.equal(outcome.status, "success");
  if (outcome.status !== "success") return;
  assert.equal(outcome.result.provider, "bob-2.0");
  assert.equal(outcome.result.bobTaskId, "task-1");
  assert.equal(outcome.result.analysis.riskLevel, "HIGH");
});

test("the request and the real repo map are posted to the server", async () => {
  const seen: { url?: string; body?: unknown } = {};
  const fetchImpl = (async (url: string, init: RequestInit) => {
    seen.url = url;
    seen.body = JSON.parse(String(init.body));
    return new Response(JSON.stringify(SUCCESS_BODY), { status: 200 });
  }) as unknown as typeof fetch;

  await runScopeAnalysis(REQUEST, { repoMap: REPO_MAP_FIXTURE, fetchImpl });

  assert.equal(seen.url, "/api/scope-shield");
  const body = seen.body as { request: string; repository: string; repoMap: unknown };
  assert.equal(body.request, REQUEST);
  assert.equal(body.repository, REPO_MAP_FIXTURE.repository.url);
  assert.deepEqual(body.repoMap, REPO_MAP_FIXTURE);
});

test("a provider error is surfaced as an error outcome, never a throw", async () => {
  const outcome = await runScopeAnalysis(REQUEST, {
    repoMap: REPO_MAP_FIXTURE,
    fetchImpl: respondWith(
      { success: false, error: { code: "PROVIDER_FAILED", message: "bob run exited with 1" } },
      502,
    ),
  });

  assert.deepEqual(outcome, { status: "error", message: "bob run exited with 1" });
});

test("a provider error without a message still yields the generic error", async () => {
  const outcome = await runScopeAnalysis(REQUEST, {
    repoMap: REPO_MAP_FIXTURE,
    fetchImpl: respondWith({ success: false, error: { code: "PROVIDER_FAILED", message: "" } }, 502),
  });

  assert.deepEqual(outcome, { status: "error", message: ANALYSIS_ERROR_MESSAGE });
});

test("a 200 carrying a non-result is an error, not a broken success", async () => {
  const outcome = await runScopeAnalysis(REQUEST, {
    repoMap: REPO_MAP_FIXTURE,
    fetchImpl: respondWith({ success: true, result: { request: REQUEST } }),
  });

  assert.deepEqual(outcome, { status: "error", message: ANALYSIS_ERROR_MESSAGE });
});

test("an unreachable API is an error outcome", async () => {
  const fetchImpl = (async () => {
    throw new Error("network down");
  }) as unknown as typeof fetch;

  const outcome = await runScopeAnalysis(REQUEST, { repoMap: REPO_MAP_FIXTURE, fetchImpl });
  assert.deepEqual(outcome, { status: "error", message: NETWORK_ERROR_MESSAGE });
});

test("stored repo map data is re-validated rather than trusted", () => {
  assert.equal(parseStoredRepoMap(null), null);
  assert.equal(parseStoredRepoMap("not json"), null);
  assert.equal(parseStoredRepoMap(JSON.stringify({ repository: {} })), null);
  assert.deepEqual(
    parseStoredRepoMap(JSON.stringify(REPO_MAP_FIXTURE)),
    REPO_MAP_FIXTURE,
  );
});

test("the Bob scope timeout constant defaults to 15s", () => {
  assert.equal(DEFAULT_BOB_TIMEOUT_MS, 15_000);
});
