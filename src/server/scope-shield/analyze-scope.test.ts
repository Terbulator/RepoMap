import assert from "node:assert/strict";
import { test } from "node:test";
import { toScopeAnalysisResult } from "./map-scope.ts";
import { DOMAIN_NAMES } from "../../features/scope-shield/risk-analysis.ts";
import { repoMapSchema } from "../../features/repomap/schema.ts";
import type { RepoMap } from "../../features/repomap/schema.ts";
import { scopeProviderAnalysisSchema } from "../../features/scope-shield/provider-schema.ts";

const SCOPE = scopeProviderAnalysisSchema.parse({
  risk: { level: "high", summary: "Auth reaches every layer." },
  hiddenScope: [
    {
      layer: "security-auth",
      title: "Session storage",
      detail: "Must be settled before the middleware runs.",
      tags: ["session", "security"],
    },
    {
      layer: "database",
      title: "User table migration",
      detail: "Roles need a column.",
      tags: ["schema"],
    },
  ],
  clarifyingQuestions: [
    { question: "Roles or permissions?", reason: "Changes the model.", category: "security-auth" },
  ],
  draftedReply: "Here is what is in scope.",
  stack: { languages: ["TypeScript"], frameworks: ["Next.js"], data: ["PostgreSQL"], integrations: [] },
  grounding: "Grounded in src/middleware.ts and server/db.ts.",
});

const REPO_MAP: RepoMap = repoMapSchema.parse({
  schemaVersion: 1,
  repository: { url: "https://github.com/a/b", slug: "a/b", name: "b" },
  provenance: {
    provider: "bob-2.0",
    bobTaskId: "task-1",
    generatedAt: "2026-09-27T00:00:00Z",
    durationMs: 41000,
    notice: null,
  },
  projectSummary: "A demo.",
  stack: ["Next.js 16"],
  modules: [
    { id: "m1", name: "session", path: "src/auth/session.ts", purpose: "Auth session cookie", files: [], dependencies: [] },
    { id: "m2", name: "db", path: "server/db.ts", purpose: "Prisma client", files: [], dependencies: [] },
    { id: "m3", name: "ui", path: "src/app/page.tsx", purpose: "Home page", files: [], dependencies: [] },
  ],
  recommendedFiles: [{ path: "src/middleware.ts", reason: "Guard runs first", rank: 1 }],
  gotchas: [],
  relationships: [],
});

test("security-auth findings land in the security domain", () => {
  const result = toScopeAnalysisResult("Add auth", SCOPE, REPO_MAP);
  const security = result.analysis.domains.find((domain) => domain.id === "security");

  assert.ok(security);
  assert.equal(security.items.length, 1);
  assert.equal(security.items[0].title, "Session storage");
  assert.deepEqual(security.items[0].tags, ["session", "security"]);
});

test("a layer Bob did not mention is an empty group, not filler", () => {
  const result = toScopeAnalysisResult("Add auth", SCOPE, REPO_MAP);
  const frontend = result.analysis.domains.find((domain) => domain.id === "frontend");

  assert.ok(frontend);
  assert.deepEqual(frontend.items, []);
});

test("all five UI domains are present, in the order the cards use", () => {
  const result = toScopeAnalysisResult("Add auth", SCOPE, REPO_MAP);
  assert.deepEqual(
    result.analysis.domains.map((domain) => domain.id),
    ["frontend", "backend", "database", "infrastructure", "security"],
  );
  assert.equal(result.analysis.riskLevel, "HIGH");
  assert.equal(result.analysis.totalItems, 2);
});

test("Bob's risk summary, grounding and draft are passed through, not paraphrased", () => {
  const result = toScopeAnalysisResult("Add auth", SCOPE, REPO_MAP);
  assert.equal(result.analysis.summary, SCOPE.risk.summary);
  assert.equal(result.grounding, SCOPE.grounding);
  assert.equal(result.draft, SCOPE.draftedReply);
  assert.deepEqual(result.stack, SCOPE.stack);
});

test("questions keep Bob's wording and gain the UI layer", () => {
  const result = toScopeAnalysisResult("Add auth", SCOPE, REPO_MAP);
  assert.equal(result.questions[0].question, SCOPE.clarifyingQuestions[0].question);
  assert.equal(result.questions[0].layer, "security");
  assert.equal(result.questions[0].topic, DOMAIN_NAMES.security);
});

test("context comes from the real repo map, with no mock wording", () => {
  const result = toScopeAnalysisResult("Add auth", SCOPE, REPO_MAP);
  const context = result.context;

  assert.equal(context.repositoryName, "b (a/b)");
  assert.deepEqual(context.primaryStack, ["Next.js 16"]);
  assert.equal(context.provenance.moduleCount, 3);
  assert.equal(context.provenance.analyzedAt, "2026-09-27T00:00:00Z");
  assert.match(context.provenance.source, /bob-2\.0/);
  assert.doesNotMatch(context.provenance.note, /mock|no AI was consulted/i);
  assert.ok(context.authArchitecture.some((entry) => entry.includes("src/auth/session.ts")));
});

test("a repository with no auth module says so instead of inventing a layer", () => {
  const noAuth = repoMapSchema.parse({
    ...REPO_MAP,
    modules: [{ id: "m3", name: "ui", path: "src/app/page.tsx", purpose: "Home page", files: [], dependencies: [] }],
  });

  const result = toScopeAnalysisResult("Add auth", SCOPE, noAuth);
  assert.match(result.context.authArchitecture.join(" "), /No auth or session module/i);
});

test("no repo map produces an honest empty context, never the demo fixture", () => {
  const result = toScopeAnalysisResult("Add auth", SCOPE, null);
  assert.deepEqual(result.context.primaryStack, []);
  assert.doesNotMatch(result.context.repositoryName, /Demo Repository/i);
  assert.doesNotMatch(result.context.provenance.note, /no AI was consulted/i);
});

test("a mock repo map is labelled as mock", () => {
  const mockMap = repoMapSchema.parse({
    ...REPO_MAP,
    provenance: { ...REPO_MAP.provenance, provider: "mock", notice: "Mock data." },
  });

  const result = toScopeAnalysisResult("Add auth", SCOPE, mockMap);
  assert.match(result.context.provenance.source, /mock/i);
});

test("item ids are unique and stable for a given Bob answer", () => {
  const first = toScopeAnalysisResult("Add auth", SCOPE, REPO_MAP);
  const second = toScopeAnalysisResult("Add auth", SCOPE, REPO_MAP);

  const ids = first.analysis.domains.flatMap((domain) => domain.items.map((item) => item.id));
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(
    first.analysis.domains.flatMap((domain) => domain.items.map((item) => item.id)),
    second.analysis.domains.flatMap((domain) => domain.items.map((item) => item.id)),
  );
});
