"use client";

import type { Module } from "@/types/onboarding";
import { FileIcon } from "./common";
import { cn } from "@/lib/cn";
import { X, FolderOpen, Link2, FileCode, Zap, ExternalLink } from "lucide-react";

const DEFAULT_MODULE_ICON = FolderOpen;

interface ModuleDetailDrawerProps {
  module: Module | null;
  onClose: () => void;
}

export function ModuleDetailDrawer({ module, onClose }: ModuleDetailDrawerProps) {
  if (!module) return null;

  const totalSize = module.files.reduce((acc, f) => acc + f.size, 0);
  const sizeKB = (totalSize / 1024).toFixed(1);

  const bobExplanation = module.bobExplanation ||
    `This module handles ${module.purpose.toLowerCase()}. It contains ${module.files.length} files organized around ${module.name.toLowerCase()} functionality.`;

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-labelledby="module-detail-title">
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative mr-auto flex w-full max-w-4xl flex-col bg-white dark:bg-neutral-950 shadow-xl animate-in slide-in-from-right duration-200">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900 dark:bg-white">
              <DEFAULT_MODULE_ICON className="h-5 w-5 text-white dark:text-neutral-900" />
            </div>
            <div>
              <h2 id="module-detail-title" className="text-lg font-semibold text-neutral-900 dark:text-white">
                {module.name}
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                {module.path}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Close module details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-6">
            <div className="rounded-xl bg-neutral-50 dark:bg-neutral-900/50 p-4 border border-neutral-200 dark:border-neutral-800">
              <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                Responsibility
              </h3>
              <p className="mt-2 text-base text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {module.purpose}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-neutral-50 dark:bg-neutral-900/50 p-4 border border-neutral-200 dark:border-neutral-800">
                <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                  Path
                </h3>
                <p className="mt-2 text-sm font-mono text-neutral-700 dark:text-neutral-300 break-all">
                  {module.path}
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 dark:bg-neutral-900/50 p-4 border border-neutral-200 dark:border-neutral-800">
                <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                  Size
                </h3>
                <div className="mt-2 flex items-center gap-3 text-sm">
                  <span className="font-mono font-medium text-neutral-900 dark:text-white">
                    {sizeKB} KB
                  </span>
                  <span className="text-neutral-500 dark:text-neutral-400">
                    {module.files.length} files
                  </span>
                </div>
              </div>
            </div>

            {module.dependencies.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                  Dependencies ({module.dependencies.length})
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {module.dependencies.map((dep) => (
                    <span
                      key={dep}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700"
                    >
                      <Link2 className="h-3 w-3" />
                      {dep}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                Important Files ({module.files.length})
              </h3>
              <div className="mt-3 space-y-2 max-h-80 overflow-y-auto">
                {module.files.map((file) => (
                  <div
                    key={file.path}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                      "bg-white dark:bg-neutral-900",
                      "border-neutral-200 dark:border-neutral-800",
                      "hover:border-neutral-300 dark:hover:border-neutral-700"
                    )}
                  >
                    <FileIcon language={file.language} className="text-xl shrink-0" />
                    <div className="flex-1 min-w-0">
                      <code className="text-sm font-mono text-neutral-900 dark:text-white truncate block">
                        {file.path}
                      </code>
                      <div className="flex items-center gap-4 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        <span className="flex items-center gap-1">
                          <FileCode className="h-2.5 w-2.5" />
                          {file.language}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="h-2.5 w-px bg-neutral-300 dark:bg-neutral-600" />
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {(module.bobExplanation || module.purpose) && (
              <div className="rounded-xl bg-neutral-50 dark:bg-neutral-900/50 p-5 border border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                    Bob&apos;s Explanation
                  </h3>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed italic">
                  {bobExplanation}
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
              <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
                Quick Actions
              </h3>
              <div className="flex flex-wrap gap-2">
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                  <FolderOpen className="h-3 w-3" />
                  Open in Editor
                </button>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                  <Link2 className="h-3 w-3" />
                  View History
                </button>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                  <Link2 className="h-3 w-3" />
                  View Dependencies
                </button>
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                  <ExternalLink className="h-3 w-3" />
                  View on GitHub
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}