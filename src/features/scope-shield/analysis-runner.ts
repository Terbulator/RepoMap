/**
 * Stage 6 of ScopeShield: the Idle -> Loading -> Success | Error run.
 *
 * This module is the seam where the mock pipeline becomes a real one. It
 * validates the request, adds the latency, runs the four mock generators and
 * returns a discriminated outcome, so the UI never has to know whether the work
 * happened locally or on IBM Bob 2.0.
 *
 * Failure is deterministic, not random: a request that mentions a failure word
 * ("error", "timeout", …) always fails, so the error state can be demonstrated
 * on demand. Stage 7 replaces the body of `runScopeAnalysis` with the provider
 * call and keeps this contract.
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
} from "./stack-context.ts";
import type { StackContext } from "./stack-context.ts";
import { findSignal } from "./keyword-match.ts";

/** Below this, the request cannot produce a useful scope analysis. */
export const MIN_REQUEST_LENGTH = 10;

export const INVALID_REQUEST_MESSAGE = "Please enter a valid feature request.";
export const ANALYSIS_ERROR_MESSAGE = "Failed to analyze scope. Please try again.";

/** Mock latency, so the loading state is visible in a demo. */
export const MOCK_LATENCY_MS = 900;

/** Requests containing one of these always fail, to exercise the error state. */
export const MOCK_FAILURE_KEYWORDS = [
  "error",
  "timeout",
  "crash",
  "unavailable",
  "failed",
  "fails",
  "failure",
];

export type ScopeAnalysisResult = {
  request: string;
  analysis: RiskAnalysis;
  questions: ClarifyingQuestion[];
  stack: StackContext;
  grounding: string;
  draft: string;
};

export type ScopeAnalysisOutcome =
  | { status: "success"; result: ScopeAnalysisResult }
  | { status: "error"; message: string };

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
export async function runScopeAnalysis(
  request: string,
  latencyMs: number = MOCK_LATENCY_MS,
): Promise<ScopeAnalysisOutcome> {
  const context = getRepositoryContext();
  const stack = detectStackContext(request);
  const analysis = analyzeFeatureRequest(request);
  const questions = generateClarifyingQuestions(request);
  const grounding = formatGroundingNote(context, stack);
  const draft = buildDraftedReply({ request, stack, analysis, questions, grounding });

  await delay(latencyMs);

  if (shouldMockProviderFail(request)) {
    return { status: "error", message: ANALYSIS_ERROR_MESSAGE };
  }

  return {
    status: "success",
    result: { request, analysis, questions, stack, grounding, draft },
  };
}
