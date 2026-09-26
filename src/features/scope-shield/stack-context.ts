/**
 * Stack context for the drafted reply (PRD FR-7: ground the reply in the
 * repository's actual stack).
 *
 * MOCK detection. It starts from a plausible project profile and adds the
 * technologies the request implies. Stage 5 replaces this with the real stack
 * that the Section 5.1 repo-map analysis already produces server-side.
 */

import { matchesAny } from "./keyword-match.ts";

export type StackContext = {
  languages: string[];
  frameworks: string[];
  data: string[];
  integrations: string[];
};

/** What the demo repository is assumed to be built on. */
const BASE_STACK: StackContext = {
  languages: ["TypeScript"],
  frameworks: ["React", "Next.js", "Node.js"],
  data: ["PostgreSQL"],
  integrations: [],
};

const STACK_SIGNALS: Array<{
  keywords: string[];
  add: Partial<StackContext>;
}> = [
  {
    keywords: ["payment", "pay", "stripe", "checkout", "billing", "subscription", "invoice"],
    add: { integrations: ["Stripe"] },
  },
  {
    keywords: ["sms", "twilio", "notification", "notify", "email", "reminder"],
    add: { integrations: ["Twilio", "Transactional email"] },
  },
  {
    keywords: ["upload", "file", "attachment", "image", "document", "pdf"],
    add: { integrations: ["Object storage"] },
  },
  {
    keywords: ["search", "filter", "query"],
    add: { data: ["Full-text search index"] },
  },
  {
    keywords: ["report", "analytics", "chart", "dashboard metric", "export"],
    add: { data: ["Reporting views"] },
  },
  {
    keywords: ["realtime", "live update", "websocket", "collaborate"],
    add: { integrations: ["Realtime transport"] },
  },
  {
    keywords: ["llm", "model", "openai", "ai model", "summar"],
    add: { integrations: ["Model provider"] },
  },
];

function addUnique(target: string[], values: string[] | undefined) {
  if (!values) return;
  for (const value of values) {
    if (!target.includes(value)) target.push(value);
  }
}

/**
 * Builds the mock stack context for a request.
 *
 * Deterministic: same request, same stack.
 */
export function detectStackContext(request: string): StackContext {
  const text = request.toLowerCase();
  const stack: StackContext = {
    languages: [...BASE_STACK.languages],
    frameworks: [...BASE_STACK.frameworks],
    data: [...BASE_STACK.data],
    integrations: [...BASE_STACK.integrations],
  };

  for (const signal of STACK_SIGNALS) {
    if (!matchesAny(signal.keywords, text)) continue;
    addUnique(stack.languages, signal.add.languages);
    addUnique(stack.frameworks, signal.add.frameworks);
    addUnique(stack.data, signal.add.data);
    addUnique(stack.integrations, signal.add.integrations);
  }

  return stack;
}

/** Single-line stack summary for the drafted reply, e.g. "React, PostgreSQL, Stripe". */
export function formatStack(stack: StackContext): string {
  return [...stack.languages, ...stack.frameworks, ...stack.data, ...stack.integrations].join(
    ", ",
  );
}

/**
 * The repository ScopeShield is reasoning about (PRD 5.1 output consumed by
 * ScopeShield, FR-7).
 *
 * MOCK data shaped like a RepoMap contract: repository, stack, auth
 * architecture, directories and provenance. Stage 5 replaces this with the real
 * `/api/repomap` response, which already carries stack, modules and entryPoints.
 */
export type RepositoryContext = {
  repositoryName: string;
  primaryStack: string[];
  authArchitecture: string[];
  directories: string[];
  provenance: {
    source: string;
    analyzedAt: string;
    moduleCount: number;
    note: string;
  };
};

const REPOSITORY_CONTEXT: RepositoryContext = {
  repositoryName: "RepoMap Demo Repository",
  primaryStack: [
    "React 19",
    "Next.js 16",
    "Node.js 20",
    "PostgreSQL 16",
    "Prisma 6",
    "Tailwind CSS",
  ],
  authArchitecture: [
    "JWT authentication",
    "Route guard middleware",
    "Token refresh flow",
    "Role-based access checks",
  ],
  directories: [
    "/src/app",
    "/src/components",
    "/src/api",
    "/server/routes",
    "/src/lib",
  ],
  provenance: {
    source: "Repo map analysis (mock)",
    analyzedAt: "2026-09-26T00:00:00Z",
    moduleCount: 5,
    note: "Static demo data. No repository was analysed and no AI was consulted.",
  },
};

export function getRepositoryContext(): RepositoryContext {
  return REPOSITORY_CONTEXT;
}

/**
 * The line that ties an output back to the repository it was derived from,
 * e.g. "Grounded in Repo Analysis — RepoMap Demo Repository (React 19, Next.js
 * 16, Node.js 20), plus Stripe."
 */
export function formatGroundingNote(
  context: RepositoryContext,
  stack: StackContext,
): string {
  const base = context.primaryStack.slice(0, 3).join(", ");
  const inferred = stack.integrations.length
    ? `, plus ${stack.integrations.join(", ")}`
    : "";

  return `Grounded in Repo Analysis — ${context.repositoryName} (${base}${inferred}).`;
}
