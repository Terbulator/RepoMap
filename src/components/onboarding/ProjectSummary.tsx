"use client";

import type { OnboardingMapData } from "@/types/onboarding";
import { StackBadge } from "./common";
import { ExternalLink, CheckCircle, Clock, GitBranch } from "lucide-react";

interface DashboardHeaderProps {
  data: OnboardingMapData;
}

export function DashboardHeader({ data }: DashboardHeaderProps) {
  const { name, url, branch, commitSha, analyzedAt } = data.repository;
  const shortSha = commitSha.slice(0, 8);
  const analyzedDate = new Date(analyzedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <header className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900 dark:bg-white">
            <svg className="h-6 w-6 text-white dark:text-neutral-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">RepoMap</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 font-mono">{name}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="font-mono truncate max-w-[200px]">{url.replace("https://", "")}</span>
          </a>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 font-mono">
            <GitBranch className="h-3 w-3" />
            {branch}
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 font-mono">
            {shortSha}
          </span>
          <span className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
            <Clock className="h-3.5 w-3.5" />
            Analyzed {analyzedDate}
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="h-3.5 w-3.5" />
            ANALYZED
          </span>
        </div>
      </div>
      <div className="mt-4 h-px bg-gradient-to-r from-transparent via-neutral-200 to-transparent dark:via-neutral-800" />
    </header>
  );
}

interface ProjectSummaryProps {
  data: OnboardingMapData;
}

export function ProjectSummary({ data }: ProjectSummaryProps) {
  return (
    <section className="mb-8" aria-labelledby="project-summary-heading">
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-800 bg-white/50 dark:bg-neutral-950/50">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 rounded">
              Project Overview
            </span>
          </div>
          <h2 id="project-summary-heading" className="text-lg font-semibold tracking-tight">
            What is this project?
          </h2>
          <div className="mt-4 max-w-3xl">
            <p className="text-base text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
              {data.projectSummary}
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-800 bg-white/50 dark:bg-neutral-950/50">
          <h3 className="text-lg font-semibold tracking-tight">Detected Stack</h3>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Technologies identified during analysis
          </p>
          <div className="mt-4 flex flex-wrap gap-2" role="list" aria-label="Technology stack">
            {data.stack.length > 0 ? (
              data.stack.map((tech) => (
                <span key={tech} role="listitem">
                  <StackBadge>{tech}</StackBadge>
                </span>
              ))
            ) : (
              <span className="text-sm text-neutral-500 dark:text-neutral-400">
                No stack data available
              </span>
            )}
          </div>
          <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800">
            <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Repository Stats</h4>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-neutral-500 dark:text-neutral-400">Modules</dt>
                <dd className="font-mono font-medium">{data.modules.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500 dark:text-neutral-400">Total Files</dt>
                <dd className="font-mono font-medium">
                  {data.modules.reduce((acc, m) => acc + m.files.length, 0)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500 dark:text-neutral-400">Relationships</dt>
                <dd className="font-mono font-medium">{data.relationships.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-neutral-500 dark:text-neutral-400">Gotchas</dt>
                <dd className="font-mono font-medium">{data.gotchas.length}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}