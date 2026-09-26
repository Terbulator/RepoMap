import type {
  DomainId,
  DomainRisk,
  RiskAnalysis,
  RiskItem,
  RiskLevel,
} from "@/features/scope-shield/risk-analysis";

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

/** Layer badge colours, so each card is identifiable at a glance. */
const DOMAIN_STYLES: Record<DomainId, string> = {
  frontend: "bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300",
  backend: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  database:
    "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  infrastructure:
    "bg-slate-200 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300",
  security: "bg-amber-200 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
};

const SOURCE_LABELS = {
  preset: "Known pattern",
  trigger: "Matched request",
  baseline: "Always unspoken",
} as const;

/** Stage 2 output: risk level plus the hidden work per technical layer. */
export function RiskAnalysisView({ analysis }: { analysis: RiskAnalysis }) {
  return (
    <div className="mt-10">
      <section aria-label="Risk analysis">
        <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-800">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-500">
            Risk Analysis
          </h2>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${LEVEL_STYLES[analysis.riskLevel]}`}
          >
            {analysis.riskLevel} RISK
          </span>
          <span className="text-xs text-neutral-500">
            {analysis.totalItems} hidden items
          </span>
        </div>

        <p className="mt-4 max-w-3xl text-sm text-neutral-600 dark:text-neutral-300">
          {analysis.summary}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          {LEVEL_HINTS[analysis.riskLevel]}
        </p>
      </section>

      <section aria-label="Hidden scope and unspoken requirements" className="mt-8">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-300">
            Hidden Scope &amp; Unspoken Requirements
          </h2>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300">
            Not in the request
          </span>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-neutral-600 dark:text-neutral-300">
          Work a team usually discovers mid-build. Each item is grouped by the
          architectural layer it lands in.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {analysis.domains.map((domain) => (
            <DomainCard key={domain.id} domain={domain} />
          ))}
        </div>
      </section>
    </div>
  );
}

function DomainCard({ domain }: { domain: DomainRisk }) {
  return (
    <article
      className="rounded-lg border border-amber-300/70 border-l-4 border-l-amber-400 bg-amber-50/50 p-5 dark:border-amber-500/25 dark:border-l-amber-400 dark:bg-amber-500/5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`rounded px-2 py-0.5 text-xs font-semibold ${DOMAIN_STYLES[domain.id]}`}
        >
          {domain.name}
        </span>
        <span className="text-xs text-neutral-500">
          {domain.items.length} unspoken item
          {domain.items.length === 1 ? "" : "s"}
        </span>
      </div>

      <ul className="mt-4 space-y-4">
        {domain.items.map((item) => (
          <HiddenScopeItem key={item.id} item={item} />
        ))}
      </ul>
    </article>
  );
}

function HiddenScopeItem({ item }: { item: RiskItem }) {
  return (
    <li className="border-t border-amber-300/50 pt-3 first:border-t-0 first:pt-0 dark:border-amber-500/20">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium">{item.title}</p>
        <span className="rounded bg-amber-200/70 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
          {SOURCE_LABELS[item.source]}
        </span>
      </div>
      <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
        {item.detail}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {item.tags.map((tag) => (
          <span
            key={tag}
            className="rounded border border-neutral-300 px-1.5 py-0.5 text-[11px] text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
          >
            {tag}
          </span>
        ))}
      </div>
      {item.signal !== "always" ? (
        <p className="mt-1.5 text-[11px] text-neutral-500">
          From &quot;{item.signal}&quot; in the request
        </p>
      ) : null}
    </li>
  );
}
