import assert from "node:assert/strict";
import { test } from "node:test";
import { buildScopeShieldPrompt, formatRepoMapContext } from "./prompts.ts";
import { repoMapSchema } from "../../features/repomap/schema.ts";
import type { RepoMap } from "../../features/repomap/schema.ts";

const REPO_MAP: RepoMap = repoMapSchema.parse({
  schemaVersion: 1,
  repository: { url: "https://github.com/a/b", slug: "a/b", name: "b" },
  provenance: { provider: "bob-2.0", bobTaskId: "t", generatedAt: "now", durationMs: 1, notice: null },
  projectSummary: "A Next.js demo with a payments page.",
  stack: ["Next.js 16", "TypeScript"],
  modules: [
    { id: "m1", name: "checkout", path: "src/app/checkout", purpose: "Payment UI", files: ["page.tsx"], dependencies: ["m2"] },
    { id: "m2", name: "db", path: "server/db", purpose: "Prisma client", files: ["client.ts"], dependencies: [] },
  ],
  recommendedFiles: [{ path: "src/app/checkout/page.tsx", reason: "Payment entry point", rank: 1 }],
  gotchas: ["Stripe webhooks are not verified."],
  relationships: [{ source: "checkout", target: "db", type: "reads" }],
});

test("the prompt states the exact JSON contract", () => {
  const prompt = buildScopeShieldPrompt(
    "https://github.com/a/b",
    "Add auth to checkout",
    formatRepoMapContext(REPO_MAP),
  );

  for (const key of [
    "risk",
    "hiddenScope",
    "clarifyingQuestions",
    "draftedReply",
    "stack",
    "grounding",
  ]) {
    assert.ok(prompt.includes(key), `prompt is missing ${key}`);
  }

  assert.ok(prompt.includes('"level": "low"'));
  assert.ok(prompt.includes("security-auth"));
  assert.ok(prompt.includes("Return ONLY a JSON object"));
});

test("the prompt carries the request, the repository and the real repo map", () => {
  const prompt = buildScopeShieldPrompt(
    "https://github.com/a/b",
    "Add auth to checkout",
    formatRepoMapContext(REPO_MAP),
  );

  assert.ok(prompt.includes("Add auth to checkout"));
  assert.ok(prompt.includes("https://github.com/a/b"));
  assert.ok(prompt.includes("A Next.js demo with a payments page."));
  assert.ok(prompt.includes("src/app/checkout"));
  assert.ok(prompt.includes("Payment UI"));
  assert.ok(prompt.includes("src/app/checkout/page.tsx"));
  assert.ok(prompt.includes("reads"));
  assert.ok(prompt.includes("Stripe webhooks are not verified."));
});

test("a null repo map still produces a usable prompt", () => {
  const prompt = buildScopeShieldPrompt("https://github.com/a/b", "Add auth to checkout", null);
  assert.ok(prompt.includes("Add auth to checkout"));
  assert.ok(prompt.includes("https://github.com/a/b"));
});

test("repo map context is capped so a huge map cannot crowd out the instructions", () => {
  const big: RepoMap = {
    ...REPO_MAP,
    modules: REPO_MAP.modules.map((_, index) => ({
      id: `m${index}`,
      name: `module-${index}`,
      path: `src/module-${index}`,
      purpose: "x".repeat(400),
      files: [],
      dependencies: [],
    })),
    gotchas: Array.from({ length: 50 }, (_, i) => `gotcha ${i}`),
  };

  const context = formatRepoMapContext(big);
  assert.ok(context !== null);
  assert.ok(context.length < 6000, `context grew to ${context.length} characters`);
});
