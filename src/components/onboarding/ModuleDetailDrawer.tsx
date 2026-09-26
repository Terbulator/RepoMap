"use client";

import { RepoMapAnalysis } from "@/types/onboarding";
import { getModuleById, getRelatedModules } from "./common";
import { X } from "lucide-react";

interface ModuleDetailDrawerProps {
  analysis: RepoMapAnalysis;
  selectedModuleId: string | null;
  onClose: () => void;
}

export function ModuleDetailDrawer({ analysis, selectedModuleId, onClose }: ModuleDetailDrawerProps) {
  const selectedModule = selectedModuleId ? getModuleById(analysis.modules, selectedModuleId) : null;
  const relatedModules = selectedModule ? getRelatedModules(analysis.modules, analysis.relationships, selectedModule.id) : [];

  if (!selectedModule) return null;

  const outgoingEdges = analysis.relationships.filter((r) => r.source === selectedModule.id);
  const incomingEdges = analysis.relationships.filter((r) => r.target === selectedModule.id);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="module-detail-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full sm:max-w-2xl max-h-[90vh] overflow-hidden bg-neutral-950 border border-neutral-800 rounded-t-2xl sm:rounded-xl shadow-2xl animate-slide-in">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h2 id="module-detail-title" className="text-lg font-semibold text-white">{selectedModule.name}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            aria-label="Close module details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-60px)] space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-medium text-primary-400 uppercase tracking-wider">Path</p>
            <p className="font-mono text-sm text-neutral-300 bg-neutral-900 border border-neutral-800 px-3 py-2 rounded">{selectedModule.path}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-primary-400 uppercase tracking-wider">Purpose</p>
            <p className="text-sm text-neutral-300">{selectedModule.purpose}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-primary-400 uppercase tracking-wider">Files ({selectedModule.files.length})</p>
            <div className="space-y-1.5">
              {selectedModule.files.map((file, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-neutral-900 border border-neutral-800 rounded text-sm">
                  <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-xs text-neutral-500 bg-neutral-800 rounded">{index + 1}</span>
                  <code className="font-mono text-neutral-300 truncate flex-1">{file}</code>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-primary-400 uppercase tracking-wider">Dependencies ({selectedModule.dependencies.length})</p>
            <div className="flex flex-wrap gap-2">
              {selectedModule.dependencies.map((dep, idx) => (
                <span key={idx} className="px-2.5 py-1 text-xs bg-neutral-800 border border-neutral-700 rounded text-neutral-300">
                  {dep}
                </span>
              ))}
              {selectedModule.dependencies.length === 0 && (
                <span className="text-xs text-neutral-500">None</span>
              )}
            </div>
          </div>

          {relatedModules.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-primary-400 uppercase tracking-wider">Related Modules ({relatedModules.length})</p>
              <div className="space-y-2">
                {relatedModules.map((related) => {
                  const outgoing = outgoingEdges.find((e) => e.target === related.id);
                  const incoming = incomingEdges.find((e) => e.source === related.id);
                  const relationshipType = outgoing?.type || incoming?.type || "connected";

                  return (
                    <div key={related.id} className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{related.name}</p>
                          <p className="text-xs text-neutral-500 font-mono">{related.path}</p>
                        </div>
                        <span className="px-2 py-0.5 text-xs bg-primary-500/10 border border-primary-500/20 text-primary-400 rounded">
                          {relationshipType}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(outgoingEdges.length > 0 || incomingEdges.length > 0) && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-primary-400 uppercase tracking-wider">Architecture Relationships</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {outgoingEdges.length > 0 && (
                  <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                    <p className="text-xs font-medium text-blue-400 mb-2">Outgoing ({outgoingEdges.length})</p>
                    <ul className="space-y-1 text-sm">
                      {outgoingEdges.map((edge, idx) => (
                        <li key={idx} className="text-neutral-300 flex items-center gap-2">
                          <span className="text-blue-400">→</span>
                          <span className="font-mono">{getModuleById(analysis.modules, edge.target)?.name || edge.target}</span>
                          <span className="text-xs text-neutral-500 px-1.5 py-0.5 bg-neutral-800 rounded">{edge.type}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {incomingEdges.length > 0 && (
                  <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                    <p className="text-xs font-medium text-green-400 mb-2">Incoming ({incomingEdges.length})</p>
                    <ul className="space-y-1 text-sm">
                      {incomingEdges.map((edge, idx) => (
                        <li key={idx} className="text-neutral-300 flex items-center gap-2">
                          <span className="text-green-400">←</span>
                          <span className="font-mono">{getModuleById(analysis.modules, edge.source)?.name || edge.source}</span>
                          <span className="text-xs text-neutral-500 px-1.5 py-0.5 bg-neutral-800 rounded">{edge.type}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}