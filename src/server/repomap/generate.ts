import { toRepoMap } from "@/features/repomap/normalize";
import type { RepoMap } from "@/features/repomap/schema";
import { getBobProvider } from "@/server/bob";
import type { RepositoryRef } from "@/lib/repository-url";

/**
 * M1 orchestration: hand the repository to IBM Bob 2.0, then normalise its
 * answer into the RepoMap contract (PRD 5.1, milestone M1).
 */
export async function generateRepoMap(repository: RepositoryRef): Promise<RepoMap> {
  const provider = getBobProvider();
  const requestedAt = new Date();

  const analysis = await provider.analyzeRepository(repository.url);

  const completedAt = new Date();

  return toRepoMap(analysis, {
    repository: {
      url: repository.url,
      slug: repository.slug,
      name: repository.name,
    },
    provenance: {
      provider: provider.name,
      bobTaskId: analysis.trace.taskId,
      model: analysis.trace.model,
      requestedAt: requestedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - requestedAt.getTime(),
    },
  });
}
