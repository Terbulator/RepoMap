"use client";

import { RepoMapAnalysis } from "@/types/onboarding";
import { formatStackBadge } from "./common";

interface ProjectSummaryProps {
  analysis: RepoMapAnalysis;
}

export function ProjectSummary({ analysis }: ProjectSummaryProps) {
  return (
    <section aria-labelledby="project-summary-heading" className="space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 id="project-summary-heading" className="text-xl font-semibold text-white">
            Project Overview
          </h2>
          <p className="mt-1 text-sm text-neutral-400">{analysis.projectSummary}</p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-500/20 border border-primary-500/30 text-primary-400">
          Mock Analysis
        </span>
      </header>

      <div className="flex flex-wrap gap-2" role="list" aria-label="Technology stack">
        {analysis.stack.map((tech, index) => (
          <span key={index} role="listitem">
            {formatStackBadge(tech)}
          </span>
        ))}
      </div>
    </section>
  );
}