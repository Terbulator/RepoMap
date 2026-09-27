import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DOMAIN_ID_TO_SCOPE_LAYER,
  SCOPE_LAYER_TO_DOMAIN_ID,
  scopeProviderAnalysisSchema,
  scopeShieldRequestSchema,
} from "./provider-schema.ts";
import { repoMapSchema } from "../repomap/schema.ts";

/** Bob's output exactly as the prompt asks for it. */
const VALID = {
  risk: { level: "medium", summary: "Auth touches every layer." },
  hiddenScope: [
    {
      layer: "security-auth",
      title: "Session storage choice",
      detail: "Needs cookies or token storage before the middleware runs.",
      tags: ["session"],
    },
  ],
  clarifyingQuestions: [
    { question: "Roles or permissions?", reason: "Changes the model.", category: "security-auth" },
  ],
  draftedReply: "Yes — here is the plan.",
  stack: { languages: ["TypeScript"], frameworks: ["Next.js"], data: [], integrations: [] },
  grounding: "Grounded in the analyzed repository.",
};

test("the expected Bob payload is accepted", () => {
  assert.deepEqual(scopeProviderAnalysisSchema.parse(VALID), VALID);
});

test("an empty stack array is real information, not a missing field", () => {
  const parsed = scopeProviderAnalysisSchema.parse({ ...VALID, stack: { ...VALID.stack, data: [] } });
  assert.deepEqual(parsed.stack.data, []);
});

/** A copy of the payload with one key removed, to prove it is not defaulted. */
function without(source: object, key: string): unknown {
  const copy = { ...(source as Record<string, unknown>) };
  delete copy[key];
  return copy;
}

test("an omitted stack field is malformed, never defaulted", () => {
  const result = scopeProviderAnalysisSchema.safeParse({
    ...VALID,
    stack: without(VALID.stack, "data"),
  });
  assert.equal(result.success, false);
});

test("an omitted tags array is malformed, never defaulted to empty", () => {
  const result = scopeProviderAnalysisSchema.safeParse({
    ...VALID,
    hiddenScope: [without(VALID.hiddenScope[0], "tags")],
  });
  assert.equal(result.success, false);
});

test("an unknown risk level is rejected", () => {
  const result = scopeProviderAnalysisSchema.safeParse({
    ...VALID,
    risk: { level: "critical", summary: "x" },
  });
  assert.equal(result.success, false);
});

test("an empty hiddenScope is rejected rather than shown as no risk", () => {
  const result = scopeProviderAnalysisSchema.safeParse({ ...VALID, hiddenScope: [] });
  assert.equal(result.success, false);
});

test("an unexpected top-level key is a contract drift, not something to drop", () => {
  const result = scopeProviderAnalysisSchema.safeParse({ ...VALID, hallucinatedField: true });
  assert.equal(result.success, false);
});

test("the API body requires a request of at least 10 characters", () => {
  assert.equal(scopeShieldRequestSchema.safeParse({ request: "auth", repository: "a/b" }).success, false);
  assert.equal(
    scopeShieldRequestSchema.safeParse({ request: "Add auth to app", repository: "a/b" }).success,
    true,
  );
});

test("repoMap is optional but must be a real RepoMap when present", () => {
  assert.equal(scopeShieldRequestSchema.safeParse({ request: "Add auth to app", repository: "a/b" }).success, true);
  assert.equal(
    scopeShieldRequestSchema.safeParse({ request: "Add auth to app", repository: "a/b", repoMap: { repository: {} } }).success,
    false,
  );
  assert.equal(
    scopeShieldRequestSchema.safeParse({ request: "Add auth to app", repository: "a/b", repoMap: null }).success,
    true,
  );
});

test("a real RepoMap passes the request schema unchanged", () => {
  const repoMap = repoMapSchema.parse({
    schemaVersion: 1,
    repository: { url: "https://github.com/a/b", slug: "a/b", name: "b" },
    provenance: { provider: "bob-2.0", bobTaskId: "t", generatedAt: "now", durationMs: 1, notice: null },
    projectSummary: "s",
    stack: [],
    modules: [{ id: "m", name: "n", path: "p", purpose: "q", files: [], dependencies: [] }],
    recommendedFiles: [{ path: "p", reason: "r", rank: 1 }],
    gotchas: [],
    relationships: [],
  });

  const parsed = scopeShieldRequestSchema.parse({ request: "Add auth to app", repository: "a/b", repoMap });
  assert.deepEqual(parsed.repoMap, repoMap);
});

test("security-auth is the only renamed layer, in both directions", () => {
  assert.equal(SCOPE_LAYER_TO_DOMAIN_ID["security-auth"], "security");
  assert.equal(DOMAIN_ID_TO_SCOPE_LAYER.security, "security-auth");
  for (const [layer, domain] of Object.entries(SCOPE_LAYER_TO_DOMAIN_ID)) {
    assert.equal(DOMAIN_ID_TO_SCOPE_LAYER[domain as keyof typeof DOMAIN_ID_TO_SCOPE_LAYER], layer);
  }
});
