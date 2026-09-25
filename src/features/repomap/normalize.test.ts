import assert from "node:assert/strict";
import { test } from "node:test";
import { toRepoMap, EmptyRepoMapAnalysisError } from "./normalize.ts";
import { repoMapSchema, type RepoMapProvenance } from "./schema.ts";

const provenance: RepoMapProvenance = {
  provider: "bob-2.0",
  bobTaskId: "task_123",
  model: "bob-2.0-large",
  requestedAt: "2026-09-25T00:00:00.000Z",
  completedAt: "2026-09-25T00:00:05.000Z",
  durationMs: 5000,
};

const repository = { url: "https://github.com/acme/demo", slug: "acme/demo", name: "demo" };

const analysis = {
  summary: "A small demo service used to show RepoMap in the hackathon demo.",
  stack: ["TypeScript", "Next.js"],
  modules: [
    {
      name: "web",
      path: "src/web",
      responsibility: "Serves the demo UI.",
      entryPoints: ["src/web/server.ts"],
      dependsOn: ["src/core"],
    },
    {
      name: "core",
      path: "src/core",
      responsibility: "Holds domain logic.",
      entryPoints: [],
      dependsOn: [],
    },
  ],
  recommendedFiles: [
    { path: "README.md", why: "Explains how to run the demo." },
    { path: "src/web/server.ts", why: "Entry point of the service." },
    { path: "src/core/index.ts", why: "Core logic starts here." },
    { path: "package.json", why: "Should never appear in the top three." },
  ],
  gotchas: [
    { title: "Seeded bug", detail: "src/web/server.ts swallows errors on purpose for the demo." },
  ],
};

test("produces a contract-valid RepoMap from a Bob analysis", () => {
  const repoMap = toRepoMap(analysis, { repository, provenance });

  assert.equal(repoMap.schemaVersion, 1);
  assert.equal(repoMap.summary, analysis.summary);
  assert.deepEqual(repoMap.stack, ["TypeScript", "Next.js"]);
  assert.equal(repoMap.provenance.provider, "bob-2.0");
  assert.equal(repoMap.provenance.bobTaskId, "task_123");
  assert.deepEqual(
    repoMap.modules.map((module) => module.id),
    ["src-web", "src-core"],
  );
});

test("caps recommended files at three, per FR-3", () => {
  const repoMap = toRepoMap(analysis, { repository, provenance });
  assert.equal(repoMap.recommendedFiles.length, 3);
  assert.deepEqual(
    repoMap.recommendedFiles.map((file) => file.rank),
    [1, 2, 3],
  );
  assert.equal(repoMap.recommendedFiles[0].why, "Explains how to run the demo.");
});

test("derives diagram nodes and edges from modules, entry points and dependencies", () => {
  const repoMap = toRepoMap(analysis, { repository, provenance });
  const ids = repoMap.diagram.nodes.map((node) => node.id);

  assert.ok(ids.includes("src-web"));
  assert.ok(ids.includes("src-core"));
  assert.ok(ids.includes("file:readme-md"));

  const relations = repoMap.diagram.edges.map((edge) => edge.relation);
  assert.ok(relations.includes("contains"));
  assert.ok(relations.includes("depends-on"));
  assert.ok(
    repoMap.diagram.edges.some(
      (edge) => edge.source === "src-web" && edge.target === "src-core",
    ),
  );
  for (const edge of repoMap.diagram.edges) {
    assert.ok(ids.includes(edge.source));
    assert.ok(ids.includes(edge.target));
  }
});

test("degrades on a partial analysis but refuses to invent one", () => {
  const partial = toRepoMap(
    {
      modules: [{ name: "web", path: "src/web", responsibility: "Serves the UI." }],
      recommendedFiles: [{ path: "src/web/server.ts", why: "Entry point." }],
    },
    { repository, provenance },
  );

  assert.deepEqual(partial.stack, []);
  assert.deepEqual(partial.gotchas, []);
  assert.deepEqual(partial.modules[0].entryPoints, []);
  assert.equal(repoMapSchema.safeParse(partial).success, true);

  assert.throws(
    () => toRepoMap({}, { repository, provenance }),
    EmptyRepoMapAnalysisError,
  );
  assert.throws(
    () => toRepoMap({ modules: analysis.modules }, { repository, provenance }),
    EmptyRepoMapAnalysisError,
  );
});
