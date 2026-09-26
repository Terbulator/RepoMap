import type { ProviderAnalysis } from "@/features/repomap/schema.ts";

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

export interface BobProvider {
  readonly name: BobProviderName;
  analyzeRepository(repositoryUrl: string): Promise<RepositoryAnalysis>;
}

export class BobProviderError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "BobProviderError";
    this.cause = cause;
  }
}
