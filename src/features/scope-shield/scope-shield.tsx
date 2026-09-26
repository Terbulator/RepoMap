"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  EMPTY_REQUEST_MESSAGE,
  STORED_REQUEST_MESSAGE,
  isEmptyFeatureRequest,
  saveFeatureRequest,
} from "@/features/scope-shield/feature-request";
import type { ClarifyingQuestion } from "@/features/scope-shield/clarifying-questions";
import { generateClarifyingQuestions } from "@/features/scope-shield/clarifying-questions";
import { ClarifyingQuestionsView } from "@/features/scope-shield/clarifying-questions-view";
import { buildDraftedReply } from "@/features/scope-shield/drafted-reply";
import { DraftedReplyView } from "@/features/scope-shield/drafted-reply-view";
import type { RiskAnalysis } from "@/features/scope-shield/risk-analysis";
import { analyzeFeatureRequest } from "@/features/scope-shield/risk-analysis";
import { RiskAnalysisView } from "@/features/scope-shield/risk-analysis-view";
import { RepositoryContextView } from "@/features/scope-shield/repository-context-view";
import type { StackContext } from "@/features/scope-shield/stack-context";
import {
  detectStackContext,
  formatGroundingNote,
  getRepositoryContext,
} from "@/features/scope-shield/stack-context";

/** Fake latency so the loading state is visible. A real provider replaces this. */
const MOCK_ANALYSIS_DELAY_MS = 900;

/**
 * ScopeShield (PRD 5.2).
 *
 * Stage 1 captures the free-text feature request and stores it in localStorage
 * under "featureRequest". Stage 2 renders a MOCK risk analysis per technical
 * layer, stage 3 the MOCK clarifying questions, stage 4 a MOCK drafted reply,
 * stage 5 the repository context (FR-7) every one of those is grounded in. No
 * IBM Bob 2.0 call happens yet.
 */
export function ScopeShield() {
  const [text, setText] = useState("");
  const [submittedRequest, setSubmittedRequest] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<RiskAnalysis | null>(null);
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);
  const [draft, setDraft] = useState("");
  const [stack, setStack] = useState<StackContext | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stage 5: the repository ScopeShield reasons about. MOCK data today; the real
  // /api/repomap response has the same shape.
  const repositoryContext = useMemo(() => getRepositoryContext(), []);
  const grounding = useMemo(
    () =>
      stack
        ? formatGroundingNote(repositoryContext, stack)
        : formatGroundingNote(repositoryContext, detectStackContext("")),
    [repositoryContext, stack],
  );

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  const isEmpty = isEmptyFeatureRequest(text);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isEmptyFeatureRequest(text)) {
      setIsSubmitted(false);
      setSubmittedRequest("");
      setMessage(EMPTY_REQUEST_MESSAGE);
      return;
    }

    const request = saveFeatureRequest(text);
    console.log("ScopeShield feature request:", request);

    setSubmittedRequest(request);
    setIsSubmitted(true);
    setMessage(STORED_REQUEST_MESSAGE);

    setIsAnalyzing(true);
    timer.current = setTimeout(() => {
      const nextAnalysis = analyzeFeatureRequest(request);
      const nextQuestions = generateClarifyingQuestions(request);
      const nextStack = detectStackContext(request);
      const nextGrounding = formatGroundingNote(repositoryContext, nextStack);

      setAnalysis(nextAnalysis);
      setQuestions(nextQuestions);
      setStack(nextStack);
      setDraft(
        buildDraftedReply({
          request,
          stack: nextStack,
          analysis: nextAnalysis,
          questions: nextQuestions,
          grounding: nextGrounding,
        }),
      );
      setIsAnalyzing(false);
    }, MOCK_ANALYSIS_DELAY_MS);
  }

  return (
    <section aria-label="ScopeShield feature request" className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">ScopeShield</h1>

      <div className="mt-6">
        <RepositoryContextView
          context={repositoryContext}
          stack={stack ?? detectStackContext("")}
          grounding={grounding}
        />
      </div>

      <form onSubmit={handleSubmit} className="mt-8">
        <label htmlFor="feature-request" className="block text-sm font-medium">
          Describe the feature you want to build:
        </label>
        <textarea
          id="feature-request"
          name="featureRequest"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={8}
          placeholder="e.g., Add authentication to the project"
          aria-describedby="feature-request-status"
          className="mt-3 w-full rounded-md border border-neutral-300 bg-transparent px-4 py-3 text-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-700 dark:focus:ring-white"
        />

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={isEmpty || isAnalyzing}
            className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {isAnalyzing ? "Analyzing Scope…" : "Analyze Scope"}
          </button>
          {message && !isSubmitted ? (
            <p
              id="feature-request-status"
              role="status"
              className="text-sm text-red-600 dark:text-red-400"
            >
              {message}
            </p>
          ) : null}
        </div>
      </form>

      {isAnalyzing ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-6 flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-300"
        >
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent"
          />
          Reading the request for hidden work across backend, database,
          frontend, infrastructure and security, then drafting the questions and
          the reply…
        </div>
      ) : null}

      {isSubmitted ? (
        <div
          id="feature-request-status"
          role="status"
          className="mt-6 rounded-md border border-neutral-200 p-4 text-sm dark:border-neutral-800"
        >
          <p className="font-medium">{message}</p>
          <p className="mt-1 text-neutral-600 dark:text-neutral-300">
            Request saved: {submittedRequest}
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            Stored in localStorage under the key &quot;featureRequest&quot;.
          </p>
        </div>
      ) : null}

      {analysis && !isAnalyzing ? (
        <RiskAnalysisView analysis={analysis} grounding={grounding} />
      ) : null}

      {questions.length > 0 && !isAnalyzing ? (
        <ClarifyingQuestionsView questions={questions} grounding={grounding} />
      ) : null}

      {draft && !isAnalyzing ? (
        <DraftedReplyView key={draft} draft={draft} />
      ) : null}
    </section>
  );
}
