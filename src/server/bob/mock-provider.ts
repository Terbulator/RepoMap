// Relative imports, not `@/`, so this provider can be exercised by `node --test`
// and held to the same contract as the real IBM Bob 2.0 provider.
import type { ScopeProviderAnalysis } from "../../features/scope-shield/provider-schema.ts";
import { DOMAIN_ID_TO_SCOPE_LAYER } from "../../features/scope-shield/provider-schema.ts";
import { generateClarifyingQuestions } from "../../features/scope-shield/clarifying-questions.ts";
import { buildDraftedReply } from "../../features/scope-shield/drafted-reply.ts";
import { analyzeFeatureRequest } from "../../features/scope-shield/risk-analysis.ts";
import { detectStackContext, formatGroundingNote } from "../../features/scope-shield/stack-context.ts";
import type { BobProvider, RepositoryAnalysis, ScopeAnalysis } from "./provider.ts";
// `with { type: "json" }` so Node's ESM loader accepts the fixture too, which is
// what lets the mock be held to the real contract under `node --test`.
import mockAnalysis from "../../data/mock-analysis.json" with { type: "json" };

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

    /**
     * ScopeShield's mock. It reuses the same deterministic keyword generators
     * the old client-side pipeline used, expressed in Bob's contract, so the
     * development path still follows the request instead of returning a canned
     * answer — and so `REPOMAP_PROVIDER=mock` needs no second fixture.
     */
    async analyzeScope(_repositoryUrl: string, request: string): Promise<ScopeAnalysis> {
      const analysis = analyzeFeatureRequest(request);
      const questions = generateClarifyingQuestions(request);
      const stack = detectStackContext(request);
      const grounding = formatGroundingNote(MOCK_REPOSITORY_CONTEXT, stack);

      const scope: ScopeProviderAnalysis = {
        risk: {
          level: analysis.riskLevel.toLowerCase() as ScopeProviderAnalysis["risk"]["level"],
          summary: analysis.summary,
        },
        hiddenScope: analysis.domains.flatMap((domain) =>
          domain.items.map((item) => ({
            layer: DOMAIN_ID_TO_SCOPE_LAYER[domain.id],
            title: item.title,
            detail: item.detail,
            tags: item.tags,
          })),
        ),
        clarifyingQuestions: questions.map((question) => ({
          question: question.question,
          reason: question.why,
          category: question.layer ? DOMAIN_ID_TO_SCOPE_LAYER[question.layer] : "backend",
        })),
        draftedReply: buildDraftedReply({ request, stack, analysis, questions, grounding }),
        stack,
        grounding: `${grounding} ${MOCK_NOTICE}`,
      };

      return { scope, trace: { taskId: null, model: null } };
    },
  };
}

/**
 * The mock repo-map context, so a mock run is still labelled as mock in the
 * grounding line rather than claiming a repository was analysed.
 */
const MOCK_REPOSITORY_CONTEXT = {
  repositoryName: "RepoMap Demo Repository",
  primaryStack: mockAnalysis.stack,
  authArchitecture: [] as string[],
  directories: mockAnalysis.modules.map((module) => module.path),
  provenance: {
    source: "Repo map analysis (mock)",
    analyzedAt: "2026-09-26T00:00:00Z",
    moduleCount: mockAnalysis.modules.length,
    note: MOCK_NOTICE,
  },
};
