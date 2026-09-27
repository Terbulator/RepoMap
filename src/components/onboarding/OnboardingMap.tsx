"use client";

import { saveRepoMap } from "@/features/repomap/store";
import { useState, FormEvent } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { RepoMapAnalysis } from "@/types/onboarding";
import { ProjectSummary } from "./ProjectSummary";
import { ArchitectureDiagram } from "./ArchitectureDiagram";
import { ModuleCards } from "./ModuleCards";
import { RecommendedFiles } from "./RecommendedFiles";
import { Gotchas } from "./Gotchas";
import { ModuleDetailDrawer } from "./ModuleDetailDrawer";
import { analyzeRepositoryClient } from "@/features/onboarding-map/api-client";
import { parseRepositoryRef, InvalidRepositoryError } from "@/lib/repository-url";
import type { RepoMap } from "@/features/repomap/schema";

const mockAnalysis: RepoMapAnalysis = {
  projectSummary: "RepoMap is a developer onboarding and code intelligence tool that transforms any GitHub repository into an interactive, living map. It uses IBM Bob 2.0 to analyze the full repository context and generates a visual architecture diagram, plain-English module breakdowns, ranked starter files, and common gotchas — helping new developers become productive in unfamiliar codebases within minutes instead of days.",
  stack: [
    "Next.js 16 (App Router)",
    "React 19",
    "TypeScript 5",
    "Tailwind CSS 4",
    "React Flow (@xyflow/react)",
    "IBM Bob 2.0 SDK"
  ],
  modules: [
    {
      id: "repo-ingestion",
      name: "Repository Ingestion",
      path: "src/server/bob",
      purpose: "Handles cloning and ingesting target repositories into Bob 2.0's context. Provides workspace management, file filtering, and session orchestration for Bob's analysis tasks.",
      files: [
        "src/server/bob/workspace.ts",
        "src/server/bob/cli-provider.ts",
        "src/server/bob/mock-provider.ts",
        "src/server/bob/provider.ts"
      ],
      dependencies: [
        "IBM Bob 2.0 SDK",
        "Node.js fs/promises",
        "simple-git"
      ]
    },
    {
      id: "repo-analysis",
      name: "Repository Analysis",
      path: "src/server/repomap",
      purpose: "Orchestrates Bob 2.0 to perform full-repository analysis. Generates the structured RepoMap output including project summary, module breakdown, file relationships, and gotchas.",
      files: [
        "src/server/repomap/analyze-repository.ts"
      ],
      dependencies: [
        "Repository Ingestion",
        "IBM Bob 2.0 SDK",
        "Zod (schema validation)"
      ]
    },
    {
      id: "onboarding-map",
      name: "Onboarding Map (Frontend)",
      path: "src/components/onboarding",
      purpose: "Renders the interactive onboarding dashboard: architecture graph, module cards, recommended files, gotchas, and module detail drawer. Consumes the RepoMap analysis contract and presents it as a polished developer tool.",
      files: [
        "src/components/onboarding/OnboardingMap.tsx",
        "src/components/onboarding/ArchitectureDiagram.tsx",
        "src/components/onboarding/ModuleCards.tsx",
        "src/components/onboarding/RecommendedFiles.tsx",
        "src/components/onboarding/Gotchas.tsx",
        "src/components/onboarding/ModuleDetailDrawer.tsx",
        "src/components/onboarding/ProjectSummary.tsx"
      ],
      dependencies: [
        "React Flow (@xyflow/react)",
        "lucide-react",
        "Tailwind CSS",
        "RepoMap Analysis Types"
      ]
    },
    {
      id: "scope-shield",
      name: "ScopeShield (Scope Clarifier)",
      path: "src/features/scope-shield",
      purpose: "Accepts free-text feature requests and returns risk analysis, clarifying questions, and a drafted professional reply — all grounded in the repository's actual stack and architecture from the Onboarding Map analysis.",
      files: [
        "src/features/scope-shield/scope-shield.tsx",
        "src/features/scope-shield/risk-analysis.ts",
        "src/features/scope-shield/clarifying-questions.ts",
        "src/features/scope-shield/drafted-reply.ts",
        "src/features/scope-shield/feature-request.ts",
        "src/features/scope-shield/keyword-match.ts",
        "src/features/scope-shield/stack-context.ts",
        "src/features/scope-shield/repository-context.ts"
      ],
      dependencies: [
        "Onboarding Map (for repo context)",
        "IBM Bob 2.0 SDK",
        "Zod (schema validation)"
      ]
    },
    {
      id: "api-routes",
      name: "API Routes",
      path: "src/app/api",
      purpose: "Thin backend layer that exposes Bob 2.0 capabilities via Next.js API routes. Handles repository ingestion, analysis triggering, and ScopeShield requests.",
      files: [
        "src/app/api/health/route.ts",
        "src/app/api/repomap/route.ts",
        "src/app/api/repository/analyze/route.ts",
        "src/app/api/onboarding/route.ts"
      ],
      dependencies: [
        "Next.js 16 App Router",
        "Repository Ingestion",
        "Repository Analysis",
        "ScopeShield"
      ]
    },
    {
      id: "shared-types",
      name: "Shared Types & Schemas",
      path: "src/types / src/features/repomap",
      purpose: "Defines the canonical RepoMap analysis contract (projectSummary, stack, modules, recommendedFiles, gotchas, relationships) and Zod schemas for validation. Shared between backend (Bob output parsing) and frontend (UI consumption).",
      files: [
        "src/types/onboarding.ts",
        "src/features/repomap/schema.ts",
        "src/features/repomap/normalize.ts",
        "src/features/repomap/request.ts"
      ],
      dependencies: [
        "Zod",
        "TypeScript"
      ]
    }
  ],
  recommendedFiles: [
    {
      path: "src/components/onboarding/OnboardingMap.tsx",
      reason: "Main entry point for the Onboarding Map dashboard. Composes all sections (architecture graph, module breakdown, recommended files, gotchas) and manages module selection state.",
      rank: 1
    },
    {
      path: "src/components/onboarding/ArchitectureDiagram.tsx",
      reason: "Core visualization component using React Flow. Renders modules as nodes and relationships as edges with zoom/pan/fit controls. Click handlers drive the module detail drawer.",
      rank: 2
    },
    {
      path: "src/server/repomap/analyze-repository.ts",
      reason: "Orchestrates Bob 2.0 to produce the full RepoMap analysis. Understanding this shows how the analysis contract is generated from raw repository content.",
      rank: 3
    }
  ],
  gotchas: [
    "The architecture graph derives nodes from modules[] and edges from relationships[] — both must be present and consistent for the diagram to render correctly.",
    "Module IDs in relationships must exactly match module IDs in modules[] array, otherwise edges will not connect to visible nodes.",
    "Bob 2.0 analysis output is non-deterministic; the normalize.ts pipeline validates and coerces output into the strict RepoMap contract before the UI consumes it.",
    "React Flow requires explicit width/height on its container; the ArchitectureDiagram uses a resize observer to fill its parent card responsively.",
    "The mock analysis fixture (src/data/mock-analysis.json) is used for development and demo; production data comes from the /api/onboarding endpoint after Bob completes analysis.",
    "ScopeShield depends on the Onboarding Map's analysis output — if no repository has been analyzed, ScopeShield falls back to generic stack-agnostic responses."
  ],
  relationships: [
    { source: "repo-ingestion", target: "repo-analysis", type: "provides-context" },
    { source: "repo-analysis", target: "shared-types", type: "produces-contract" },
    { source: "shared-types", target: "onboarding-map", type: "consumes-contract" },
    { source: "shared-types", target: "scope-shield", type: "consumes-contract" },
    { source: "onboarding-map", target: "api-routes", type: "fetches-from" },
    { source: "scope-shield", target: "api-routes", type: "fetches-from" },
    { source: "api-routes", target: "repo-ingestion", type: "calls" },
    { source: "api-routes", target: "repo-analysis", type: "calls" }
  ]
};

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; code: string; message: string }
  | { phase: "success"; analysis: RepoMapAnalysis; repoUrl: string };

function convertRepoMapToAnalysis(repoMap: RepoMap): RepoMapAnalysis {
  return {
    projectSummary: repoMap.projectSummary,
    stack: repoMap.stack,
    modules: repoMap.modules.map((m) => ({
      id: m.id,
      name: m.name,
      path: m.path,
      purpose: m.purpose,
      files: m.files,
      dependencies: m.dependencies,
    })),
    recommendedFiles: repoMap.recommendedFiles,
    gotchas: repoMap.gotchas,
    relationships: repoMap.relationships,
    provenance: repoMap.provenance,
  };
}

export function OnboardingMap() {
  const [repo, setRepo] = useState("");
  const [state, setState] = useState<State>({ phase: "idle" });
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  const isLoading = state.phase === "loading";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = repo.trim();
    if (!trimmed) return;

    // Validate repository URL using existing utility
    try {
      parseRepositoryRef(trimmed);
    } catch (error) {
      if (error instanceof InvalidRepositoryError) {
        setState({ phase: "error", code: "INVALID_REPOSITORY", message: error.message });
        return;
      }
      setState({ phase: "error", code: "INVALID_REPOSITORY", message: "Invalid repository input." });
      return;
    }

    setState({ phase: "loading" });

    const result = await analyzeRepositoryClient(trimmed);
    if (result.ok) {
      saveRepoMap(result.analysis);
      const analysis = convertRepoMapToAnalysis(result.analysis);
      setState({ phase: "success", analysis, repoUrl: result.analysis.repository.url });
    } else {
      setState({ phase: "error", code: result.code, message: result.message });
    }
  }

  function handleReset() {
    setState({ phase: "idle" });
    setRepo("");
    setSelectedModuleId(null);
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <style jsx global>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.2s ease-out;
        }
      `}</style>

<header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 012-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">RepoMap</h1>
              <p className="text-xs text-neutral-400">Onboarding Map</p>
            </div>
          </div>
          {state.phase === "success" && state.analysis.provenance && (
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  state.analysis.provenance.provider === "mock"
                    ? "bg-amber-500/20 border border-amber-500/30 text-amber-400"
                    : "bg-green-500/20 border border-green-500/30 text-green-400"
                }`}
              >
                {state.analysis.provenance.provider === "mock"
                  ? "Mock Analysis (Demo)"
                  : "IBM Bob 2.0 Analysis"}
              </span>
              {state.analysis.provenance.notice && (
                <span className="px-2 py-1 text-xs text-neutral-500 bg-neutral-800 rounded">
                  {state.analysis.provenance.notice}
                </span>
              )}
            </div>
          )}
          {state.phase !== "success" && (
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-500/20 border border-primary-500/30 text-primary-400">
              Mock Analysis
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Input form — shown in idle and error states */}
        {state.phase === "idle" && (
          <section aria-labelledby="onboarding-heading" className="max-w-3xl mx-auto">
            <h1 id="onboarding-heading" className="text-2xl font-semibold tracking-tight text-white">
              Onboarding Map
            </h1>
            <p className="mt-2 text-sm text-neutral-400">
              Enter a GitHub repository and IBM Bob 2.0 will generate a plain-English map: project
              summary, module breakdown, recommended starting files, and a relationship diagram.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start">
              <label htmlFor="repository-input" className="sr-only">
                GitHub repository URL or owner/repo
              </label>
              <input
                id="repository-input"
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="https://github.com/owner/repo  or  owner/repo"
                disabled={isLoading}
                className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm placeholder:text-neutral-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!repo.trim() || isLoading}
                className="rounded-md bg-primary-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
              >
                {isLoading ? "Analyzing…" : "Analyze"}
              </button>
            </form>

            <p className="mt-3 text-xs text-neutral-500">
              Only public GitHub repositories are supported. Analysis may take up to 15 minutes when
              IBM Bob 2.0 is active.
            </p>
          </section>
        )}

        {/* Loading state */}
        {state.phase === "loading" && (
          <section className="max-w-3xl mx-auto" role="status" aria-live="polite">
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <span
                aria-hidden="true"
                className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-primary-500"
              />
              <p className="text-sm text-neutral-400">
                IBM Bob 2.0 is reading the repository and building the map…
              </p>
              <p className="text-xs text-neutral-500">This can take several minutes.</p>
            </div>
          </section>
        )}

        {/* Error state */}
        {state.phase === "error" && (
          <section className="max-w-3xl mx-auto" role="alert">
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-5">
              <p className="text-sm font-medium text-red-400">Analysis failed</p>
              <p className="mt-1.5 text-sm text-red-300">{state.message}</p>
              <p className="mt-1 font-mono text-xs text-red-500">code: {state.code}</p>
              <button
                type="button"
                onClick={handleReset}
                className="mt-4 rounded-md border border-red-500/30 px-4 py-2 text-xs font-medium text-red-300 hover:bg-red-500/10 transition-colors"
              >
                Try again
              </button>
            </div>
          </section>
        )}

        {/* Success state — render the full dashboard */}
        {(state.phase === "success" || state.phase === "idle") && (
          <>
{state.phase === "success" && (
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-neutral-500">{state.repoUrl}</span>
                  {state.analysis.provenance && (
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        state.analysis.provenance.provider === "mock"
                          ? "bg-amber-500/20 border border-amber-500/30 text-amber-400"
                          : "bg-green-500/20 border border-green-500/30 text-green-400"
                      }`}
                    >
                      {state.analysis.provenance.provider === "mock"
                        ? "Mock (Demo)"
                        : "IBM Bob 2.0"}
                      </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-neutral-500 underline underline-offset-2 hover:text-primary-400 transition-colors"
                >
                  ← Analyze another repository
                </button>
              </div>
            )}

            <ProjectSummary analysis={state.phase === "success" ? state.analysis : mockAnalysis} />

            <ReactFlowProvider>
              <ArchitectureDiagram
                analysis={state.phase === "success" ? state.analysis : mockAnalysis}
                selectedModuleId={selectedModuleId}
                onModuleSelect={setSelectedModuleId}
              />
            </ReactFlowProvider>

            <RecommendedFiles analysis={state.phase === "success" ? state.analysis : mockAnalysis} />

            <ModuleCards
              analysis={state.phase === "success" ? state.analysis : mockAnalysis}
              selectedModuleId={selectedModuleId}
              onModuleSelect={setSelectedModuleId}
            />

            <Gotchas analysis={state.phase === "success" ? state.analysis : mockAnalysis} />
          </>
        )}
      </main>

      <ModuleDetailDrawer
        analysis={state.phase === "success" ? state.analysis : mockAnalysis}
        selectedModuleId={selectedModuleId}
        onClose={() => setSelectedModuleId(null)}
      />
    </div>
  );
}