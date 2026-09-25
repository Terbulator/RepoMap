import {
  bobAnalysisSchema,
  repoMapSchema,
  type BobAnalysis,
  type RepoMap,
  type RepoMapEdge,
  type RepoMapNode,
  type RepoMapProvenance,
} from "./schema.ts";

const MAX_RECOMMENDED_FILES = 3;
const MAX_GOTCHAS = 6;

/** Thrown when a Bob 2.0 response carries no usable map content at all. */
export class EmptyRepoMapAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmptyRepoMapAnalysisError";
  }
}

export type NormalizeInput = {
  repository: RepoMap["repository"];
  provenance: RepoMapProvenance;
};

function slugify(value: string): string {
  return value
    .trim()
    .replace(/^\.\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function nonEmpty(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

/**
 * Turns a raw IBM Bob 2.0 analysis into the strict RepoMap contract.
 * Anything missing is derived or dropped rather than thrown, so one imperfect
 * module in the model response cannot fail the whole request.
 */
export function toRepoMap(raw: unknown, input: NormalizeInput): RepoMap {
  const analysis: BobAnalysis = bobAnalysisSchema.parse(raw ?? {});

  const modules = analysis.modules
    .map((module) => {
      const path = module.path.trim();
      const name = module.name.trim() || path.split("/").pop() || "root";
      return {
        id: slugify(path || name) || "root",
        name,
        path: path || name,
        responsibility: module.responsibility.trim() || "Not described by Bob 2.0.",
        entryPoints: nonEmpty(module.entryPoints),
        dependsOn: nonEmpty(module.dependsOn),
      };
    })
    .filter((module) => module.path !== "" || module.name !== "root")
    .filter((module, index, all) => all.findIndex((m) => m.id === module.id) === index);

  const recommendedFiles = nonEmpty(analysis.recommendedFiles.map((file) => file.path))
    .slice(0, MAX_RECOMMENDED_FILES)
    .map((path, index) => ({
      rank: index + 1,
      path,
      why:
        analysis.recommendedFiles.find((file) => file.path.trim() === path)?.why.trim() ||
        "Recommended starting point identified by Bob 2.0.",
    }));

  const gotchas = analysis.gotchas
    .map((gotcha) => ({ title: gotcha.title.trim(), detail: gotcha.detail.trim() }))
    .filter((gotcha) => gotcha.title !== "" && gotcha.detail !== "")
    .slice(0, MAX_GOTCHAS);

  if (modules.length === 0) {
    throw new EmptyRepoMapAnalysisError(
      `IBM Bob 2.0 returned no usable modules for ${input.repository.slug}.`,
    );
  }

  if (recommendedFiles.length === 0) {
    throw new EmptyRepoMapAnalysisError(
      `IBM Bob 2.0 returned no recommended starting files for ${input.repository.slug}.`,
    );
  }

  const { nodes, edges } = buildDiagram(modules, recommendedFiles.map((file) => file.path));

  return repoMapSchema.parse({
    schemaVersion: 1,
    repository: input.repository,
    provenance: input.provenance,
    summary: analysis.summary.trim() || `No summary was produced for ${input.repository.name}.`,
    stack: nonEmpty(analysis.stack),
    modules,
    recommendedFiles,
    diagram: { nodes, edges },
    gotchas,
  });
}

type DiagramInput = {
  id: string;
  name: string;
  path: string;
  entryPoints: string[];
  dependsOn: string[];
}[];

function buildDiagram(modules: DiagramInput, recommendedFiles: string[]) {
  const nodes: RepoMapNode[] = [];
  const edges: RepoMapEdge[] = [];
  const seenNodes = new Set<string>();
  const seenEdges = new Set<string>();

  const addNode = (node: RepoMapNode) => {
    if (seenNodes.has(node.id)) return;
    seenNodes.add(node.id);
    nodes.push(node);
  };

  const addEdge = (source: string, target: string, relation: RepoMapEdge["relation"]) => {
    if (source === target) return;
    const id = `${source}->${target}:${relation}`;
    if (seenEdges.has(id)) return;
    seenEdges.add(id);
    edges.push({ id, source, target, relation });
  };

  const fileNodeId = (path: string) => `file:${slugify(path)}`;

  for (const path of recommendedFiles) {
    addNode({
      id: fileNodeId(path),
      label: path.split("/").pop() || path,
      kind: "file",
      path,
    });
  }

  for (const mod of modules) {
    addNode({ id: mod.id, label: mod.name, kind: "module", path: mod.path });
  }

  for (const mod of modules) {
    for (const entryPoint of mod.entryPoints) {
      addNode({
        id: fileNodeId(entryPoint),
        label: entryPoint.split("/").pop() || entryPoint,
        kind: "file",
        path: entryPoint,
      });
      addEdge(mod.id, fileNodeId(entryPoint), "contains");
    }
  }

  const moduleIds = new Set(modules.map((mod) => mod.id));
  for (const mod of modules) {
    for (const dependency of mod.dependsOn) {
      const target = slugify(dependency);
      if (moduleIds.has(target)) {
        addEdge(mod.id, target, "depends-on");
        continue;
      }
      const byName = modules.find(
        (candidate) => candidate.name.toLowerCase() === dependency.toLowerCase(),
      );
      if (byName) addEdge(mod.id, byName.id, "depends-on");
    }
  }

  return { nodes, edges };
}
