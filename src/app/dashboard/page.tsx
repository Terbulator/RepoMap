import { productModules } from "@/features/registry";

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">RepoMap</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
            No repository analysed yet. Submitting a repository and running
            IBM Bob 2.0 analysis is not implemented in this build.
          </p>
        </div>
        <span className="rounded-full border border-neutral-300 px-3 py-1 text-xs text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
          Foundation build
        </span>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav aria-label="RepoMap modules" className="space-y-2">
          {productModules.map((module) => (
            <div
              key={module.id}
              aria-disabled
              className="rounded-md border border-neutral-200 p-3 opacity-70 dark:border-neutral-800"
            >
              <p className="text-sm font-medium">{module.name}</p>
              <p className="mt-1 text-xs text-neutral-500">
                PRD {module.prdSection} · Tier {module.tier} · Not implemented
              </p>
            </div>
          ))}
        </nav>

        <section
          aria-label="Repository map"
          className="flex min-h-[420px] flex-col rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700"
        >
          <div className="border-b border-dashed border-neutral-300 px-5 py-4 dark:border-neutral-700">
            <h2 className="text-sm font-medium">Repository map</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Reserved for the module/file relationship diagram (PRD 5.1,
              FR-4). The diagram renders once repository analysis exists.
            </p>
          </div>
          <div className="flex flex-1 items-center justify-center p-8 text-center">
            <p className="max-w-sm text-sm text-neutral-500">
              Empty dashboard shell. The onboarding map, ScopeShield, debug
              overlay, and release readiness views are intentionally not built
              yet.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
