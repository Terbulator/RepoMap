"use client";

import type { RecommendedFile } from "@/types/onboarding";
import { FileIcon } from "./common";
import { cn } from "@/lib/cn";
import { Play, ArrowRight, FileCode } from "lucide-react";

interface RecommendedFilesProps {
  files: RecommendedFile[];
}

export function RecommendedFiles({ files }: RecommendedFilesProps) {
  if (files.length === 0) {
    return (
      <section className="mb-8 rounded-xl border border-neutral-200 p-6 dark:border-neutral-800 bg-white/50 dark:bg-neutral-950/50">
        <div className="flex items-center gap-2">
          <FileCode className="h-5 w-5 text-neutral-400" />
          <h2 className="text-lg font-semibold">Start Here</h2>
        </div>
        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
          No recommended starting files available.
        </p>
      </section>
    );
  }

  const sortedFiles = [...files].sort((a, b) => a.rank - b.rank);
  const topFile = sortedFiles[0];

  return (
    <section className="mb-8" aria-labelledby="start-here-heading">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 dark:bg-white">
            <Play className="h-4 w-4 text-white dark:text-neutral-900" />
          </div>
          <h2 id="start-here-heading" className="text-lg font-semibold tracking-tight">
            Start Here
          </h2>
        </div>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Ranked by importance for onboarding
        </p>
      </div>

      <div className="space-y-4">
        <article
          className={cn(
            "relative rounded-xl border p-5 transition-all",
            "bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/20",
            "border-blue-200 dark:border-blue-800"
          )}
        >
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-medium">
            <span>#1</span>
            <span className="text-[10px]">PRIMARY</span>
          </div>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <FileCode className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <FileIcon language="TypeScript" />
                <code className="text-base font-mono font-medium text-neutral-900 dark:text-white truncate block">
                  {topFile.path}
                </code>
              </div>
              <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300 font-medium">
                {topFile.reason}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
                <ArrowRight className="h-3.5 w-3.5" />
                <span>Start reading here for the best overview</span>
              </div>
            </div>
          </div>
        </article>

        {sortedFiles.slice(1).length > 0 && (
          <ol className="space-y-3" role="list" aria-label="Additional recommended files">
            {sortedFiles.slice(1).map((file, index) => (
              <li key={file.path} className="relative">
                <div className={cn(
                  "group flex items-start gap-4 rounded-xl border p-4 transition-all",
                  "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950",
                  "hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-sm"
                )}>
                  <span className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-mono font-bold transition-colors",
                    index === 0
                      ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                      : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700"
                  )}>
                    {file.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileIcon language="TypeScript" />
                      <code className="text-sm font-mono text-neutral-900 dark:text-white truncate block">
                        {file.path}
                      </code>
                    </div>
                    <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-300">
                      {file.reason}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-500 dark:group-hover:text-neutral-400 transition-colors shrink-0" />
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}