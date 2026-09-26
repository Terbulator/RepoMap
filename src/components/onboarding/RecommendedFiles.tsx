"use client";

import { RepoMapAnalysis } from "@/types/onboarding";

interface RecommendedFilesProps {
  analysis: RepoMapAnalysis;
}

export function RecommendedFiles({ analysis }: RecommendedFilesProps) {
  const sortedFiles = [...analysis.recommendedFiles].sort((a, b) => a.rank - b.rank);

  return (
    <section aria-labelledby="recommended-files-heading" className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 id="recommended-files-heading" className="text-lg font-semibold text-white flex items-center gap-2">
          <span className="w-6 h-6 rounded bg-primary-500/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </span>
          Start Here — Recommended Files
        </h2>
        <span className="text-xs text-neutral-500">{sortedFiles.length} files</span>
      </header>

      <div className="space-y-3" role="list">
        {sortedFiles.map((file) => (
          <article
            key={file.path}
            className="group relative p-4 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 transition-colors"
            role="listitem"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-500/20 border border-primary-500/30 flex items-center justify-center">
                <span className="text-sm font-bold text-primary-400">{file.rank}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm text-white truncate">{file.path}</p>
                <p className="mt-1 text-sm text-neutral-400">{file.reason}</p>
              </div>
            </div>
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-neutral-500">#{file.rank}</span>
            </div>
          </article>
        ))}
      </div>

      {sortedFiles.length === 0 && (
        <div className="text-center py-8 text-neutral-500">
          <p>No recommended files available.</p>
        </div>
      )}
    </section>
  );
}