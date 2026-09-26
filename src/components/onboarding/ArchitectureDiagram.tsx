"use client";

import { useEffect, useRef, useMemo } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { RepoMapAnalysis } from "@/types/onboarding";
import { modulesToNodes, relationshipsToEdges, nodeTypes, getModuleById } from "./common";
import { GitBranch, Maximize2, X, Layers } from "lucide-react";

interface ArchitectureDiagramProps {
  analysis: RepoMapAnalysis;
  selectedModuleId: string | null;
  onModuleSelect: (moduleId: string | null) => void;
}

export function ArchitectureDiagram({ analysis, selectedModuleId, onModuleSelect }: ArchitectureDiagramProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();
  const fittedRef = useRef(false);

  const nodes = useMemo(() => modulesToNodes(analysis.modules, analysis.relationships), [analysis.modules, analysis.relationships]);
  const edges = useMemo(() => relationshipsToEdges(analysis.relationships, analysis.modules), [analysis.relationships, analysis.modules]);

  useEffect(() => {
    if (reactFlowWrapper.current && !fittedRef.current) {
      fitView({ padding: 0.2, includeHiddenNodes: false, duration: 600 });
      fittedRef.current = true;
    }
  }, [fitView, nodes.length, edges.length]);

  const onNodeClick = (_: React.MouseEvent, node: { id: string }) => {
    onModuleSelect(node.id);
  };

  const onPaneClick = () => {
    onModuleSelect(null);
  };

  const validEdgeCount = edges.length;
  const nodeCount = nodes.length;

  return (
    <section aria-labelledby="architecture-heading" className="space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 id="architecture-heading" className="text-lg font-semibold text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary-400" />
            Architecture Map
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            AI-generated repository structure · {nodeCount} modules · {validEdgeCount} relationships
          </p>
        </div>
      </header>

      <div
        ref={reactFlowWrapper}
        className="relative w-full h-[520px] rounded-xl border border-neutral-800/50 bg-gradient-to-br from-neutral-950/80 to-neutral-900/90 overflow-hidden shadow-[0_4px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.02)]"
        role="application"
        aria-label="Architecture diagram showing module relationships"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView={false}
          attributionPosition="bottom-left"
        >
          <Background
            color="#0f172a"
            gap={20}
            style={{ opacity: 0.3 }}
          />
          <Controls
            className="bg-neutral-900/80 border-neutral-700/50 text-neutral-300 backdrop-blur-sm"
            showZoom={true}
            showFitView={false}
            showInteractive={false}
          />
          <MiniMap
            className="bg-neutral-900/80 border-neutral-700/50 backdrop-blur-sm"
            nodeColor={(node) => (node.id === selectedModuleId ? "#60a5fa" : "#475569")}
            nodeStrokeColor={(node) => (node.id === selectedModuleId ? "#3b82f6" : "#334155")}
            nodeStrokeWidth={1.5}
            maskColor="rgba(10, 15, 26, 0.85)"
          />
        </ReactFlow>

        <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-2 pointer-events-none">
          <button
            onClick={() => fitView({ padding: 0.15, duration: 400 })}
            className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-neutral-900/80 border border-neutral-700/50 text-neutral-200 text-xs font-medium rounded-lg backdrop-blur-sm hover:bg-neutral-800/80 hover:border-neutral-600/50 transition-all duration-200 shadow-lg"
            aria-label="Fit view"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Fit View
          </button>
          {selectedModuleId && (
            <button
              onClick={() => onModuleSelect(null)}
              className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-neutral-900/80 border border-neutral-700/50 text-neutral-200 text-xs font-medium rounded-lg backdrop-blur-sm hover:bg-neutral-800/80 hover:border-neutral-600/50 transition-all duration-200 shadow-lg"
              aria-label="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
              Clear Selection
            </button>
          )}
        </div>

        {selectedModuleId && getModuleById(analysis.modules, selectedModuleId) && (
          <div className="absolute top-4 left-4 pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900/95 border border-primary-500/30 rounded-lg text-xs text-neutral-300 backdrop-blur-sm shadow-lg">
              <GitBranch className="w-3.5 h-3.5 text-primary-400" />
              <span>Selected:</span>
              <span className="text-primary-400 font-mono">{selectedModuleId}</span>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
        @keyframes pulse-subtle {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </section>
  );
}