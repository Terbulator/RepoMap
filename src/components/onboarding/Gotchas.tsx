"use client";

import type { Gotcha } from "@/types/onboarding";
import { SeverityBadge } from "./common";
import { cn } from "@/lib/cn";
import { AlertTriangle, AlertCircle, Info, FileCode } from "lucide-react";

const SEVERITY_CONFIG = {
  high: {
    icon: AlertTriangle,
    iconColor: "text-red-500",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-900 dark:text-red-100",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  medium: {
    icon: AlertCircle,
    iconColor: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-900 dark:text-amber-100",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  low: {
    icon: Info,
    iconColor: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-900 dark:text-blue-100",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
};

interface GotchasProps {
  gotchas: Gotcha[];
}

export function Gotchas({ gotchas }: GotchasProps) {
  if (gotchas.length === 0) {
    return (
      <section className="mb-8 rounded-xl border border-neutral-200 p-6 dark:border-neutral-800 bg-white/50 dark:bg-neutral-950/50">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-neutral-400" />
          <h2 className="text-lg font-semibold">Common Gotchas</h2>
        </div>
        <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
          No known gotchas for this repository.
        </p>
      </section>
    );
  }

  const severityOrder = { high: 0, medium: 1, low: 2 };
  const sortedGotchas = [...gotchas].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  const highCount = gotchas.filter((g) => g.severity === "high").length;
  const mediumCount = gotchas.filter((g) => g.severity === "medium").length;
  const lowCount = gotchas.filter((g) => g.severity === "low").length;

  return (
    <section className="mb-8" aria-labelledby="gotchas-heading">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 dark:bg-white">
            <AlertTriangle className="h-4 w-4 text-white dark:text-neutral-900" />
          </div>
          <h2 id="gotchas-heading" className="text-lg font-semibold tracking-tight">
            Common Gotchas
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {highCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">
              {highCount} High
            </span>
          )}
          {mediumCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
              {mediumCount} Medium
            </span>
          )}
          {lowCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-medium">
              {lowCount} Low
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4" role="list">
        {sortedGotchas.map((gotcha) => {
          const config = SEVERITY_CONFIG[gotcha.severity];
          const Icon = config.icon;

          return (
            <article
              key={gotcha.id}
              className={cn(
                "relative rounded-xl border p-5 transition-all",
                config.bg,
                config.border
              )}
              role="listitem"
            >
              <div className="flex items-start gap-4">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", config.iconColor)}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={cn("font-semibold text-sm", config.text)}>
                          {gotcha.title}
                        </h3>
                        <SeverityBadge severity={gotcha.severity} />
                      </div>
                      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                        {gotcha.description}
                      </p>
                    </div>
                  </div>
                  {gotcha.filePaths.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {gotcha.filePaths.map((path) => (
                        <a
                          key={path}
                          href="#"
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors",
                            "bg-white/50 dark:bg-neutral-900/50",
                            "hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          )}
                        >
                          <FileCode className="h-3 w-3" />
                          <span>{path}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}