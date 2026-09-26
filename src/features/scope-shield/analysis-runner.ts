/**
 * Stage 6 of ScopeShield: the Idle -> Loading -> Success | Error run.
 *
 * This module is the seam where the mock pipeline becomes a real one. It
 * validates the request, attempts a live IBM Bob 2.0 scope analysis call, and
 * — on any failure — gracefully falls back to the deterministic mock generators
 * so the UI never locks up.
 *
 * Failure is deterministic, not random: a request that mentions a failure word
 * ("error", "timeout", …) always fails in the mock path, so the error state can
 * be demonstrated on demand. The Bob 2.0 live path never consults the mock
 * failure keywords — that check is mock-only.
 */

import {
  EMPTY_REQUEST_MESSAGE,
  normalizeFeatureRequest,
} from "./feature-request.ts";
import { generateClarifyingQuestions } from "./clarifying-questions.ts";
import type { ClarifyingQuestion } from "./clarifying-questions.ts";
import { buildDraftedReply } from "./drafted-reply.ts";
import { analyzeFeatureRequest } from "./risk-analysis.ts";
import type { RiskAnalysis } from "./risk-analysis.ts";
import {
  detectStackContext,
  formatGroundingNote,
  getRepositoryContext,
  stackContextFromPrimaryStack,
} from "./stack-context.ts";
import type { RepositoryContext, StackContext } from "./stack-context.ts";
import { findSignal } from "./keyword-match.ts";

/** Below this, the request cannot produce a useful scope analysis. */
export const MIN_REQUEST_LENGTH = 10;

export const INVALID_REQUEST_MESSAGE = "Please enter a valid feature request.";
export const ANALYSIS_ERROR_MESSAGE = "Failed to analyze scope. Please try again.";

/** Mock latency, so the loading state is visible in a demo. */
export const MOCK_LATENCY_MS = 900;

/** Requests containing one of these always fail in the mock path, to exercise the error state. */
export const MOCK_FAILURE_KEYWORDS = [
  "error",
  "timeout",
  "crash",
  "unavailable",
  "failed",
  "fails",
  "failure",
];

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
  source: "bob-2.0" | "mock";
};

export type ScopeAnalysisOutcome =
  | { status: "success"; result: ScopeAnalysisResult }
  | { status: "error"; message: string; fellBackToMock: boolean };

export type RequestValidation =
  | { ok: true; request: string }
  | { ok: false; message: string };

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

export function shouldMockProviderFail(request: string): boolean {
  return findSignal(MOCK_FAILURE_KEYWORDS, request) !== "";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs the whole mock pipeline. Resolves with a success result, or with the
 * error message the UI should show. Never rejects.
 */
async function runMockAnalysis(
  request: string,
  context: RepositoryContext,
  stack: StackContext,
  latencyMs: number,
): Promise<ScopeAnalysisOutcome> {
  const analysis = analyzeFeatureRequest(request);
  const questions = generateClarifyingQuestions(request);
  const grounding = formatGroundingNote(context, stack);
  const draft = buildDraftedReply({ request, stack, analysis, questions, grounding });

  await delay(latencyMs);

  if (shouldMockProviderFail(request)) {
    return { status: "error", message: ANALYSIS_ERROR_MESSAGE, fellBackToMock: false };
  }

  return {
    status: "success",
    result: { request, analysis, questions, stack, grounding, draft, source: "mock" },
  };
}

/** Shape of a successful /api/scope/analyze response. */
type ScopeApiSuccess = {
  success: true;
  result: {
    request: string;
    analysis: RiskAnalysis;
    questions: ClarifyingQuestion[];
    stack: StackContext;
    trace?: { taskId: string | null; model: string | null };
  };
};

type ScopeApiFailure = {
  success: false;
  error: { code: string; message: string };
};

/**
 * Calls the server-side /api/scope/analyze route, which in turn calls IBM Bob
 * 2.0. Aborts after `timeoutMs`. Throws on any failure so the caller can fall
 * back to mocks.
 */
async function fetchBobScopeAnalysis(
  request: string,
  context: RepositoryContext,
  stack: StackContext,
  timeoutMs: number,
): Promise<{
  request: string;
  analysis: RiskAnalysis;
  questions: ClarifyingQuestion[];
  stack: StackContext;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(BOB_SCOPE_API_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        request,
        repositoryContext: context,
        stackContext: stack,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `IBM Bob 2.0 scope analysis timed out after ${timeoutMs}ms.`,
      );
    }
    throw new Error("Could not reach the IBM Bob 2.0 scope analysis service.");
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as ScopeApiFailure;
    throw new Error(
      errorData.error?.message ||
        `IBM Bob 2.0 API returned HTTP ${response.status}.`,
    );
  }

  const data = (await response.json()) as ScopeApiSuccess | ScopeApiFailure;
  if (!data.success || !data.result) {
    const failure = data as ScopeApiFailure;
    throw new Error(failure.error?.message || "IBM Bob 2.0 API returned an unexpected response.");
  }

  return {
    request: data.result.request,
    analysis: data.result.analysis,
    questions: data.result.questions,
    stack: data.result.stack,
  };
}

/**
 * Runs the full scope analysis lifecycle (Stage 6).
 *
 * Attempts a live IBM Bob 2.0 API call first (via /api/scope/analyze). If that
 * fails for any reason — no endpoint configured, auth failure, timeout, non-200,
 * or invalid response — logs a clear console warning and falls back to the
 * deterministic mock generators so the UI always reaches Success or Error.
 *
 * Never rejects: every code path resolves with a `ScopeAnalysisOutcome`.
 */
export async function runScopeAnalysis(
  request: string,
  latencyMs: number = MOCK_LATENCY_MS,
  bobTimeoutMs: number = DEFAULT_BOB_TIMEOUT_MS,
): Promise<ScopeAnalysisOutcome> {
  const context = getRepositoryContext();
  const repoBase =
    context.primaryStack.length > 0
      ? stackContextFromPrimaryStack(context.primaryStack)
      : undefined;
  const stack = detectStackContext(request, repoBase);

  const hasFetch = typeof fetch === "function";

  if (hasFetch) {
    try {
      const bobResult = await fetchBobScopeAnalysis(request, context, stack, bobTimeoutMs);
      const stackUsed = bobResult.stack ?? stack;
      const grounding = formatGroundingNote(context, stackUsed);
      const draft = buildDraftedReply({
        request: bobResult.request,
        stack: stackUsed,
        analysis: bobResult.analysis,
        questions: bobResult.questions,
        grounding,
      });

      return {
        status: "success",
        result: {
          request,
          analysis: bobResult.analysis,
          questions: bobResult.questions,
          stack: stackUsed,
          grounding,
          draft,
          source: "bob-2.0",
        },
      };
    } catch (error) {
      console.warn(
        "[ScopeShield] IBM Bob 2.0 scope analysis unavailable — falling back to deterministic mock generators:",
        error instanceof Error ? error.message : String(error),
      );
    }
  } else {
    console.warn(
      "[ScopeShield] fetch is not available in this environment; using deterministic mock generators.",
    );
  }

  // Fallback to mock generators. Any error coming from this path means Bob 2.0
  // was unavailable (or returned an error), so the mock path is always a fallback.
  const mockOutcome = await runMockAnalysis(request, context, stack, latencyMs);
  if (mockOutcome.status === "error") {
    return { status: "error", message: mockOutcome.message, fellBackToMock: true };
  }
  return mockOutcome;
}
