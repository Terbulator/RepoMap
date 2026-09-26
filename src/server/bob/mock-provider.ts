import type { BobProvider, RepositoryAnalysis } from "./provider.ts";
import mockAnalysis from "@/data/mock-analysis.json";

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
  };
}
