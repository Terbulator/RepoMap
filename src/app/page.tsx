import Link from "next/link";

const problems = [
  {
    audience: "New developer",
    pain: "Days lost figuring out what does what and where to start.",
  },
  {
    audience: "Working developer",
    pain: "No visibility into where the real problem is versus where code is over-engineered.",
  },
  {
    audience: "Client-facing developer",
    pain: "Vague feature requests lead to wrong assumptions, scope creep, and disputes.",
  },
  {
    audience: "Before a release",
    pain: "No clear, reasoned signal on whether a change is safe for production.",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <section className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-widest text-neutral-500">
          IBM Bob 2.0 hackathon
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          A shared, living map of any codebase.
        </h1>
        <p className="mt-6 text-lg text-neutral-600 dark:text-neutral-300">
          RepoMap is an AI teammate built on IBM Bob 2.0. It ingests a
          repository, builds a map of its modules and relationships, and then
          uses that same map to onboard new developers, guide debugging, clarify
          vague feature requests before code is written, and check whether a
          change is safe to release.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/dashboard"
            className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Open the dashboard
          </Link>
          <a
            href="https://github.com/Terbulator/RepoMap/blob/main/docs/RepoMap-PRD.txt"
            className="rounded-md border border-neutral-300 px-5 py-2.5 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Read the PRD
          </a>
        </div>
      </section>

      <section className="mt-20">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-500">
          The gap it closes
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {problems.map((problem) => (
            <div
              key={problem.audience}
              className="rounded-lg border border-neutral-200 p-5 dark:border-neutral-800"
            >
              <p className="text-sm font-medium">{problem.audience}</p>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
                {problem.pain}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-500">
          How it works
        </h2>
        <ol className="mt-6 space-y-3 text-sm text-neutral-600 dark:text-neutral-300">
          <li>1. A GitHub repository is ingested by IBM Bob 2.0.</li>
          <li>2. The backend turns that analysis into a repo map.</li>
          <li>3. The dashboard shows the map and the tools built on top of it.</li>
        </ol>
        <p className="mt-6 text-xs text-neutral-500">
          Current build status: project foundation only. The modules below are
          scoped, not built.
        </p>
      </section>
    </div>
  );
}
