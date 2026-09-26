import { toRepoMap, InvalidAnalysisError } from "@/features/repomap/normalize.ts";
import { repoMapSchema, type RepoMap, type RepositoryRef } from "@/features/repomap/schema.ts";
import { getBobProviderFor, MOCK_NOTICE } from "@/server/bob";

/**
 * M1 service layer. Independent of React: the API route calls this, and so can a
 * script or a future job. It turns provider reasoning into the RepoMap
 * contract that the frontend depends on.
 */
export async function analyzeRepository(repository: RepositoryRef): Promise<RepoMap> {
  const provider = await getBobProviderFor(repository);
  const startedAt = new Date();

  // Development logging
  if (process.env.NODE_ENV === "development") {
    console.log("[RepoMap] Analysis started", {
      repositoryUrl: repository.url,
      repositorySlug: repository.slug,
      provider: provider.name,
      workspace: process.env.REPOMAP_WORKSPACE_DIR ? "configured" : "auto-clone",
      isMock: provider.name === "mock",
    });
  }

  const analysis = await provider.analyzeRepository(repository.url);

  const repoMap = toRepoMap(analysis, {
    repository: {
      url: repository.url,
      slug: repository.slug,
      name: repository.name,
    },
    provenance: {
      provider: provider.name,
      bobTaskId: analysis.trace?.taskId ?? null,
      generatedAt: startedAt.toISOString(),
      durationMs: Date.now() - startedAt.getTime(),
      notice: provider.name === "mock" ? MOCK_NOTICE : null,
    },
  });

  // Development logging
  if (process.env.NODE_ENV === "development") {
    console.log("[RepoMap] Analysis completed", {
      repositoryUrl: repository.url,
      provider: provider.name,
      modulesCount: repoMap.modules.length,
      relationshipsCount: repoMap.relationships.length,
      durationMs: Date.now() - startedAt.getTime(),
      notice: provider.name === "mock" ? MOCK_NOTICE : null,
    });
  }

  return repoMapSchema.parse(repoMap);
}

export { InvalidAnalysisError };
