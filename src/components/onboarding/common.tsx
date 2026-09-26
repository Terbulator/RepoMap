"use client";

import { Module, Relationship } from "@/types/onboarding";
import { Node, Edge, MarkerType, Handle, Position } from "@xyflow/react";
import { Database, Globe, FolderGit2, Shield, Cpu, Layers } from "lucide-react";

const NODE_WIDTH = 280;
const NODE_HEIGHT = 140;
const HORIZONTAL_GAP = 160;
const VERTICAL_GAP = 140;

export type ModuleCategory = "infrastructure" | "analysis" | "shared" | "features" | "api" | "other";

export function inferCategory(module: Module): ModuleCategory {
  const id = module.id.toLowerCase();
  const path = module.path.toLowerCase();
  const name = module.name.toLowerCase();

  if (id.includes("ingestion") || id.includes("bob") || path.includes("bob") || name.includes("ingestion")) {
    return "infrastructure";
  }
  if (id.includes("analysis") || id.includes("repomap") || path.includes("repomap") || name.includes("analysis")) {
    return "analysis";
  }
  if (id.includes("shared") || id.includes("types") || id.includes("schema") || path.includes("types") || path.includes("schema")) {
    return "shared";
  }
  if (id.includes("scope") || id.includes("feature") || path.includes("scope") || path.includes("feature") || name.includes("shield")) {
    return "features";
  }
  if (id.includes("api") || id.includes("route") || path.includes("api") || name.includes("api")) {
    return "api";
  }
  return "other";
}

function getCategoryAccent(category: ModuleCategory): string {
  switch (category) {
    case "infrastructure": return "border-emerald-500/30 bg-emerald-500/5";
    case "analysis": return "border-amber-500/30 bg-amber-500/5";
    case "shared": return "border-cyan-500/30 bg-cyan-500/5";
    case "features": return "border-violet-500/30 bg-violet-500/5";
    case "api": return "border-blue-500/30 bg-blue-500/5";
    default: return "border-neutral-600/30 bg-neutral-600/5";
  }
}

function getCategoryGlow(category: ModuleCategory): string {
  switch (category) {
    case "infrastructure": return "shadow-[0_0_24px_rgba(16,185,129,0.15)]";
    case "analysis": return "shadow-[0_0_24px_rgba(245,158,11,0.15)]";
    case "shared": return "shadow-[0_0_24px_rgba(6,182,212,0.15)]";
    case "features": return "shadow-[0_0_24px_rgba(168,85,247,0.15)]";
    case "api": return "shadow-[0_0_24px_rgba(59,130,246,0.15)]";
    default: return "shadow-[0_0_24px_rgba(100,116,139,0.15)]";
  }
}

function buildAdjacency(modules: Module[], relationships: Relationship[]) {
  const moduleIds = new Set(modules.map((m) => m.id));
  const adj = new Map<string, string[]>();
  const reverseAdj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  modules.forEach((m) => {
    adj.set(m.id, []);
    reverseAdj.set(m.id, []);
    inDegree.set(m.id, 0);
  });

  relationships.forEach((r) => {
    if (!moduleIds.has(r.source) || !moduleIds.has(r.target)) return;
    adj.get(r.source)!.push(r.target);
    reverseAdj.get(r.target)!.push(r.source);
    inDegree.set(r.target, (inDegree.get(r.target) || 0) + 1);
  });

  return { adj, reverseAdj, inDegree };
}

function topologicalLayers(modules: Module[], relationships: Relationship[]): string[][] {
  const { adj, inDegree } = buildAdjacency(modules, relationships);
  const layers: string[][] = [];
  const remaining = new Set(modules.map((m) => m.id));

  while (remaining.size > 0) {
    const currentLayer = [...remaining].filter((id) => inDegree.get(id) === 0);
    if (currentLayer.length === 0) {
      const next = [...remaining][0];
      currentLayer.push(next);
    }
    layers.push(currentLayer);
    currentLayer.forEach((id) => {
      remaining.delete(id);
      adj.get(id)?.forEach((target) => {
        inDegree.set(target, (inDegree.get(target) ?? 1) - 1);
      });
    });
  }

  return layers;
}

function assignPositions(layers: string[][]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const maxLayerWidth = Math.max(...layers.map((l) => l.length));
  const canvasWidth = maxLayerWidth * (NODE_WIDTH + HORIZONTAL_GAP) + HORIZONTAL_GAP;
  const startX = 0;

  layers.forEach((layer, layerIndex) => {
    const layerWidth = layer.length * (NODE_WIDTH + HORIZONTAL_GAP) - HORIZONTAL_GAP;
    const layerStartX = startX + (canvasWidth - layerWidth) / 2;
    const y = layerIndex * (NODE_HEIGHT + VERTICAL_GAP) + VERTICAL_GAP;

    layer.forEach((nodeId, nodeIndex) => {
      const x = layerStartX + nodeIndex * (NODE_WIDTH + HORIZONTAL_GAP);
      positions.set(nodeId, { x, y });
    });
  });

  return positions;
}

export function computeLayout(modules: Module[], relationships: Relationship[]): Map<string, { x: number; y: number }> {
  if (modules.length === 0) return new Map();
  if (modules.length === 1) {
    const m = new Map();
    m.set(modules[0].id, { x: HORIZONTAL_GAP, y: VERTICAL_GAP });
    return m;
  }

  const layers = topologicalLayers(modules, relationships);
  return assignPositions(layers);
}

export function modulesToNodes(modules: Module[], relationships: Relationship[] = []): Node[] {
  const positions = computeLayout(modules, relationships);
  return modules.map((module) => {
    const pos = positions.get(module.id) || { x: 0, y: 0 };
    const category = inferCategory(module);
    return {
      id: module.id,
      type: "moduleNode",
      data: {
        label: module.name,
        purpose: module.purpose,
        path: module.path,
        fileCount: module.files?.length || 0,
        depCount: module.dependencies?.length || 0,
        category,
      },
      position: pos,
      style: { width: NODE_WIDTH, height: NODE_HEIGHT },
    };
  });
}

export function relationshipsToEdges(relationships: Relationship[], modules: Module[]): Edge[] {
  const moduleIds = new Set(modules.map((m) => m.id));
  const validRelationships = relationships.filter((r) => moduleIds.has(r.source) && moduleIds.has(r.target));
  
  const seen = new Set<string>();
  const uniqueRelationships = validRelationships.filter((r) => {
    const key = `${r.source}-${r.target}-${r.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return uniqueRelationships.map((relationship, index) => ({
    id: `edge-${relationship.source}-${relationship.target}-${index}`,
    source: relationship.source,
    target: relationship.target,
    type: "smoothstep",
    animated: false,
    style: { 
      stroke: "#64748b", 
      strokeWidth: 2, 
      opacity: 0.9,
      filter: "drop-shadow(0 0 4px rgba(100,116,139,0.3))",
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#64748b",
      width: 18,
      height: 18,
    },
    label: relationship.type,
    labelStyle: { fontSize: 10, fill: "#94a3b8", fontWeight: 500, fontFamily: "var(--font-mono)" },
    labelBgStyle: { fill: "#0a0f1a", fillOpacity: 0.9, padding: 3, borderRadius: 4, border: "1px solid rgba(100,116,139,0.3)" },
    labelBgBorderRadius: 4,
    labelBgPadding: [3, 6],
  }));
}

export const nodeTypes = {
  moduleNode: ModuleNode,
};

interface ModuleNodeData {
  label: string;
  purpose: string;
  path: string;
  fileCount: number;
  depCount: number;
  category: ModuleCategory;
}

function ModuleNode({ data, selected }: { data: ModuleNodeData; selected?: boolean }) {
  const category = data.category;
  const accentClass = getCategoryAccent(category);
  const glowClass = selected ? getCategoryGlow(category) : "";
  const borderClass = selected ? "border-2" : "border";
  const ringClass = selected ? "ring-2 ring-primary-500/50" : "";

  const renderIcon = () => {
    switch (category) {
      case "infrastructure": return <Database className="w-4 h-4 text-primary-400" />;
      case "analysis": return <Cpu className="w-4 h-4 text-primary-400" />;
      case "shared": return <Layers className="w-4 h-4 text-primary-400" />;
      case "features": return <Shield className="w-4 h-4 text-primary-400" />;
      case "api": return <Globe className="w-4 h-4 text-primary-400" />;
      default: return <FolderGit2 className="w-4 h-4 text-primary-400" />;
    }
  };

  return (
    <div className={`relative ${borderClass} rounded-xl transition-all duration-300 ${accentClass} ${glowClass} ${ringClass} bg-neutral-950/80 backdrop-blur-sm ${selected ? "scale-[1.02] z-10" : ""} hover:border-primary-500/40 hover:shadow-[0_0_32px_rgba(59,130,246,0.2)]`}>
      <Handle type="source" position={Position.Right} className="bg-primary-500/60 border-2 border-neutral-950 w-3 h-3 rounded-full" style={{ zIndex: 10 }} />
      <Handle type="target" position={Position.Left} className="bg-primary-500/60 border-2 border-neutral-950 w-3 h-3 rounded-full" style={{ zIndex: 10 }} />
      
      <div className="p-3">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
            {renderIcon()}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <h3 className="font-semibold text-white text-sm truncate">{data.label}</h3>
            <p className="mt-1 text-xs text-neutral-400 line-clamp-2">{data.purpose}</p>
          </div>
        </div>
        
        <div className="mt-3 pt-2 border-t border-neutral-800/50 flex items-center justify-between text-xs">
          <span className="font-mono text-neutral-500 truncate max-w-[180px]">{data.path}</span>
          <div className="flex items-center gap-3 text-neutral-500">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
              {data.fileCount} files
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500/60" />
              {data.depCount} deps
            </span>
          </div>
        </div>
      </div>
      
      {selected && (
        <div className="absolute inset-0 border-2 border-primary-500/50 rounded-xl pointer-events-none animate-pulse-subtle" />
      )}
    </div>
  );
}

export function getModuleById(modules: Module[], id: string): Module | undefined {
  return modules.find((m) => m.id === id);
}

export function getRelatedModules(modules: Module[], relationships: Relationship[], moduleId: string): Module[] {
  const relatedIds = new Set<string>();
  relationships.forEach((r) => {
    if (r.source === moduleId) relatedIds.add(r.target);
    if (r.target === moduleId) relatedIds.add(r.source);
  });
  return modules.filter((m) => relatedIds.has(m.id));
}

export function formatStackBadge(stack: string): React.ReactNode {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-800 border border-neutral-700 text-neutral-300">
      {stack}
    </span>
  );
}