"use client";

import { useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { RepoMapAnalysis } from "@/types/onboarding";
import { ProjectSummary } from "./ProjectSummary";
import { ArchitectureDiagram } from "./ArchitectureDiagram";
import { ModuleCards } from "./ModuleCards";
import { RecommendedFiles } from "./RecommendedFiles";
import { Gotchas } from "./Gotchas";
import { ModuleDetailDrawer } from "./ModuleDetailDrawer";

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

export function OnboardingMap() {
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">RepoMap</h1>
              <p className="text-xs text-neutral-400">Onboarding Map</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-500/20 border border-primary-500/30 text-primary-400">
            Mock Analysis
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        <ProjectSummary analysis={mockAnalysis} />

        <ReactFlowProvider>
          <ArchitectureDiagram
            analysis={mockAnalysis}
            selectedModuleId={selectedModuleId}
            onModuleSelect={setSelectedModuleId}
          />
        </ReactFlowProvider>

        <RecommendedFiles analysis={mockAnalysis} />

        <ModuleCards
          analysis={mockAnalysis}
          selectedModuleId={selectedModuleId}
          onModuleSelect={setSelectedModuleId}
        />

        <Gotchas analysis={mockAnalysis} />
      </main>

      <ModuleDetailDrawer
        analysis={mockAnalysis}
        selectedModuleId={selectedModuleId}
        onClose={() => setSelectedModuleId(null)}
      />
    </div>
  );
}