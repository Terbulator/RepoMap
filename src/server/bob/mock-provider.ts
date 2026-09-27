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
 * Deterministic development provider. It returns repository-specific mock data
 * so the frontend team can build the Onboarding Map and ScopeShield without Bob
 * credentials. Every response from this provider is labelled `provider: "mock"`.
 * The data varies based on the repository URL to help developers test the UI
 * with different repository structures.
 */
export function createMockBobProvider(): BobProvider {
  return {
    name: "mock",

    async analyzeRepository(repositoryUrl: string): Promise<RepositoryAnalysis> {
      // Generate repository-specific mock data based on the URL
      const repoSlug = repositoryUrl
        .replace(/^https?:\/\/[^/]+\//, "")
        .replace(/\.git$/, "")
        .replace(/[^a-zA-Z0-9._-]/g, "-");
      
      const repoName = repoSlug.split("/").pop() || repoSlug;
      const repoOwner = repoSlug.split("/")[0] || "owner";

      // Create a repository-specific mock analysis
      const repoSpecificAnalysis = {
        ...mockAnalysis,
        repository: {
          name: repoName,
          url: repositoryUrl,
          branch: "main",
          commitSha: "abc123def456",
          analyzedAt: new Date().toISOString(),
        },
        projectSummary: `Mock analysis for ${repoOwner}/${repoName}. This is a simulated IBM Bob 2.0 analysis for development purposes. The actual repository at ${repositoryUrl} would be analyzed by Bob to produce a real architecture map.`,
        modules: [
          {
            id: "entry-point",
            name: "Entry Point",
            path: "src",
            purpose: `Main entry point and application bootstrap for ${repoName}.`,
            files: ["src/index.ts", "src/main.ts", "src/app.tsx"],
            dependencies: ["shared"],
            bobExplanation: "Application entry point that initializes the app and sets up routing.",
          },
          {
            id: "shared",
            name: "Shared Utilities",
            path: "src/shared",
            purpose: "Cross-cutting utilities, types, and helpers used across the application.",
            files: ["src/shared/types.ts", "src/shared/utils.ts", "src/shared/hooks.ts"],
            dependencies: [],
            bobExplanation: "Shared type definitions and utility functions used throughout the codebase.",
          },
          {
            id: "api",
            name: "API Layer",
            path: "src/api",
            purpose: "Backend API routes, handlers, and middleware.",
            files: ["src/api/routes.ts", "src/api/handlers.ts", "src/api/middleware.ts"],
            dependencies: ["shared"],
            bobExplanation: "REST API endpoints and request handling logic.",
          },
          {
            id: "features",
            name: "Feature Modules",
            path: "src/features",
            purpose: "Domain-specific feature implementations.",
            files: ["src/features/dashboard.ts", "src/features/settings.ts"],
            dependencies: ["shared", "api"],
            bobExplanation: "Feature-specific business logic and components.",
          },
          {
            id: "ui",
            name: "UI Components",
            path: "src/components",
            purpose: "Reusable UI components and design system primitives.",
            files: ["src/components/Button.tsx", "src/components/Modal.tsx", "src/components/Form.tsx"],
            dependencies: ["shared"],
            bobExplanation: "Design system components built for reuse across features.",
          },
        ],
        recommendedFiles: [
          {
            path: "src/index.ts",
            reason: "Application entry point - shows how the app boots up and initializes",
            rank: 1,
          },
          {
            path: "src/api/routes.ts",
            reason: "API route definitions - maps all endpoints to their handlers",
            rank: 2,
          },
          {
            path: "src/shared/types.ts",
            reason: "Core domain types - defines the data structures used across the app",
            rank: 3,
          },
        ],
        gotchas: [
          `Mock analysis for ${repoOwner}/${repoName} - this is simulated data, not a real Bob analysis.`,
          "Module structure is generic - real analysis would discover actual module boundaries.",
          "File paths are placeholders - Bob would identify actual key files in the repository.",
        ],
        relationships: [
          { source: "entry-point", target: "shared", type: "imports" },
          { source: "api", target: "shared", type: "imports" },
          { source: "features", target: "shared", type: "imports" },
          { source: "features", target: "api", type: "calls" },
          { source: "ui", target: "shared", type: "imports" },
        ],
      };

      return {
        ...repoSpecificAnalysis,
        trace: { taskId: `mock-${Date.now()}`, model: "mock-provider-v1" },
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
