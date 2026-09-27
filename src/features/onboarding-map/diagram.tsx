"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Edge,
  type Node,
  type NodeMouseHandler,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { RepoMap, RepoMapModule } from "@/features/repomap/schema";

// ─── layout constants ────────────────────────────────────────────────────────
const NODE_W = 160;
const NODE_H = 56;
const COL_GAP = 220;
const ROW_GAP = 80;

/**
 * Assign each module a column (0-based) using Kahn-style BFS from source
 * nodes that have no incoming edges. Purely derived from the relationships
 * array — no invented structure.
 */
function computeColumns(
  modules: RepoMapModule[],
  relationships: RepoMap["relationships"],
): Map<string, number> {
  const inDegree = new Map<string, number>(modules.map((m) => [m.id, 0]));
  for (const rel of relationships) {
    if (inDegree.has(rel.target)) {
      inDegree.set(rel.target, (inDegree.get(rel.target) ?? 0) + 1);
    }
  }

  const column = new Map<string, number>();
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
      column.set(id, 0);
    }
  }

  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    const col = column.get(id) ?? 0;
    for (const rel of relationships) {
      if (rel.source === id) {
        const prev = column.get(rel.target) ?? -1;
        if (col + 1 > prev) {
          column.set(rel.target, col + 1);
        }
        if (!queue.includes(rel.target)) {
          queue.push(rel.target);
        }
      }
    }
  }
  // Isolated modules (no relationships at all) fall back to column 0
  for (const m of modules) {
    if (!column.has(m.id)) column.set(m.id, 0);
  }
  return column;
}

function buildNodes(
  modules: RepoMapModule[],
  relationships: RepoMap["relationships"],
): Node[] {
  const columns = computeColumns(modules, relationships);

  // Group module ids by column to compute row positions
  const byCol = new Map<number, string[]>();
  for (const [id, col] of columns) {
    const list = byCol.get(col) ?? [];
    list.push(id);
    byCol.set(col, list);
  }

  return modules.map((m) => {
    const col = columns.get(m.id) ?? 0;
    const colList = byCol.get(col) ?? [m.id];
    const row = colList.indexOf(m.id);

    return {
      id: m.id,
      position: { x: col * COL_GAP, y: row * (NODE_H + ROW_GAP) },
      data: { label: m.name },
      style: {
        width: NODE_W,
        height: NODE_H,
        fontSize: 13,
        background: "#f7f8fa",
        color: "#1f2328",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      },
    };
  });
}

function buildEdges(relationships: RepoMap["relationships"]): Edge[] {
  return relationships.map((rel, i) => ({
    id: `e-${i}-${rel.source}-${rel.target}`,
    source: rel.source,
    target: rel.target,
    label: rel.type !== "depends-on" ? rel.type : undefined,
    animated: false,
    style: { stroke: "#d1d5db", strokeWidth: 1.5 },
    labelStyle: { fontSize: 10, fill: "#9ca3af" },
  }));
}

// ─── component ───────────────────────────────────────────────────────────────

interface RepoDiagramProps {
  modules: RepoMapModule[];
  relationships: RepoMap["relationships"];
  selectedModuleId: string | null;
  onSelectModule: (id: string) => void;
}

export function RepoDiagram({
  modules,
  relationships,
  selectedModuleId,
  onSelectModule,
}: RepoDiagramProps) {
  const baseNodes = useMemo(
    () => buildNodes(modules, relationships),
    [modules, relationships],
  );
  const baseEdges = useMemo(() => buildEdges(relationships), [relationships]);

  // Apply selection highlight on top of base nodes
  const styledNodes = useMemo(
    () =>
      baseNodes.map((node) => {
        const isSelected = node.id === selectedModuleId;
        return {
          ...node,
          style: {
            ...node.style,
            fontWeight: isSelected ? 600 : 400,
            background: isSelected ? "#1f2328" : "#f7f8fa",
            color: isSelected ? "#ffffff" : "#1f2328",
            border: isSelected ? "1.5px solid #1f2328" : "1px solid #e5e7eb",
          },
        };
      }),
    [baseNodes, selectedModuleId],
  );

  const [, , onNodesChange] = useNodesState(styledNodes);
  const [edges, , onEdgesChange] = useEdgesState(baseEdges);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      onSelectModule(node.id);
    },
    [onSelectModule],
  );

  return (
    <ReactFlow
      nodes={styledNodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      nodesDraggable
      nodesConnectable={false}
      elementsSelectable={false}
    >
      <Background color="#e5e7eb" gap={20} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}
