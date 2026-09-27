"use client";


import { saveRepoMap } from "@/features/repomap/store";


import { useState, useCallback, FormEvent, Suspense, lazy } from "react";
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

const ArchitectureMap3D = lazy(() => import("./ArchitectureMap3D").then((m) => ({ default: m.ArchitectureMap3D })));

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
  // The details drawer is a full-viewport modal, so it is tracked separately
  // from the map selection: in the 3D city a click only traces connections and
  // the drawer is opened explicitly (double-click), otherwise the modal scrim
  // would hide the connection highlighting it just produced.
  const [detailModuleId, setDetailModuleId] = useState<string | null>(null);

  const openDetails = useCallback((moduleId: string) => {
    setSelectedModuleId(moduleId);
    setDetailModuleId(moduleId);
  }, []);

  // The 2D diagram keeps its original behaviour: one click selects and opens
  // the drawer, and its "clear" affordance deselects without opening anything.
  const selectWithDetails = useCallback(
    (moduleId: string | null) => {
      if (moduleId) openDetails(moduleId);
      else setSelectedModuleId(null);
    },
    [openDetails]
  );

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
    setDetailModuleId(null);
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

            <p className="mt-6 rounded-lg border border-dashed border-neutral-800 bg-neutral-900/40 px-4 py-3 text-sm text-neutral-500">
              No repository analyzed yet. Enter a GitHub repository to generate the architecture map.
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

        {/* Success state — render the dashboard from the real analysis only.
            The idle state must never render placeholder data. */}
        {state.phase === "success" && (
          <>
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

            <ProjectSummary analysis={state.analysis} />

            <Suspense fallback={
              <ReactFlowProvider>
                <ArchitectureDiagram
                  analysis={state.analysis}
                  selectedModuleId={selectedModuleId}
                  onModuleSelect={selectWithDetails}
                />
              </ReactFlowProvider>
            }>
              <ArchitectureMap3D
                modules={state.analysis.modules}
                relationships={state.analysis.relationships}
                selectedModuleId={selectedModuleId}
                onModuleSelect={setSelectedModuleId}
                onModuleDetails={openDetails}
              />
            </Suspense>

            <RecommendedFiles analysis={state.analysis} />

            <ModuleCards
              analysis={state.analysis}
              selectedModuleId={selectedModuleId}
              onModuleSelect={selectWithDetails}
            />

            <Gotchas analysis={state.analysis} />
          </>
        )}
      </main>

      {state.phase === "success" && (
        <ModuleDetailDrawer
          analysis={state.analysis}
          selectedModuleId={detailModuleId}
          onClose={() => setDetailModuleId(null)}
        />
      )}
    </div>
  );
}