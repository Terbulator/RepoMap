import type { BobProvider, RepositoryAnalysis } from "./provider.ts";
import mockAnalysis from "@/data/mock-analysis.json";

export const MOCK_NOTICE =
  "Mock data for local development. IBM Bob 2.0 was not called.";

/**
 * Deterministic development provider. It returns the checked-in fixture, so the
 * frontend team can build the Onboarding Map and ScopeShield without Bob
 * credentials, and no run-to-run randomness is ever presented as AI output.
 * Every response from this provider is labelled `provider: "mock"`.
 */
export function createMockBobProvider(): BobProvider {
  return {
    name: "mock",

    async analyzeRepository(): Promise<RepositoryAnalysis> {
      return {
        ...(mockAnalysis as RepositoryAnalysis),
        trace: { taskId: null, model: null },
      };
    },
  };
}
