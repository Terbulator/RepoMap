"use client";

import { useEffect, useRef, useState } from "react";
import type { ClarifyingQuestion } from "@/features/scope-shield/clarifying-questions";
import { formatQuestions } from "@/features/scope-shield/clarifying-questions";

const LAYER_BADGES: Record<string, string> = {
  frontend: "bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300",
  backend: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  database:
    "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  infrastructure:
    "bg-slate-200 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300",
  security:
    "bg-amber-200 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200",
};

const RESET_COPIED_AFTER_MS = 2000;

/** Stage 3 output: the questions to ask before code is written. */
export function ClarifyingQuestionsView({
  questions,
  grounding,
}: {
  questions: ClarifyingQuestion[];
  grounding?: string;
}) {
  const [answered, setAnswered] = useState<Record<string, boolean>>({});
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  function toggle(id: string) {
    setAnswered((current) => ({ ...current, [id]: !current[id] }));
  }

  async function copyAll() {
    const text = formatQuestions(questions);

    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyState("idle"), RESET_COPIED_AFTER_MS);
  }

  const answeredCount = questions.filter(
    (question) => answered[question.id],
  ).length;

  return (
    <section aria-label="Clarifying questions" className="mt-10">
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-500">
          Clarifying Questions
        </h2>
        <span className="text-xs text-neutral-500">
          {answeredCount}/{questions.length} answered
        </span>
        <button
          type="button"
          onClick={copyAll}
          className="ml-auto rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Copy Questions
        </button>
      </div>

      <p
        role="status"
        className="mt-2 min-h-4 text-xs text-neutral-500"
      >
        {copyState === "copied"
          ? "Questions copied. Paste them into your message."
          : copyState === "failed"
            ? "Could not reach the clipboard. Select the text and copy it manually."
            : "Ask these before anyone writes code. Tick them off as you get answers."}
      </p>

      {grounding ? (
        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
          {grounding}
        </p>
      ) : null}

      <ol className="mt-4 space-y-3">
        {questions.map((question, index) => {
          const isAnswered = Boolean(answered[question.id]);

          return (
            <li
              key={question.id}
              className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
            >
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={isAnswered}
                  onChange={() => toggle(question.id)}
                  className="mt-1 h-4 w-4 shrink-0 accent-neutral-900 dark:accent-white"
                />
                <span className="flex-1">
                  <span className="flex flex-wrap items-baseline gap-2">
                    <span className="text-xs font-semibold text-neutral-500">
                      {index + 1}.
                    </span>
                    <span
                      className={
                        isAnswered
                          ? "text-sm text-neutral-500 line-through"
                          : "text-sm font-medium"
                      }
                    >
                      {question.question}
                    </span>
                    <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[11px] text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
                      {question.topic}
                    </span>
                    {question.layer ? (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${LAYER_BADGES[question.layer]}`}
                      >
                        {question.layer}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-sm text-neutral-600 dark:text-neutral-300">
                    {question.why}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
