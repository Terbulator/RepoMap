"use client";

import { RepoMapAnalysis, Gotcha } from "@/types/onboarding";

interface GotchasProps {
  analysis: RepoMapAnalysis;
}

function getGotchaText(gotcha: string | Gotcha): string {
  return typeof gotcha === "string" ? gotcha : gotcha.description;
}

function getGotchaSeverity(gotcha: string | Gotcha): "high" | "medium" | "low" {
  return typeof gotcha === "string" ? "medium" : gotcha.severity;
}

function getSeverityColor(severity: "high" | "medium" | "low"): string {
  switch (severity) {
    case "high":
      return "border-red-500/20 bg-red-500/5";
    case "medium":
      return "border-amber-500/20 bg-amber-500/5";
    case "low":
      return "border-green-500/20 bg-green-500/5";
  }
}

export function Gotchas({ analysis }: GotchasProps) {
  if (analysis.gotchas.length === 0) {
    return (
      <section aria-labelledby="gotchas-heading" className="space-y-4">
        <h2 id="gotchas-heading" className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </span>
          Gotchas & Caveats
        </h2>
        <div className="text-center py-8 text-neutral-500 border border-dashed border-neutral-800 rounded-xl">
          <p>No gotchas detected for this repository.</p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="gotchas-heading" className="space-y-4">
      <h2 id="gotchas-heading" className="text-lg font-semibold text-white flex items-center gap-2">
        <span className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </span>
        Gotchas & Caveats
        <span className="text-sm font-normal text-neutral-500">({analysis.gotchas.length})</span>
      </h2>
      <div className="space-y-2" role="list">
        {analysis.gotchas.map((gotcha, index) => {
          const text = getGotchaText(gotcha);
          const severity = getGotchaSeverity(gotcha);
          const severityColor = getSeverityColor(severity);
          return (
            <article
              key={index}
              className={`p-4 rounded-xl flex gap-3 ${severityColor}`}
              role="listitem"
            >
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm text-neutral-300 flex-1">{text}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}