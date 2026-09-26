/**
 * Stack context for the drafted reply (PRD FR-7: ground the reply in the
 * repository's actual stack).
 *
 * `StackContext` and the mock `detectStackContext` remain for the mock provider
 * and its tests. A real run's stack comes from IBM Bob instead (see
 * provider-schema.ts), so nothing in the production path calls this.
 */

import type { RepoMap } from "../repomap/schema.ts";
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
 * Derives a StackContext seed from a RepositoryContext's primaryStack list.
 *
 * The primary stack is a flat list of strings like ["TypeScript", "React 19",
 * "PostgreSQL 16"]. We assign each to a category by simple name matching so
 * the drafted reply and grounding note reflect the real repository.
 */
export function stackContextFromPrimaryStack(primaryStack: string[]): StackContext {
  const LANGUAGE_NAMES = ["typescript", "javascript", "python", "go", "rust", "java", "ruby", "php", "c#", "swift", "kotlin", "scala"];
  const DATA_NAMES = ["postgresql", "mysql", "sqlite", "mongodb", "redis", "elasticsearch", "prisma", "drizzle", "supabase", "dynamo"];
  const INTEGRATION_NAMES = ["stripe", "twilio", "s3", "openai", "github", "slack", "sendgrid", "resend", "cloudinary", "pusher"];

  const seed: StackContext = { languages: [], frameworks: [], data: [], integrations: [] };

  for (const item of primaryStack) {
    const lower = item.toLowerCase();
    if (LANGUAGE_NAMES.some((l) => lower.startsWith(l))) {
      addUnique(seed.languages, [item]);
    } else if (DATA_NAMES.some((d) => lower.startsWith(d))) {
      addUnique(seed.data, [item]);
    } else if (INTEGRATION_NAMES.some((i) => lower.startsWith(i))) {
      addUnique(seed.integrations, [item]);
    } else {
      addUnique(seed.frameworks, [item]);
    }
  }

  return seed;
}

/**
 * Builds the stack context for a request.
 *
 * Starts from `base` when provided (real repository stack), otherwise falls
 * back to BASE_STACK. Deterministic: same request and same base produce the
 * same result.
 */
export function detectStackContext(request: string, base?: StackContext): StackContext {
  const text = request.toLowerCase();
  const seed = base ?? BASE_STACK;
  const stack: StackContext = {
    languages: [...seed.languages],
    frameworks: [...seed.frameworks],
    data: [...seed.data],
    integrations: [...seed.integrations],
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

/** Storage key under which the last successful /api/repository/analyze result is kept. */
export const REPOMAP_STORAGE_KEY = "repoMapAnalysis";

/** True in the browser, false while server-rendering. */
function canUseLocalStorage(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

/**
 * Persists a completed RepoMap so ScopeShield can ground its outputs in the
 * real repository stack without a second server call.
 */
export function saveRepoMap(repoMap: RepoMap): void {
  if (canUseLocalStorage()) {
    window.localStorage.setItem(REPOMAP_STORAGE_KEY, JSON.stringify(repoMap));
  }
}

/**
 * Returns the last stored RepoMap, or null when nothing has been stored yet or
 * the stored value cannot be parsed.
 */
export function readStoredRepoMap(): RepoMap | null {
  if (!canUseLocalStorage()) return null;
  const raw = window.localStorage.getItem(REPOMAP_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RepoMap;
  } catch {
    return null;
  }
}

/**
 * The repository ScopeShield is reasoning about (PRD 5.1 output consumed by
 * ScopeShield, FR-7).
 *
 * Shaped like a RepoMap contract: repository, stack, auth architecture,
 * directories and provenance. When a real RepoMap is available (stored after a
 * successful analysis call) use `repositoryContextFromRepoMap` to derive this
 * from actual data instead of the static fallback below.
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

const FALLBACK_REPOSITORY_CONTEXT: RepositoryContext = {
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

/**
 * Derives a RepositoryContext from a real RepoMap (PRD FR-7).
 *
 * Auth architecture is inferred from the stack and module names: when the stack
 * contains a known auth technology or a module is named "auth"/"middleware"/
 * "security", the relevant line is included. Directories come from module paths.
 */
export function repositoryContextFromRepoMap(repoMap: RepoMap): RepositoryContext {
  const moduleNames = repoMap.modules.map((m) => m.name.toLowerCase());
  const modulePaths = repoMap.modules.map((m) =>
    m.path.startsWith("/") ? m.path : `/${m.path}`,
  );
  const stackLower = repoMap.stack.map((s) => s.toLowerCase());

  const authArchitecture: string[] = [];
  if (
    stackLower.some((s) => s.includes("jwt") || s.includes("next-auth") || s.includes("passport")) ||
    moduleNames.some((n) => n.includes("auth"))
  ) {
    authArchitecture.push("JWT authentication");
  }
  if (moduleNames.some((n) => n.includes("middleware") || n.includes("guard"))) {
    authArchitecture.push("Route guard middleware");
  }
  if (stackLower.some((s) => s.includes("session") || s.includes("cookie"))) {
    authArchitecture.push("Session-based auth");
  }
  if (stackLower.some((s) => s.includes("rbac") || s.includes("role"))) {
    authArchitecture.push("Role-based access checks");
  }
  // Ensure at least one entry so the view always has something to render.
  if (authArchitecture.length === 0) {
    authArchitecture.push("Auth architecture not detected");
  }

  return {
    repositoryName: repoMap.repository.name,
    primaryStack: repoMap.stack,
    authArchitecture,
    directories: modulePaths,
    provenance: {
      source: `Repo map analysis (${repoMap.provenance.provider})`,
      analyzedAt: repoMap.provenance.generatedAt,
      moduleCount: repoMap.modules.length,
      note:
        repoMap.provenance.provider === "mock"
          ? "Static demo data. No repository was analysed and no AI was consulted."
          : `Analysed by IBM Bob 2.0. Task ID: ${repoMap.provenance.bobTaskId ?? "n/a"}.`,
    },
  };
}

/**
 * Returns the RepositoryContext for the current session.
 *
 * When a RepoMap has been stored in localStorage (written after a successful
 * /api/repository/analyze call), derives the context from that real data so
 * ScopeShield is grounded in the actual repository. Falls back to the static
 * demo context when no analysis is available.
 */
export function getRepositoryContext(): RepositoryContext {
  const stored = readStoredRepoMap();
  if (stored) return repositoryContextFromRepoMap(stored);
  return FALLBACK_REPOSITORY_CONTEXT;
}

/**
 * The real repository context, built from a real Onboarding Map result.
 *
 * Every field comes from the RepoMap. The one judgement call is
 * `authArchitecture`: the repo map has no auth field, so modules whose path or
 * purpose actually mentions auth are listed, and an empty repository says so
 * rather than claiming an auth layer that was never found.
 */
export function toRepositoryContext(repoMap: RepoMap | null): RepositoryContext {
  if (!repoMap) {
    return {
      repositoryName: "No repository analysed yet",
      primaryStack: [],
      authArchitecture: ["No repository analysed yet"],
      directories: [],
      provenance: {
        source: "No repository analysed yet",
        analyzedAt: new Date(0).toISOString(),
        moduleCount: 0,
        note: NO_REPOSITORY_NOTE,
      },
    };
  }

  const isMock = repoMap.provenance.provider === "mock";
  const authModules = repoMap.modules.filter((module) =>
    /auth|security|session|login|permission|role|access/i.test(
      `${module.path} ${module.name} ${module.purpose}`,
    ),
  );

  return {
    repositoryName: `${repoMap.repository.name} (${repoMap.repository.slug})`,
    primaryStack: repoMap.stack,
    authArchitecture:
      authModules.length > 0
        ? authModules.map((module) => `${module.name} — ${module.path}`)
        : ["No auth or session module identified in the repo map"],
    directories: dedupe(repoMap.modules.map((module) => module.path)),
    provenance: {
      source: isMock
        ? "Repo map analysis (mock)"
        : `Repo map analysis by ${repoMap.provenance.provider}`,
      analyzedAt: repoMap.provenance.generatedAt,
      moduleCount: repoMap.modules.length,
      note: isMock
        ? (repoMap.provenance.notice ??
          "Mock data for local development. IBM Bob 2.0 was not called.")
        : `From the Onboarding Map analysis of ${repoMap.repository.url}, run by ${repoMap.provenance.provider} in ${repoMap.provenance.durationMs}ms.`,
    },
  };
}

/** Shown instead of pretending a repository exists. */
export const NO_REPOSITORY_NOTE =
  "No repository has been analysed yet. Run the Onboarding Map first — ScopeShield reasons about a real codebase, not an assumed one.";

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
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
