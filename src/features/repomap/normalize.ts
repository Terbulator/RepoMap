import {
  providerAnalysisSchema,
  repoMapSchema,
  type Provenance,
  type ProviderAnalysis,
  type Relationship,
  type RepoMap,
  type RepoMapModule,
  type RepositoryRef,
} from "./schema.ts";

const MAX_RECOMMENDED_FILES = 3;
const MAX_GOTCHAS = 8;

export type NormalizeInput = {
  repository: RepositoryRef;
  provenance: Provenance;
};

/** Thrown when a provider answer carries no usable map content at all. */
export class InvalidAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidAnalysisError";
  }
}

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

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  return items.filter((item, index) => items.findIndex((other) => other.id === item.id) === index);
}

/**
 * Converts whatever a provider returned into the strict RepoMap contract.
 * Missing or duplicated fields are repaired here rather than trusted, and an
 * answer with no usable content raises InvalidAnalysisError instead of being
 * padded with invented data.
 */
export function toRepoMap(raw: unknown, input: NormalizeInput): RepoMap {
  const analysis: ProviderAnalysis = providerAnalysisSchema.parse(raw ?? {});

  const modules = dedupeById(
    (analysis.modules ?? [])
      .map((module) => {
        const path = (module.path ?? "").trim();
        const name = (module.name ?? "").trim() || path.split("/").pop() || path;
        return {
          id: slugify(module.id?.trim() || path || name) || "root",
          name,
          path: path || name,
          purpose: (module.purpose ?? module.responsibility ?? "").trim() || "Not described.",
          files: nonEmpty(module.files ?? module.entryPoints ?? []),
          dependencies: nonEmpty(module.dependencies ?? module.dependsOn ?? []),
        };
      })
      .filter((module) => module.path !== "" || module.name !== ""),
  );

  const recommendedFiles = nonEmpty(
    (analysis.recommendedFiles ?? [])
      .map((file) => (file.path ?? "").trim())
      .filter(Boolean),
  )
    .slice(0, MAX_RECOMMENDED_FILES)
    .map((path, index) => {
      const match = (analysis.recommendedFiles ?? []).find(
        (file) => (file.path ?? "").trim() === path,
      );
      return {
        path,
        reason: (match?.reason ?? match?.why ?? "").trim() || "Recommended starting file.",
        rank: index + 1,
      };
    });

  const gotchas = (analysis.gotchas ?? [])
    .map((gotcha) =>
      typeof gotcha === "string"
        ? gotcha.trim()
        : [gotcha.title?.trim() ?? "", gotcha.detail?.trim() ?? ""].filter(Boolean).join(" — "),
    )
    .filter(Boolean)
    .slice(0, MAX_GOTCHAS);

  if (modules.length === 0) {
    throw new InvalidAnalysisError(
      `The analysis provider returned no usable modules for ${input.repository.slug}.`,
    );
  }
  if (recommendedFiles.length === 0) {
    throw new InvalidAnalysisError(
      `The analysis provider returned no recommended starting files for ${input.repository.slug}.`,
    );
  }

  const projectSummary =
    (analysis.projectSummary ?? analysis.summary ?? "").trim() ||
    `No summary was produced for ${input.repository.name}.`;

  return repoMapSchema.parse({
    schemaVersion: 1,
    repository: input.repository,
    provenance: input.provenance,
    projectSummary,
    stack: nonEmpty(analysis.stack ?? []),
    modules,
    recommendedFiles,
    gotchas,
    relationships: deriveRelationships(modules, analysis),
  });
}

function deriveRelationships(modules: RepoMapModule[], analysis: ProviderAnalysis): Relationship[] {
  const explicit = (analysis.relationships ?? [])
    .map((relationship) => ({
      source: (relationship.source ?? "").trim(),
      target: (relationship.target ?? "").trim(),
      type: (relationship.type ?? relationship.relation ?? "depends-on").trim() || "depends-on",
    }))
    .filter((relationship) => relationship.source !== "" && relationship.target !== "");

  const seen = new Set(explicit.map((rel) => `${rel.source}->${rel.target}:${rel.type}`));
  const derived: Relationship[] = [];

  const moduleIds = new Set(modules.map((mod) => mod.id));

  for (const mod of modules) {
    for (const dependency of mod.dependencies) {
      const target = moduleIds.has(slugify(dependency))
        ? slugify(dependency)
        : (modules.find((candidate) => candidate.name.toLowerCase() === dependency.toLowerCase())?.id ??
          "");
      if (target === "") continue;
      const key = `${mod.id}->${target}:depends-on`;
      if (seen.has(key)) continue;
      seen.add(key);
      derived.push({ source: mod.id, target, type: "depends-on" });
    }
  }

  return [...explicit, ...derived];
}
