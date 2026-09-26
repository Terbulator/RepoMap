"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ANALYSIS_ERROR_MESSAGE,
  runScopeAnalysis,
  validateFeatureRequest,
} from "@/features/scope-shield/analysis-runner";
import type { ScopeAnalysisResult } from "@/features/scope-shield/analysis-runner";
import { ClarifyingQuestionsView } from "@/features/scope-shield/clarifying-questions-view";
import { STORED_REQUEST_MESSAGE, saveFeatureRequest } from "@/features/scope-shield/feature-request";
import { DraftedReplyView } from "@/features/scope-shield/drafted-reply-view";
import { RiskAnalysisView } from "@/features/scope-shield/risk-analysis-view";
import { RepositoryContextView } from "@/features/scope-shield/repository-context-view";
import { getRepositoryContext } from "@/features/scope-shield/stack-context";
import { detectStackContext } from "@/features/scope-shield/stack-context";

/** Idle -> Loading -> Success | Error. */
type ViewState = "idle" | "loading" | "success" | "error";

/**
 * ScopeShield (PRD 5.2).
 *
 * Stage 1 captures the feature request and stores it in localStorage under
 * "featureRequest". Stages 2-5 render the mock risk analysis, clarifying
 * questions, drafted reply and repository context. Stage 6 owns the run
 * lifecycle: validation, the loading state, the error banner and retry.
 * Everything below the fold is still mock data; no IBM Bob 2.0 call happens.
 */
export function ScopeShield() {
  const [text, setText] = useState("");
  const [viewState, setViewState] = useState<ViewState>("idle");
  const [fieldError, setFieldError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastRequest, setLastRequest] = useState("");
  const [result, setResult] = useState<ScopeAnalysisResult | null>(null);
  const runId = useRef(0);

  // Stage 5 context. MOCK data today; the real /api/repomap response matches it.
  const repositoryContext = useMemo(() => getRepositoryContext(), []);

  const isLoading = viewState === "loading";
  const isEmpty = text.trim().length === 0;

  // Ignore a run that finishes after a newer one, or after unmount.
  useEffect(() => {
    return () => {
      runId.current += 1;
    };
  }, []);

  async function analyze(request: string) {
    const id = runId.current + 1;
    runId.current = id;

    setViewState("loading");
    setErrorMessage("");
    setResult(null);

    const outcome = await runScopeAnalysis(request);
    if (runId.current !== id) return;

    if (outcome.status === "error") {
      setErrorMessage(outcome.message || ANALYSIS_ERROR_MESSAGE);
      setViewState("error");
      return;
    }

    setResult(outcome.result);
    setViewState("success");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateFeatureRequest(text);
    if (!validation.ok) {
      setFieldError(validation.message);
      return;
    }

    // Stage 1: store the request before any analysis runs.
    const stored = saveFeatureRequest(validation.request);
    console.log("ScopeShield feature request:", stored);

    setFieldError("");
    setLastRequest(stored);
    void analyze(stored);
  }

  function handleTextChange(value: string) {
    setText(value);

    // Re-typing clears the inline validation error and any run error.
    if (fieldError) setFieldError("");
    if (viewState === "error") {
      setViewState("idle");
      setErrorMessage("");
    }
  }

  const grounding = result?.grounding ?? "";

  return (
    <section aria-label="ScopeShield feature request" className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">ScopeShield</h1>

      <div className="mt-6">
        <RepositoryContextView
          context={repositoryContext}
          stack={result?.stack ?? detectStackContext("")}
          grounding={
            grounding || "Grounded in Repo Analysis — no request analysed yet."
          }
        />
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-8">
        <label htmlFor="feature-request" className="block text-sm font-medium">
          Describe the feature you want to build:
        </label>
        <textarea
          id="feature-request"
          name="featureRequest"
          value={text}
          onChange={(event) => handleTextChange(event.target.value)}
          rows={8}
          disabled={isLoading}
          placeholder="e.g., Add authentication to the project"
          aria-invalid={fieldError ? true : undefined}
          aria-describedby="feature-request-hint feature-request-status"
          className="mt-3 w-full rounded-md border border-neutral-300 bg-transparent px-4 py-3 text-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:focus:ring-white"
        />

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={isEmpty || isLoading}
            className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {isLoading ? (
              <span
                aria-hidden="true"
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-neutral-900/40 dark:border-t-neutral-900"
              />
            ) : null}
            {isLoading ? "Analyzing Scope…" : "Analyze Scope"}
          </button>
          <span id="feature-request-hint" className="text-xs text-neutral-500">
            At least 10 characters. The analysis is a local mock.
          </span>
        </div>

        {fieldError ? (
          <p
            id="feature-request-status"
            role="alert"
            className="mt-3 text-sm text-rose-600 dark:text-rose-400"
          >
            {fieldError}
          </p>
        ) : null}
      </form>

      {viewState === "error" ? (
        <div
          role="alert"
          className="mt-6 rounded-md border border-rose-300 bg-rose-50 p-4 text-sm dark:border-rose-500/40 dark:bg-rose-500/10"
        >
          <p className="font-semibold text-rose-800 dark:text-rose-200">
            {errorMessage}
          </p>
          <p className="mt-1 text-rose-700/90 dark:text-rose-300/90">
            The request is still saved. Retry, or edit the request to clear this
            message.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void analyze(lastRequest)}
              className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => {
                setViewState("idle");
                setErrorMessage("");
              }}
              className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-800 hover:bg-rose-100 dark:border-rose-500/40 dark:text-rose-200 dark:hover:bg-rose-500/20"
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {isLoading ? <LoadingSkeleton /> : null}

      {viewState === "success" && result ? (
        <>
          <div
            role="status"
            className="mt-6 rounded-md border border-neutral-200 p-4 text-sm dark:border-neutral-800"
          >
            <p className="font-medium">{STORED_REQUEST_MESSAGE}</p>
            <p className="mt-1 text-neutral-600 dark:text-neutral-300">
              Request saved: {result.request}
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              Stored in localStorage under the key &quot;featureRequest&quot;.
            </p>
          </div>

          <RiskAnalysisView analysis={result.analysis} grounding={result.grounding} />

          <ClarifyingQuestionsView
            questions={result.questions}
            grounding={result.grounding}
          />

          <DraftedReplyView key={result.draft} draft={result.draft} />
        </>
      ) : null}
    </section>
  );
}

/** Placeholder cards shown while the mock pipeline runs. */
function LoadingSkeleton() {
  return (
    <div role="status" aria-live="polite" className="mt-6">
      <p className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-300">
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent"
        />
        Analyzing repository and calculating risks…
      </p>

      <div aria-hidden="true" className="mt-4 space-y-4">
        <div className="h-5 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-24 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800/60" />
        <div className="h-32 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800/60" />
      </div>
    </div>
  );
}
