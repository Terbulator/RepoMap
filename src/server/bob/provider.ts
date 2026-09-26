import type { ProviderAnalysis } from "@/features/repomap/schema.ts";
import type { ScopeProviderAnalysis } from "@/features/scope-shield/provider-schema.ts";

/**
 * Thin seam in front of the analysis providers.
 *
 * PRD §7 requires every module's output to be traceable to a specific Bob
 * task/session, so a provider always reports the task id it ran under when the
 * tool exposes one.
 */
export type BobProviderName = "bob-2.0" | "mock";

export type BobTaskTrace = {
  taskId: string | null;
  model: string | null;
};

export type RepositoryAnalysis = ProviderAnalysis & {
  trace: BobTaskTrace;
};

/** One ScopeShield run, exactly as the provider's contract defines it. */
export type ScopeAnalysis = {
  scope: ScopeProviderAnalysis;
  trace: BobTaskTrace;
};

export interface BobProvider {
  readonly name: BobProviderName;
  analyzeRepository(repositoryUrl: string): Promise<RepositoryAnalysis>;
  /**
   * ScopeShield's operation (PRD 5.2). `context` is the rendered RepoMap, passed
   * as supporting evidence; the provider still reads the workspace itself.
   */
  analyzeScope(
    repositoryUrl: string,
    request: string,
    context?: string | null,
  ): Promise<ScopeAnalysis>;
}

export class BobProviderError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "BobProviderError";
    this.cause = cause;
  }
}
