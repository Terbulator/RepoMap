"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Node,
  Edge,
  ReactFlow,
  useReactFlow,
  Controls,
  MiniMap,
  Background,
  NodeTypes,
  EdgeTypes,
  addEdge,
  Connection,
  Handle,
  Position,
  type XYPosition,
  ReactFlowProvider,
} from "@xyflow/react";
import type { Module, Relationship } from "@/types/onboarding";
import { cn } from "@/lib/cn";
import { FileIcon } from "./common";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";

interface ModuleNodeData {
  module: Module;
  isSelected: boolean;
  onSelect: () => void;
  [key: string]: unknown;
}

function ModuleNode({ data }: { data: ModuleNodeData }) {
  const { module, isSelected, onSelect } = data;
  const fileCount = module.files.length;
  const depCount = module.dependencies.length;

  return (
    <div
      className={cn(
        "relative rounded-xl transition-all cursor-pointer select-none",
        "bg-white dark:bg-neutral-900",
        "shadow-sm hover:shadow-md",
        isSelected
          ? "border-2 border-blue-500 ring-2 ring-blue-500/20 shadow-lg"
          : "border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600"
      )}
      onClick={onSelect}
      style={{ minWidth: 220, maxWidth: 260 }}
    >
      <Handle type="target" position={Position.Top} className="w-2.5 h-2.5 bg-neutral-400 -top-1.5" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-neutral-900 dark:text-white truncate">
              {module.name}
            </h4>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 font-mono truncate">
              {module.path}
            </p>
          </div>
          {isSelected && (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white text-xs">
              ✓
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="flex items-center gap-1">
            <FileIcon language="TypeScript" className="text-xs" />
            {fileCount} files
          </span>
          {depCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800">
              {depCount} deps
            </span>
          )}
        </div>
        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
          {module.purpose}
        </p>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-2.5 h-2.5 bg-neutral-400 -bottom-1.5" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  module: ModuleNode,
};

const DEFAULT_EDGE_COLOR = "#9ca3af";

function getEdgeColor(type: string): string {
  const colors: Record<string, string> = {
    imports: "#3b82f6",
    calls: "#10b981",
    extends: "#f59e0b",
    uses: "#8b5cf6",
  };
  return colors[type] || DEFAULT_EDGE_COLOR;
}

const edgeTypes: EdgeTypes = {
  default: ({ data, selected }) => {
    const color = getEdgeColor(data.type as string);
    const label = data.type as string;

    return (
      <>
        <path
          strokeWidth={selected ? 2.5 : 1.5}
          stroke={selected ? color : "#d1d5db"}
          strokeDasharray={data.type === "imports" ? "none" : "4,4"}
          opacity={selected ? 1 : 0.6}
          markerEnd="arrowclosed"
        />
        {!selected && (
          <textPath
            textAnchor="middle"
            startOffset="50%"
            className="text-[10px] fill-neutral-500 dark:fill-neutral-400"
          >
            {label}
          </textPath>
        )}
      </>
    );
  },
};

interface ArchitectureDiagramProps {
  modules: Module[];
  relationships: Relationship[];
  selectedModuleId: string | null;
  onSelectModule: (id: string) => void;
}

function calculateLayout(modules: Module[], relationships: Relationship[]): Record<string, XYPosition> {
  const moduleIds = new Set(modules.map((m) => m.id));
  
  const validRelationships = relationships.filter(
    (rel) => moduleIds.has(rel.source) && moduleIds.has(rel.target)
  );

  const adjacency = new Map<string, string[]>();
  const reverseAdjacency = new Map<string, string[]>();

  modules.forEach((m) => {
    adjacency.set(m.id, []);
    reverseAdjacency.set(m.id, []);
  });

  validRelationships.forEach((rel) => {
    const src = adjacency.get(rel.source);
    const tgt = reverseAdjacency.get(rel.target);
    if (src) src.push(rel.target);
    if (tgt) tgt.push(rel.source);
  });

  const positions: Record<string, XYPosition> = {};
  const layerSpacing = 300;
  const nodeSpacing = 240;

  function getLayer(moduleId: string): number {
    const deps = reverseAdjacency.get(moduleId) || [];
    if (deps.length === 0) return 0;
    return 1 + Math.max(...deps.map(getLayer));
  }

  const layers = new Map<number, string[]>();
  modules.forEach((m) => {
    const layer = getLayer(m.id);
    if (!layers.has(layer)) layers.set(layer, []);
    layers.get(layer)!.push(m.id);
  });

  layers.forEach((moduleIds, layer) => {
    moduleIds.forEach((id, index) => {
      positions[id] = {
        x: layer * layerSpacing + 100,
        y: index * nodeSpacing + 80,
      };
    });
  });

  return positions;
}

function ArchitectureDiagramInner({
  modules,
  relationships,
  selectedModuleId,
  onSelectModule,
}: ArchitectureDiagramProps) {
  const reactFlowInstance = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  const layout = useMemo(() => calculateLayout(modules, relationships), [modules, relationships]);

  const moduleIds = useMemo(() => new Set(modules.map((m) => m.id)), [modules]);

  const initialNodes = useMemo<Node<ModuleNodeData>[]>(() => {
    return modules.map((module) => ({
      id: module.id,
      type: "module",
      position: layout[module.id] || { x: 0, y: 0 },
      data: {
        module,
        isSelected: selectedModuleId === module.id,
        onSelect: () => onSelectModule(module.id),
      },
    }));
  }, [modules, selectedModuleId, onSelectModule, layout]);

  const validRelationships = useMemo(() => {
    return relationships.filter(
      (rel) => moduleIds.has(rel.source) && moduleIds.has(rel.target)
    );
  }, [relationships, moduleIds]);

  const initialEdges = useMemo<Edge[]>(() => {
    return validRelationships.map((rel) => ({
      id: `e-${rel.source}-${rel.target}`,
      source: rel.source,
      target: rel.target,
      type: "default",
      data: { type: rel.type },
      animated: false,
      style: { strokeWidth: 1.5 },
    }));
  }, [validRelationships]);

  const [edges, setEdges] = useState<Edge[]>(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, type: "default", data: { type: "imports" } }, eds));
    },
    []
  );

  const fitView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.15, includeHiddenNodes: false });
  }, [reactFlowInstance]);

  const zoomIn = useCallback(() => {
    reactFlowInstance.zoomIn();
  }, [reactFlowInstance]);

  const zoomOut = useCallback(() => {
    reactFlowInstance.zoomOut();
  }, [reactFlowInstance]);

  useEffect(() => {
    if (initialNodes.length > 0) {
      const timer = setTimeout(fitView, 100);
      return () => clearTimeout(timer);
    }
  }, [initialNodes.length, fitView]);

  const selectedModule = modules.find((m) => m.id === selectedModuleId);

  const edgeTypesFromData = useMemo(() => {
    const types = new Set(validRelationships.map((r) => r.type));
    return Array.from(types).sort();
  }, [validRelationships]);

  if (modules.length === 0) {
    return (
      <section className="mb-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-neutral-950/50 p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            No Modules Found
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400">
            The repository analysis did not return any modules.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-950">
      <div className="border-b border-neutral-200 px-6 py-4 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Architecture</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Explore how the repository&apos;s modules connect
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            <span>{modules.length} modules</span>
            <span className="text-neutral-300 dark:text-neutral-600">•</span>
            <span>{validRelationships.length} relationships</span>
          </div>
          {selectedModule && (
            <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-medium">
              Selected: {selectedModule.name}
            </span>
          )}
        </div>
      </div>

      {validRelationships.length > 0 && (
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center gap-4 text-xs">
          <span className="text-neutral-500 dark:text-neutral-400">Edge types:</span>
          {edgeTypesFromData.map((type) => (
            <span key={type} className="flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800">
              <span
                className="w-6 h-0.5 rounded"
                style={{ backgroundColor: getEdgeColor(type) }}
              />
              <span className="text-neutral-600 dark:text-neutral-300 capitalize">{type}</span>
            </span>
          ))}
          <span className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
            <span className="w-2 h-2 rounded-full bg-neutral-400" />
            Node handles
          </span>
        </div>
      )}

      {validRelationships.length === 0 && modules.length > 0 && (
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 text-center text-sm text-neutral-500 dark:text-neutral-400">
          Architecture relationships are not available yet.
        </div>
      )}

      <div
        ref={containerRef}
        className="relative h-[600px] w-full"
        style={{ background: "var(--background)" }}
      >
        <ReactFlow
          nodes={initialNodes}
          edges={edges}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView={false}
          defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
          className="h-full w-full"
          attributionPosition="bottom-right"
          nodesDraggable={false}
          nodesConnectable={false}
        >
          <Background
            color="#e5e7eb"
            gap={24}
            size={1}
            style={{ opacity: 0.3 }}
          />
          <Controls />
          <MiniMap
            nodeColor={(node) =>
              node.id === selectedModuleId ? "#3b82f6" : "#9ca3af"
            }
            maskColor="rgba(0,0,0,0.1)"
          />
        </ReactFlow>

        {/* Custom zoom controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1.5">
          <button
            onClick={zoomIn}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
          </button>
          <button
            onClick={zoomOut}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
          </button>
          <button
            onClick={fitView}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Fit view"
          >
            <Maximize className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
          </button>
        </div>
      </div>
    </section>
  );
}

export function ArchitectureDiagram(props: ArchitectureDiagramProps) {
  return (
    <ReactFlowProvider>
      <ArchitectureDiagramInner {...props} />
    </ReactFlowProvider>
  );
}