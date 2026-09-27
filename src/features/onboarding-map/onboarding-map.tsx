"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { cn } from "@/lib/cn";
import type { RepoMap, RepoMapModule } from "@/features/repomap/schema";
import { analyzeRepositoryClient } from "./api-client";
import { RepoDiagram } from "./diagram";
import { saveRepoMap } from "@/features/repomap/store";

// ─── types ───────────────────────────────────────────────────────────────────

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; code: string; message: string }
  | { phase: "success"; analysis: RepoMap };

// ─── sub-components ──────────────────────────────────────────────────────────

function ProviderBadge({ analysis }: { analysis: RepoMap }) {
  const isMock = analysis.provenance.provider === "mock";
  return (
    <span
      title={analysis.provenance.notice ?? undefined}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        isMock
          ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
          : "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300",
      )}
    >
      {isMock ? "Mock data" : "IBM Bob 2.0"}
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
      {children}
    </h2>
  );
}

function ModuleDetail({ module }: { module: RepoMapModule }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-sm font-semibold">{module.name}</p>
      <p className="mt-0.5 font-mono text-xs text-neutral-500">{module.path}</p>
      <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">{module.purpose}</p>

      {module.files.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-neutral-500">Key files</p>
          <ul className="mt-1.5 space-y-1">
            {module.files.map((f) => (
              <li key={f} className="font-mono text-xs text-neutral-600 dark:text-neutral-400">
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {module.dependencies.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-neutral-500">Depends on</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {module.dependencies.map((d) => (
              <span
                key={d}
                className="rounded border border-neutral-200 bg-white px-2 py-0.5 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-800"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── result view ─────────────────────────────────────────────────────────────

function OnboardingMapResult({ analysis }: { analysis: RepoMap }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedModule: RepoMapModule | null =
    analysis.modules.find((m) => m.id === selectedId) ?? null;

  return (
    <div className="mt-8 space-y-10">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{analysis.repository.name}</h1>
          <p className="mt-0.5 font-mono text-xs text-neutral-500">{analysis.repository.url}</p>
        </div>
        <div className="flex items-center gap-3">
          <ProviderBadge analysis={analysis} />
          <span className="text-xs text-neutral-400">
            {new Date(analysis.provenance.generatedAt).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Project summary */}
      <section aria-labelledby="summary-heading">
        <SectionHeading>
          <span id="summary-heading">Project summary</span>
        </SectionHeading>
        <p className="mt-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {analysis.projectSummary}
        </p>
      </section>

      {/* Technology stack */}
      {analysis.stack.length > 0 && (
        <section aria-labelledby="stack-heading">
          <SectionHeading>
            <span id="stack-heading">Technology stack</span>
          </SectionHeading>
          <div className="mt-3 flex flex-wrap gap-2">
            {analysis.stack.map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium dark:border-neutral-700 dark:bg-neutral-900"
              >
                {tech}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Diagram + module detail */}
      <section aria-labelledby="diagram-heading">
        <SectionHeading>
          <span id="diagram-heading">Module relationship diagram</span>
        </SectionHeading>
        <p className="mt-1 text-xs text-neutral-500">
          Click a module to see its details.
        </p>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Diagram */}
          <div
            className="h-80 rounded-lg border border-neutral-200 dark:border-neutral-700"
            style={{ minHeight: 280 }}
          >
            <RepoDiagram
              modules={analysis.modules}
              relationships={analysis.relationships}
              selectedModuleId={selectedId}
              onSelectModule={setSelectedId}
            />
          </div>

          {/* Module detail panel */}
          <div>
            {selectedModule ? (
              <ModuleDetail module={selectedModule} />
            ) : (
              <div className="flex h-full min-h-[160px] items-center justify-center rounded-lg border border-dashed border-neutral-200 p-6 text-center dark:border-neutral-700">
                <p className="text-sm text-neutral-400">
                  Select a module in the diagram to see its explanation.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Module list as fallback / supplement */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {analysis.modules.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedId(m.id)}
              className={cn(
                "rounded-lg border px-4 py-3 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900",
                m.id === selectedId
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                  : "border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:border-neutral-500 dark:hover:bg-neutral-800",
              )}
            >
              <span className="font-medium">{m.name}</span>
              <span className="ml-2 font-mono text-xs opacity-60">{m.path}</span>
              <p
                className={cn(
                  "mt-1.5 text-xs line-clamp-2",
                  m.id === selectedId ? "text-neutral-200 dark:text-neutral-600" : "text-neutral-500",
                )}
              >
                {m.purpose}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Recommended starting files */}
      <section aria-labelledby="files-heading">
        <SectionHeading>
          <span id="files-heading">Where to start reading</span>
        </SectionHeading>
        <p className="mt-1 text-xs text-neutral-500">
          Ranked 1–{analysis.recommendedFiles.length} by IBM Bob 2.0.
        </p>
        <ol className="mt-4 space-y-3">
          {analysis.recommendedFiles
            .slice()
            .sort((a, b) => a.rank - b.rank)
            .map((file) => (
              <li key={file.path} className="flex gap-4">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-neutral-200 text-xs font-semibold text-neutral-500 dark:border-neutral-700">
                  {file.rank}
                </span>
                <div>
                  <p className="font-mono text-sm font-medium">{file.path}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{file.reason}</p>
                </div>
              </li>
            ))}
        </ol>
      </section>

      {/* Gotchas */}
      {analysis.gotchas.length > 0 && (
        <section aria-labelledby="gotchas-heading">
          <SectionHeading>
            <span id="gotchas-heading">Common gotchas</span>
          </SectionHeading>
          <ul className="mt-4 space-y-2">
            {analysis.gotchas.map((gotcha, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950"
              >
                <span className="mt-0.5 flex-shrink-0 text-amber-500" aria-hidden="true">
                  ⚠
                </span>
                <span className="text-amber-900 dark:text-amber-200">{gotcha}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

/**
 * OnboardingMap (PRD §5.1, Tier 1, M2).
 *
 * Renders the repository input form, calls POST /api/repository/analyze, then
 * displays the full Onboarding Map: summary, stack, module diagram, recommended
 * starting files, and gotchas. All data comes from the RepoMap contract — no
 * frontend-invented relationships.
 */
export function OnboardingMap() {
  const [repo, setRepo] = useState("");
  const [state, setState] = useState<State>({ phase: "idle" });

  const isLoading = state.phase === "loading";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = repo.trim();
    if (!trimmed) return;

    setState({ phase: "loading" });

    const result = await analyzeRepositoryClient(trimmed);
    if (result.ok) {
      // Hand the real analysis to ScopeShield: it is the only repository
      // context ScopeShield is allowed to reason about.
      saveRepoMap(result.analysis);
      setState({ phase: "success", analysis: result.analysis });
    } else {
      setState({ phase: "error", code: result.code, message: result.message });
    }
  }

  function handleReset() {
    setState({ phase: "idle" });
    setRepo("");
  }

  return (
    <div>
      {/* Input form — always shown unless we have a success result */}
      {state.phase !== "success" && (
        <section aria-labelledby="onboarding-heading" className="max-w-2xl">
          <h1 id="onboarding-heading" className="text-2xl font-semibold tracking-tight">
            Onboarding Map
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
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
              className="flex-1 rounded-md border border-neutral-300 bg-transparent px-4 py-2.5 text-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:focus:ring-white"
            />
            <button
              type="submit"
              disabled={!repo.trim() || isLoading}
              className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
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
        <div
          role="status"
          aria-live="polite"
          className="mt-10 flex flex-col items-center gap-4 py-16 text-center"
        >
          <span
            aria-hidden="true"
            className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900 dark:border-neutral-700 dark:border-t-white"
          />
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            IBM Bob 2.0 is reading the repository and building the map…
          </p>
          <p className="text-xs text-neutral-400">This can take several minutes.</p>
        </div>
      )}

      {/* Error state */}
      {state.phase === "error" && (
        <div
          role="alert"
          className="mt-8 max-w-2xl rounded-lg border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-950"
        >
          <p className="text-sm font-medium text-red-800 dark:text-red-300">Analysis failed</p>
          <p className="mt-1.5 text-sm text-red-700 dark:text-red-400">{state.message}</p>
          <p className="mt-1 font-mono text-xs text-red-500">code: {state.code}</p>
          <button
            type="button"
            onClick={handleReset}
            className="mt-4 rounded-md border border-red-300 px-4 py-2 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900"
          >
            Try again
          </button>
        </div>
      )}

      {/* Success state */}
      {state.phase === "success" && (
        <>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              ← Analyze another repository
            </button>
          </div>
          <OnboardingMapResult analysis={state.analysis} />
        </>
      )}
    </div>
  );
}
