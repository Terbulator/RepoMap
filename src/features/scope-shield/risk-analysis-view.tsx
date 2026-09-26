import type { RiskAnalysis, RiskLevel } from "@/features/scope-shield/risk-analysis";

const LEVEL_STYLES: Record<RiskLevel, string> = {
  HIGH: "bg-red-100 text-red-800 ring-1 ring-red-600/20 dark:bg-red-500/15 dark:text-red-300",
  MEDIUM:
    "bg-orange-100 text-orange-800 ring-1 ring-orange-600/20 dark:bg-orange-500/15 dark:text-orange-300",
  LOW: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300",
};

const LEVEL_HINTS: Record<RiskLevel, string> = {
  HIGH: "Expect more than one sprint of work, or a schema change with a rollback path.",
  MEDIUM: "Real work, but contained. Name the boundaries before starting.",
  LOW: "Mostly additive. Still confirm the error paths and the deploy order.",
};

/** Stage 2 output: risk level plus the hidden work per technical layer. */
export function RiskAnalysisView({ analysis }: { analysis: RiskAnalysis }) {
  return (
    <section aria-label="Risk analysis" className="mt-10">
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-500">
          Potential Hidden Scope
        </h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${LEVEL_STYLES[analysis.riskLevel]}`}
        >
          {analysis.riskLevel} RISK
        </span>
      </div>

      <p className="mt-4 max-w-3xl text-sm text-neutral-600 dark:text-neutral-300">
        {analysis.summary}
      </p>
      <p className="mt-1 text-xs text-neutral-500">{LEVEL_HINTS[analysis.riskLevel]}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {analysis.domains.map((domain) => (
          <article
            key={domain.id}
            className="rounded-lg border border-neutral-200 p-5 dark:border-neutral-800"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold">{domain.name}</h3>
              <span className="text-xs text-neutral-500">
                {domain.items.length} item{domain.items.length === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="mt-3 space-y-3">
              {domain.items.map((item) => (
                <li key={item.id}>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                    {item.detail}
                  </p>
                  {item.signal !== "always" ? (
                    <p className="mt-1 text-xs text-neutral-500">
                      Matched &quot;{item.signal}&quot; in the request
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
