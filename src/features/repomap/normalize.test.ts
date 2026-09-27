import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { toRepoMap, InvalidAnalysisError } from "./normalize.ts";
import { repoMapSchema, type Provenance, type RepositoryRef } from "./schema.ts";

/** Loaded from disk so the test runs under plain Node, like the app fixture. */
const mockAnalysis = JSON.parse(
  readFileSync(path.join(process.cwd(), "src/data/mock-analysis.json"), "utf8"),
);

const repository: RepositoryRef = {
  url: "https://github.com/acme/demo",
  slug: "acme/demo",
  name: "demo",
};

const provenance: Provenance = {
  provider: "bob-2.0",
  bobTaskId: "task_123",
  generatedAt: "2026-09-25T00:00:00.000Z",
  durationMs: 5000,
  notice: null,
};

const analysis = {
  projectSummary: "A small demo service used to show RepoMap in the hackathon demo.",
  stack: ["TypeScript", "Node.js"],
  modules: [
    {
      name: "web",
      path: "src/web",
      purpose: "Serves the demo UI.",
      files: ["src/web/server.ts"],
      dependencies: ["core"],
    },
    {
      name: "core",
      path: "src/core",
      purpose: "Holds domain logic.",
      files: [],
      dependencies: [],
    },
  ],
  recommendedFiles: [
    { path: "README.md", reason: "Explains how to run the demo." },
    { path: "src/web/server.ts", reason: "Entry point of the service." },
    { path: "src/core/index.ts", reason: "Core logic starts here." },
    { path: "package.json", reason: "Must not survive into the top three." },
  ],
  gotchas: ["The demo server binds a fixed port."],
};

test("produces a contract-valid RepoMap from a provider analysis", () => {
  const repoMap = toRepoMap(analysis, { repository, provenance });

  assert.equal(repoMap.schemaVersion, 1);
  assert.equal(repoMap.projectSummary, analysis.projectSummary);
  assert.deepEqual(repoMap.stack, ["TypeScript", "Node.js"]);
  assert.equal(repoMap.provenance.provider, "bob-2.0");
  assert.equal(repoMap.provenance.bobTaskId, "task_123");
  assert.deepEqual(
    repoMap.modules.map((module) => module.id),
    ["src-web", "src-core"],
  );
  assert.equal(repoMapSchema.safeParse(repoMap).success, true);
});

test("caps recommended files at three and numbers them in order", () => {
  const repoMap = toRepoMap(analysis, { repository, provenance });

  assert.equal(repoMap.recommendedFiles.length, 3);
  assert.deepEqual(
    repoMap.recommendedFiles.map((file) => file.rank),
    [1, 2, 3],
  );
  assert.equal(repoMap.recommendedFiles[0].path, "README.md");
  assert.equal(repoMap.recommendedFiles[0].reason, "Explains how to run the demo.");
});

test("derives module relationships from dependencies, resolving ids and names", () => {
  const repoMap = toRepoMap(analysis, { repository, provenance });

  assert.deepEqual(repoMap.relationships, [
    { source: "src-web", target: "src-core", type: "depends-on" },
  ]);
});

test("keeps explicit relationships alongside derived ones without duplicating", () => {
  const repoMap = toRepoMap(
    {
      ...analysis,
      relationships: [
        { source: "core", target: "src-web", type: "imports" },
        { source: "src-web", target: "src-core", type: "depends-on" },
      ],
    },
    { repository, provenance },
  );

  assert.deepEqual(repoMap.relationships, [
    { source: "core", target: "src-web", type: "imports" },
    { source: "src-web", target: "src-core", type: "depends-on" },
  ]);
});

test("accepts alternative provider field names", () => {
  const repoMap = toRepoMap(
    {
      summary: "Legacy shape from an older prompt.",
      modules: [
        {
          name: "web",
          path: "src/web",
          responsibility: "Serves the UI.",
          entryPoints: ["src/web/server.ts"],
          dependsOn: ["src/core"],
        },
        { name: "core", path: "src/core", responsibility: "Domain logic." },
      ],
      recommendedFiles: [{ path: "README.md", why: "Start here." }],
      gotchas: [{ title: "Fixed port", detail: "The demo server binds 3000." }],
    },
    { repository, provenance },
  );

  assert.equal(repoMap.projectSummary, "Legacy shape from an older prompt.");
  assert.deepEqual(repoMap.modules[0].files, ["src/web/server.ts"]);
  assert.deepEqual(repoMap.modules[0].dependencies, ["src/core"]);
  assert.equal(repoMap.recommendedFiles[0].reason, "Start here.");
  assert.deepEqual(repoMap.gotchas, ["Fixed port — The demo server binds 3000."]);
});

test("refuses to invent a map when the provider returns nothing usable", () => {
  assert.throws(() => toRepoMap({}, { repository, provenance }), InvalidAnalysisError);
  assert.throws(
    () => toRepoMap({ modules: analysis.modules }, { repository, provenance }),
    InvalidAnalysisError,
  );
});

test("the checked-in mock fixture satisfies the shared contract", () => {
  const repoMap = toRepoMap(
    mockAnalysis,
    {
      repository,
      provenance: { ...provenance, provider: "mock", bobTaskId: null, notice: "Mock data." },
    },
  );

  assert.equal(repoMapSchema.safeParse(repoMap).success, true);
  assert.equal(repoMap.modules.length, mockAnalysis.modules.length);
  assert.equal(repoMap.recommendedFiles.length, 3);
  assert.ok(repoMap.relationships.length > 0);
  assert.equal(repoMap.projectSummary, mockAnalysis.projectSummary);
});
