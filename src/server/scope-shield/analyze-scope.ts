/**
 * ScopeShield service layer (PRD 5.2). The mirror of
 * `server/repomap/analyze-repository.ts`: the API route calls this, and it can
 * equally be called by a script or a future job.
 *
 * The browser never reaches IBM Bob. The request comes in, the existing provider
 * and workspace resolution run here on the server, Bob's strict JSON is
 * validated, and only the already-validated result goes back out. A Bob failure
 * propagates as a provider error; there is no fallback to mock data.
 *
 * The Bob-to-UI translation lives in `map-scope.ts`, which stays pure and
 * testable on its own.
 */

import { formatRepoMapContext } from "../bob/prompts.ts";
import { getBobProviderFor } from "../bob/index.ts";
import type { RepositoryRef, RepoMap } from "../../features/repomap/schema.ts";
import type { ScopeAnalysisResult } from "../../features/scope-shield/analysis-runner.ts";
import { toScopeAnalysisResult } from "./map-scope.ts";

export async function analyzeScope(
  repository: RepositoryRef,
  request: string,
  repoMap: RepoMap | null,
): Promise<ScopeAnalysisResult> {
  const provider = await getBobProviderFor(repository);

  // The real RepoMap is passed as supporting evidence so Bob starts from what the
  // Onboarding Map already learned; Bob still reads the workspace itself.
  const context = formatRepoMapContext(repoMap);

  const { scope, trace } = await provider.analyzeScope(repository.url, request, context);

  return {
    ...toScopeAnalysisResult(request, scope, repoMap),
    // PRD §7: the result stays traceable to the Bob task that produced it.
    provider: provider.name,
    bobTaskId: trace.taskId,
  };
}
