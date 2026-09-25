import type { BobAnalysis } from "@/features/repomap/schema";

/**
 * Thin seam in front of IBM Bob 2.0.
 *
 * PRD §7 requires every module's output to be traceable to a specific Bob
 * task/session, so a provider always reports the task id it ran under when the
 * service exposes one.
 */
export type BobProviderName = "bob-2.0" | "stub";

export type BobTaskTrace = {
  taskId: string | null;
  model: string | null;
};

export type RepositoryAnalysis = BobAnalysis & {
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
