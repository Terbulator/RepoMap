import type { ReactNode } from "react";
import type {
  RepositoryContext,
  StackContext,
} from "@/features/scope-shield/stack-context";

const BLOCK_TITLES = {
  stack: "Primary tech stack",
  auth: "Auth & middleware architecture",
  directories: "Primary directories & entry points",
} as const;

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 ring-1 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:ring-neutral-700">
      {children}
    </span>
  );
}

function MonoPill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded bg-neutral-100 px-2 py-1 font-mono text-[11px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
      {children}
    </span>
  );
}

function Block({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {title}
      </h3>
      <div className="mt-2 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/**
 * Stage 5 output: the repository context every ScopeShield result is grounded
 * in (PRD 5.1 output consumed by 5.2, FR-7).
 */
export function RepositoryContextView({
  context,
  stack,
  grounding,
}: {
  context: RepositoryContext;
  stack: StackContext;
  grounding: string;
}) {
  const inferred = [
    ...stack.integrations,
    ...stack.data.filter((item) => !context.primaryStack.some((known) => known.startsWith(item))),
  ];

  return (
    <section
      aria-label="Detected repository context"
      className="rounded-lg border border-neutral-300 bg-neutral-50/60 p-5 dark:border-neutral-700 dark:bg-neutral-900/40"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-500">
          Detected Repository Context
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-emerald-500"
          />
          Grounded in Repo Analysis
        </span>
        <span className="text-xs text-neutral-500">
          {context.provenance.source} · {context.provenance.moduleCount} modules ·{" "}
          {context.provenance.analyzedAt.slice(0, 10)}
        </span>
      </div>

      <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">
        <span className="font-medium">{context.repositoryName}</span> — this
        context informs the risk analysis, hidden scope, clarifying questions and
        drafted reply below.
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Block title={BLOCK_TITLES.stack}>
          {context.primaryStack.map((item) => (
            <Pill key={item}>{item}</Pill>
          ))}
        </Block>
        <Block title={BLOCK_TITLES.auth}>
          {context.authArchitecture.map((item) => (
            <Pill key={item}>{item}</Pill>
          ))}
        </Block>
        <Block title={BLOCK_TITLES.directories}>
          {context.directories.map((item) => (
            <MonoPill key={item}>{item}</MonoPill>
          ))}
        </Block>
      </div>

      {inferred.length > 0 ? (
        <div className="mt-5 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
            Implied by this request
          </h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {inferred.map((item) => (
              <Pill key={item}>{item}</Pill>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-5 text-xs text-neutral-500">{grounding}</p>
      <p className="mt-1 text-xs text-neutral-500">{context.provenance.note}</p>
    </section>
  );
}
