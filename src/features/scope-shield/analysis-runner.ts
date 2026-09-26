/**
 * ScopeShield's run lifecycle: Idle -> Loading -> Success | Error.
 *
 * The mock pipeline that used to live here is gone. This module now validates
 * the request, hands the *real* Onboarding Map context to the server, and
 * returns the already-validated result. IBM Bob 2.0 is only ever called from
 * `POST /api/scope-shield`; the browser never touches the CLI, the API key or a
 * workspace.
 *
 * `runScopeAnalysis` never rejects. A provider or network failure comes back as
 * `{ status: "error" }` so the UI always has an error state to show, and it is
 * never quietly replaced with mock data.
 */

import {
  EMPTY_REQUEST_MESSAGE,
  normalizeFeatureRequest,
} from "./feature-request.ts";
import { readStoredRepoMap } from "../repomap/store.ts";
import type { RepoMap } from "../repomap/schema.ts";
import type { ClarifyingQuestion } from "./clarifying-questions.ts";
import type { RiskAnalysis } from "./risk-analysis.ts";
import type { RepositoryContext, StackContext } from "./stack-context.ts";

/** Below this, the request cannot produce a useful scope analysis. */
export const MIN_REQUEST_LENGTH = 10;

export const INVALID_REQUEST_MESSAGE = "Please enter a valid feature request.";
export const ANALYSIS_ERROR_MESSAGE = "Failed to analyze scope. Please try again.";
export const NO_REPOSITORY_MESSAGE =
  "Analyze a repository first. ScopeShield reasons about a real codebase, so it needs an Onboarding Map result.";
export const NETWORK_ERROR_MESSAGE =
  "Could not reach the ScopeShield API. Check your connection and try again.";

/** API route the client calls to reach IBM Bob 2.0 (server-side, credentials protected). */
export const BOB_SCOPE_API_PATH = "/api/scope/analyze";

/** Default timeout for the Bob 2.0 scope API round-trip (FR-7: 15s). */
export const DEFAULT_BOB_TIMEOUT_MS = 15_000;

export type ScopeAnalysisResult = {
  request: string;
  analysis: RiskAnalysis;
  questions: ClarifyingQuestion[];
  stack: StackContext;
  grounding: string;
  draft: string;
  /** The real repository context the server grounded this run in. */
  context: RepositoryContext;
  /** Which provider produced this, so the UI never claims Bob ran when it did not. */
  provider: "bob-2.0" | "mock";
  /** The Bob task id, when the provider exposed one (PRD §7 traceability). */
  bobTaskId: string | null;
};

export type ScopeAnalysisOutcome =
  | { status: "success"; result: ScopeAnalysisResult }
  | { status: "error"; message: string; fellBackToMock: boolean };

export type RequestValidation =
  | { ok: true; request: string }
  | { ok: false; message: string };

/** Seam for tests: the real implementation is the browser `fetch`. */
export type ScopeShieldDeps = {
  fetchImpl?: typeof fetch;
  repoMap?: RepoMap | null;
};

/** Trims the input, then rejects what cannot produce a useful analysis. */
export function validateFeatureRequest(input: string): RequestValidation {
  const request = normalizeFeatureRequest(input);

  if (request.length === 0) {
    return { ok: false, message: EMPTY_REQUEST_MESSAGE };
  }
  if (request.length < MIN_REQUEST_LENGTH) {
    return { ok: false, message: INVALID_REQUEST_MESSAGE };
  }

  return { ok: true, request };
}

/**
 * Runs the real analysis on the server and returns the outcome the UI renders.
 * Resolves with a success result, or with the error message to show. Never
 * rejects, and never falls back to invented data.
 */
async function runMockAnalysis(
  request: string,
  deps: ScopeShieldDeps = {},
): Promise<ScopeAnalysisOutcome> {
  const doFetch = deps.fetchImpl ?? fetch;
  const repoMap = deps.repoMap === undefined ? readStoredRepoMap() : deps.repoMap;

  if (!repoMap) {
    return { status: "error", message: NO_REPOSITORY_MESSAGE };
  }

  let response: Response;
  try {
    response = await doFetch("/api/scope-shield", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        request,
        repository: repoMap.repository.url,
        repoMap,
      }),
    });
  } catch {
    return { status: "error", message: NETWORK_ERROR_MESSAGE };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { status: "error", message: ANALYSIS_ERROR_MESSAGE };
  }

  if (typeof body !== "object" || body === null) {
    return { status: "error", message: ANALYSIS_ERROR_MESSAGE };
  }

  const envelope = body as Record<string, unknown>;

  if (envelope.success === true && isScopeAnalysisResult(envelope.result)) {
    return { status: "success", result: envelope.result };
  }

  if (envelope.success === false && typeof envelope.error === "object" && envelope.error !== null) {
    const error = envelope.error as Record<string, unknown>;
    return {
      status: "error",
      message:
        typeof error.message === "string" && error.message !== ""
          ? error.message
          : ANALYSIS_ERROR_MESSAGE,
    };
  }

  return { status: "error", message: ANALYSIS_ERROR_MESSAGE };
}

/**
 * A minimal shape check, so a 200 carrying garbage surfaces as an error instead
 * of crashing a view. The server is the real validation boundary; this only
 * confirms the fields the UI reads are actually there.
 */
function isScopeAnalysisResult(value: unknown): value is ScopeAnalysisResult {
  if (typeof value !== "object" || value === null) return false;

  const result = value as Record<string, unknown>;
  const analysis = result.analysis;
  const context = result.context;

  return (
    typeof result.request === "string" &&
    typeof result.grounding === "string" &&
    typeof result.draft === "string" &&
    typeof result.provider === "string" &&
    typeof analysis === "object" &&
    analysis !== null &&
    Array.isArray((analysis as Record<string, unknown>).domains) &&
    Array.isArray(result.questions) &&
    Array.isArray((result.stack as Record<string, unknown> | undefined)?.languages) &&
    typeof context === "object" &&
    context !== null &&
    Array.isArray((context as Record<string, unknown>).primaryStack)
  );
}
