"use client";

import { RepoMapAnalysis } from "@/types/onboarding";
import { formatStackBadge } from "./common";

interface ProjectSummaryProps {
  analysis: RepoMapAnalysis;
}

export function ProjectSummary({ analysis }: ProjectSummaryProps) {
  return (
    <section aria-labelledby="project-summary-heading" className="space-y-4">
      <div>
        <h2 id="project-summary-heading" className="text-xl font-semibold text-white">
          Project Overview
        </h2>
        <p className="mt-1 text-sm text-neutral-400">{analysis.projectSummary}</p>
      </div>

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