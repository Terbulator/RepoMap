"use client";

import { RepoMapAnalysis, ModuleFile } from "@/types/onboarding";
import { getRelatedModules } from "./common";

interface ModuleCardsProps {
  analysis: RepoMapAnalysis;
  selectedModuleId: string | null;
  onModuleSelect: (moduleId: string | null) => void;
}

function getFilePath(file: string | ModuleFile): string {
  return typeof file === "string" ? file : file.path;
}

export function ModuleCards({ analysis, selectedModuleId, onModuleSelect }: ModuleCardsProps) {
  return (
    <section aria-labelledby="modules-heading" className="space-y-4">
      <h2 id="modules-heading" className="text-lg font-semibold text-white flex items-center gap-2">
        Module Breakdown
        <span className="text-sm font-normal text-neutral-500">({analysis.modules.length} modules)</span>
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {analysis.modules.map((module) => {
          const isSelected = selectedModuleId === module.id;
          const relatedModules = getRelatedModules(analysis.modules, analysis.relationships, module.id);

          return (
            <article
              key={module.id}
              onClick={() => onModuleSelect(module.id)}
              className={`group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                isSelected
                  ? "border-primary-500 bg-primary-500/10 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
                  : "border-neutral-800 bg-neutral-900/50 hover:border-neutral-700 hover:bg-neutral-900"
              }`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onModuleSelect(module.id);
                }
              }}
              aria-pressed={isSelected}
              aria-label={`View details for ${module.name} module`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-white truncate">{module.name}</h3>
                  <p className="mt-1 text-xs text-neutral-500 font-mono truncate">{module.path}</p>
                </div>
                {isSelected && (
                  <span className="flex-shrink-0 w-2 h-2 bg-primary-500 rounded-full mt-1.5" aria-hidden="true" />
                )}
              </div>

              <p className="mt-3 text-sm text-neutral-400 line-clamp-2">{module.purpose}</p>

              <div className="mt-3 flex flex-wrap gap-1.5" role="list" aria-label="Key files">
                {module.files.slice(0, 3).map((file, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 text-xs font-mono bg-neutral-800 border border-neutral-700 rounded text-neutral-300 truncate max-w-[120px]"
                    role="listitem"
                  >
                    {getFilePath(file)}
                  </span>
                ))}
                {module.files.length > 3 && (
                  <span className="px-2 py-0.5 text-xs text-neutral-500">
                    +{module.files.length - 3} more
                  </span>
                )}
              </div>

              {relatedModules.length > 0 && (
                <div className="mt-3 pt-3 border-t border-neutral-800">
                  <p className="text-xs text-neutral-500 mb-1.5">Related modules:</p>
                  <div className="flex flex-wrap gap-1">
                    {relatedModules.slice(0, 3).map((m) => (
                      <span
                        key={m.id}
                        className="px-1.5 py-0.5 text-xs bg-primary-500/10 border border-primary-500/20 text-primary-400 rounded"
                      >
                        {m.name}
                      </span>
                    ))}
                    {relatedModules.length > 3 && (
                      <span className="px-1.5 py-0.5 text-xs text-neutral-500">
                        +{relatedModules.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-neutral-500">Click for details →</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}