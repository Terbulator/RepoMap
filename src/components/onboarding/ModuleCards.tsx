"use client";

import type { Module } from "@/types/onboarding";
import { FileIcon } from "./common";
import { cn } from "@/lib/cn";
import { ChevronRight, FolderOpen, ArrowUpRight } from "lucide-react";

interface ModuleCardProps {
  module: Module;
  onClick: () => void;
  isSelected?: boolean;
}

export function ModuleCard({ module, onClick, isSelected }: ModuleCardProps) {
  const fileCount = module.files.length;
  const totalSize = module.files.reduce((acc, f) => acc + f.size, 0);
  const sizeKB = (totalSize / 1024).toFixed(1);

  return (
    <article
      onClick={onClick}
      className={cn(
        "relative rounded-xl border p-5 transition-all cursor-pointer",
        "bg-white dark:bg-neutral-950",
        isSelected
          ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 ring-2 ring-blue-500/20 shadow-md"
          : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 hover:shadow-sm"
      )}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      aria-pressed={isSelected}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-neutral-500 dark:text-neutral-400 shrink-0" />
            <h3 className="font-semibold text-sm text-neutral-900 dark:text-white truncate">
              {module.name}
            </h3>
            {isSelected && (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white text-xs">
                ✓
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400 font-mono truncate">
            {module.path}
          </p>
          <p className="mt-2.5 text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2">
            {module.purpose}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1.5">
              <FileIcon language="TypeScript" className="text-xs" />
              <span>{fileCount} files</span>
            </span>
            <span className="flex items-center gap-1.5 text-neutral-400 dark:text-neutral-500">
              <span className="h-3 w-px bg-neutral-300 dark:bg-neutral-600" />
              {sizeKB} KB
            </span>
            {module.dependencies.length > 0 && (
              <span className="flex items-center gap-1.5">
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                <span>{module.dependencies.length} deps</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <ChevronRight className="h-5 w-5 text-neutral-300 dark:text-neutral-600 transition-transform group-hover:translate-x-1" />
          <span className="text-[10px] font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
            View module
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 text-neutral-300 dark:text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {module.dependencies.length > 0 && (
        <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex flex-wrap gap-1.5">
            {module.dependencies.map((dep) => (
              <span
                key={dep}
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              >
                <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                {dep}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

interface ModuleCardsProps {
  modules: Module[];
  selectedModuleId: string | null;
  onSelectModule: (id: string) => void;
}

export function ModuleCards({ modules, selectedModuleId, onSelectModule }: ModuleCardsProps) {
  return (
    <section className="mb-8" aria-labelledby="modules-heading">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <h2 id="modules-heading" className="text-lg font-semibold tracking-tight">
          Module Breakdown
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {modules.length} modules · Click any card to explore details
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {modules.map((module) => (
          <ModuleCard
            key={module.id}
            module={module}
            isSelected={selectedModuleId === module.id}
            onClick={() => onSelectModule(module.id)}
          />
        ))}
      </div>
    </section>
  );
}