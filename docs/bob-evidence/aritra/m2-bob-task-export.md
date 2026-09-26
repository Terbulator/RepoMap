# Read the project and tell hoe much work done yet?

---

**Status:** active  **Date:** 2026-09-26

---

### 👤 User

Read the project and tell hoe much work done yet?

---

### 🤖 Assistant

> 🔧 called: list_files



> 🔧 **list_files** — .

### 🤖 Assistant

> 🔧 called: list_files, list_files



> 🔧 **list_files** — docs

> 🔧 **list_files** — src

### 🤖 Assistant

> 🔧 called: read_file, read_file



> 🔧 **read_file** — README.md

> 🔧 **read_file** — docs/RepoMap-PRD.txt

### 🤖 Assistant

> 🔧 called: read_file, read_file



> 🔧 **read_file** — src/app/dashboard/page.tsx

> 🔧 **read_file** — src/features/registry.ts

### 🤖 Assistant

Here's a clear breakdown of what's done vs. what's pending:

---

## RepoMap — Progress Overview

### ✅ What's built (M1 complete)

**Backend / API layer — fully done:**
- [`src/server/bob/`](src/server/bob/) — Full IBM Bob 2.0 provider abstraction: CLI provider ([`cli-provider.ts`](src/server/bob/cli-provider.ts)), mock provider ([`mock-provider.ts`](src/server/bob/mock-provider.ts)), output parser ([`output.ts`](src/server/bob/output.ts)), prompt ([`prompts.ts`](src/server/bob/prompts.ts)), workspace resolver ([`workspace.ts`](src/server/bob/workspace.ts))
- [`src/features/repomap/schema.ts`](src/features/repomap/schema.ts) — Full RepoMap zod contract (all FR-2 through FR-5 fields defined)
- [`src/features/repomap/normalize.ts`](src/features/repomap/normalize.ts) — Bob raw output → strict RepoMap contract, with diagram derivation
- [`src/server/repomap/analyze-repository.ts`](src/server/repomap/analyze-repository.ts) — Service orchestration layer
- [`src/app/api/repository/analyze/route.ts`](src/app/api/repository/analyze/route.ts) — `POST /api/repository/analyze` with full error codes
- [`src/app/api/health/route.ts`](src/app/api/health/route.ts) — `GET /api/health`
- [`src/lib/repository-url.ts`](src/lib/repository-url.ts) — Input parsing/canonicalization
- [`src/data/mock-analysis.json`](src/data/mock-analysis.json) — Deterministic dev fixture
- Unit tests for normalizer, Bob output parser, repository URL parser, and JSON parser

**ScopeShield (Tier 1, PRD 5.2) — 4 stages, all mock (no real Bob call):**
- Stage 1: Free-text input form with localStorage storage ([`feature-request.ts`](src/features/scope-shield/feature-request.ts))
- Stage 2: Mock hidden-scope / risk analysis engine with presets + keyword triggers + baseline ([`risk-analysis.ts`](src/features/scope-shield/risk-analysis.ts), [`risk-analysis-view.tsx`](src/features/scope-shield/risk-analysis-view.tsx))
- Stage 3: Mock clarifying questions generator with keyword scoring and copy button ([`clarifying-questions.ts`](src/features/scope-shield/clarifying-questions.ts), [`clarifying-questions-view.tsx`](src/features/scope-shield/clarifying-questions-view.tsx))
- Stage 4: Mock drafted reply builder with editable textarea and copy/reset ([`drafted-reply.ts`](src/features/scope-shield/drafted-reply.ts), [`drafted-reply-view.tsx`](src/features/scope-shield/drafted-reply-view.tsx))

---

### 🔲 What's NOT built yet

| Item | PRD | Tier | Status |
|---|---|---|---|
| **Onboarding Map UI** — diagram rendering (React Flow), module click-through, summary/gotchas view | §5.1 | 1 | Not started |
| **Live Bob 2.0 verification** — a real `BOB_API_KEY` run has never succeeded | §7 | — | Blocked (no valid key) |
| **ScopeShield → real Bob** — all 3 stages currently run deterministic mock logic in the browser | §5.2 | 1 | Mock only |
| **Dashboard shell** — fully empty, just placeholder text | §5.1 | 1 | Empty shell |
| **Debug & Code Review Overlay** | §5.3 | 2 | Not started |
| **Release Readiness Check** | §5.4 | 2 | Not started |
| **Application Maintenance** | §5.5 | 3 | Roadmap only, intentionally not built |

---

### Milestone Status

| Milestone | Status |
|---|---|
| **M1** — Repo map backend + Bob CLI integration | ✅ Done (Bob CLI unverified with live key) |
| **M2** — Onboarding Map UI + diagram | ❌ Not started |
| **M3** — ScopeShield end-to-end (real Bob) | 🟡 Mock built, real Bob not wired |
| **M4** — Debug overlay | ❌ Not started |
| **M5** — Release readiness verdict | ❌ Not started |
| **M6** — Demo video + submission assets | ❌ Not started |

**Bottom line:** The backend foundation (M1) and ScopeShield mock UI (stages 1–4) are solid. The current branch is `feature/onboarding-map`, meaning M2 (the Onboarding Map UI and diagram rendering) is the active work in progress. That's the biggest gap between now and a submittable Tier 1 product.

---

### 👤 User

We are now moving to M2: Onboarding Map.

First inspect the current repository and existing M1 backend/Bob integration. Do not rewrite or break the existing Bob integration or ScopeShield.

Implement ONLY the Tier 1 Onboarding Map from the PRD.

Requirements:

1. Create the Onboarding Map dashboard UI.
2. Add repository input using the existing canonical repository analysis API:
   POST /api/repository/analyze
3. Display:
   - plain-English project purpose/summary
   - detected technology stack
   - structural modules/folders
   - ranked 2–3 recommended starting files
   - common gotchas
   - visual module/file relationship diagram
4. Use the existing RepoMap contract/schema and normalized analysis data.
5. The diagram must be derived from the existing relationships in the RepoMap contract. Do NOT invent relationships in the frontend.
6. Clicking a module should show its explanation/details.
7. Include clear loading, empty, success and error states.
8. Keep the UI professional and hackathon-demo ready.
9. Use the existing project styling/components where possible.
10. Do not implement Debug & Code Review yet.
11. Do not implement Release Readiness yet.
12. Do not implement Application Maintenance.
13. Do not modify ScopeShield unless absolutely required for shared infrastructure.
14. Do not create fake Bob results for the production flow. Existing mock fixtures may remain for tests/dev only.

Before coding:
- inspect src/features/repomap/
- inspect src/server/repomap/
- inspect /api/repository/analyze
- inspect the RepoMap schema and normalization code
- inspect existing dashboard/page components

Then implement the smallest clean architecture that satisfies the PRD.

After implementation run:

pnpm test
pnpm build

Both must pass.

Then run:

git diff --check

Do NOT commit or push.

Finally report:
- files created/changed
- what the Onboarding Map now does
- API flow
- diagram implementation
- test result
- build result
- any remaining limitation

---

### 🤖 Assistant

> 🔧 called: update_todo_list



> 🔧 **update_todo_list** — 
[-] Inspect existing codebase (repomap schema, normalize, API route, dashboard, components)
[ ] Plan the Onboarding Map architecture
[ ] Implement the Onboarding Map UI
[ ] Run pnpm test and pnpm build
[ ] Run git diff --check
[ ] Report results


### 🤖 Assistant

> 🔧 called: read_file, read_file



> 🔧 **read_file** — src/features/repomap/schema.ts

> 🔧 **read_file** — src/features/repomap/normalize.ts

### 🤖 Assistant

> 🔧 called: read_file, read_file



> 🔧 **read_file** — src/app/page.tsx

> 🔧 **read_file** — src/app/api/repository/analyze/route.ts

### 🤖 Assistant

> 🔧 called: read_file, read_file, read_file



> 🔧 **read_file** — src/components/layout/site-footer.tsx

> 🔧 **read_file** — src/components/layout/site-header.tsx

> 🔧 **read_file** — src/app/layout.tsx

### 🤖 Assistant

> 🔧 called: read_file, read_file



> 🔧 **read_file** — src/app/scope-shield/page.tsx

> 🔧 **read_file** — src/data/mock-analysis.json

### 🤖 Assistant

> 🔧 called: read_file, read_file



> 🔧 **read_file** — package.json

> 🔧 **read_file** — src/features/repomap/request.ts

### 🤖 Assistant

> 🔧 called: read_file, read_file



> 🔧 **read_file** — src/lib/cn.ts

> 🔧 **read_file** — src/features/scope-shield/scope-shield.tsx

### 🤖 Assistant

> 🔧 called: read_file, read_file



> 🔧 **read_file** — src/app/globals.css

> 🔧 **read_file** — next.config.ts

### 🤖 Assistant

> 🔧 called: read_file



> 🔧 **read_file** — tsconfig.json

### 🤖 Assistant

> 🔧 called: update_todo_list

Now I have a thorough understanding of the codebase. Let me plan and implement the Onboarding Map.

> 🔧 **update_todo_list** — 
[x] Inspect existing codebase (repomap schema, normalize, API route, dashboard, components)
[-] Plan the Onboarding Map architecture
[ ] Implement the Onboarding Map UI
[ ] Run pnpm test and pnpm build
[ ] Run git diff --check
[ ] Report results


### 🤖 Assistant

> 🔧 called: update_todo_list

**Plan:**

1. **`src/features/onboarding-map/api-client.ts`** — thin browser-side fetch wrapper calling `POST /api/repository/analyze`, typed against the existing schema
2. **`src/features/onboarding-map/diagram.tsx`** — `@xyflow/react` graph component consuming `modules` + `relationships` from the RepoMap contract (no invented edges)
3. **`src/features/onboarding-map/onboarding-map.tsx`** — main client component orchestrating: input form → loading → success (all sections) / error states
4. **`src/app/dashboard/page.tsx`** — replace the empty shell with the `OnboardingMap` component

All types come from the existing `src/features/repomap/schema.ts`. No new server code. No ScopeShield changes.

> 🔧 **update_todo_list** — 
[x] Inspect existing codebase (repomap schema, normalize, API route, dashboard, components)
[x] Plan the Onboarding Map architecture
[-] Implement the Onboarding Map UI
[ ] Run pnpm test and pnpm build
[ ] Run git diff --check
[ ] Report results


### 🤖 Assistant

> 🔧 called: write_file



> 🔧 **write_file** — src/features/onboarding-map/api-client.ts

### 🤖 Assistant

> 🔧 called: write_file

Now build the diagram component. `@xyflow/react` is already a dependency. I'll use it with a simple auto-layout (left-to-right levels using topological sort, no external layout library needed):

> 🔧 **write_file** — "use client";

import { useCallback, useMemo } from "react";
import ReactFlow, {
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

/** Assign each module a column (0-based) using BFS from sources with no in-edges. */
function computeColumns(
  modules: RepoMapModule[],
  relationships: RepoMap["relationships"],
): Map<string, number> {
  const inDegree = new Map<string, number>(modules.map((m) => [m.id, 0]));
  for (const rel of relationships) {
    inDegree.set(rel.target, (inDegree.get(rel.target) ?? 0) + 1);
  }

  const column = new Map<string, number>();
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) {
      queue.push(id);
      column.set(id, 0);
    }
  }
  // BFS propagation
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
  // Any module still without a column (isolated)
  for (const m of modules) {
    if (!column.has(m.id)) column.set(m.id, 0);
  }
  return column;
}

function buildNodes(
  modules: RepoMapModule[],
  relationships: RepoMap["relationships"],
  selectedId: string | null,
): Node[] {
  const columns = computeColumns(modules, relationships);

  // Group by column
  const byCol = new Map<number, string[]>();
  for (const [id, col] of columns) {
    if (!byCol.has(col)) byCol.set(col, []);
    byCol.get(col)!.push(id);
  }

  return modules.map((m) => {
    const col = columns.get(m.id) ?? 0;
    const colList = byCol.get(col) ?? [m.id];
    const row = colList.indexOf(m.id);
    const isSelected = m.id === selectedId;

    return {
      id: m.id,
      position: { x: col * COL_GAP, y: row * (NODE_H + ROW_GAP) },
      data: { label: m.name },
      style: {
        width: NODE_W,
        height: NODE_H,
        fontSize: 13,
        fontWeight: isSelected ? 600 : 400,
        background: isSelected ? "#1f2328" : "#f7f8fa",
        color: isSelected ? "#ffffff" : "#1f2328",
        border: isSelected ? "1.5px solid #1f2328" : "1px solid #e5e7eb",
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
  const initialNodes = useMemo(
    () => buildNodes(modules, relationships, selectedModuleId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modules, relationships],
  );
  const initialEdges = useMemo(() => buildEdges(relationships), [relationships]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  // Update node styles when selection changes without re-creating all nodes
  useMemo(() => {
    setNodes((prev) =>
      prev.map((node) => {
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
    );
    // only run when selection changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModuleId]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      onSelectModule(node.id);
    },
    [onSelectModule],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      nodesDraggable
      nodesConnectable={false}
      elementsSelectable={false}
      proOptions={{ hideAttribution: false }}
    >
      <Background color="#e5e7eb" gap={20} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}


### 🤖 Assistant

> 🔧 called: execute_command

Let me check the correct `@xyflow/react` v12 API (not the older `reactflow` package):

> 🔧 **execute_command** — Get-Content node_modules/@xyflow/react/dist/index.d.ts -TotalCount 80 2>$null; if (-not $?) { Get-ChildItem node_modules/@xyflow/react/dist/ | Select-Object Name }

### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — Get-ChildItem node_modules/@xyflow/react/ | Select-Object Name

### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — Get-Content node_modules/@xyflow/react/package.json | Select-String '"types"|"exports"|"main"' | Select-Object -First 10

### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — Get-Content node_modules/@xyflow/react/dist/esm/index.d.ts -TotalCount 100

### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — Get-Content node_modules/@xyflow/react/dist/esm/types/index.d.ts -TotalCount 80 2>$null; if (-not $?) { Get-ChildItem node_modules/@xyflow/react/dist/esm/types/ | Select-Object Name }

### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — Get-Content node_modules/@xyflow/react/dist/esm/types/nodes.d.ts -TotalCount 60

### 🤖 Assistant

> 🔧 called: execute_command

Good — `Node`, `Edge`, `NodeMouseHandler`, `useNodesState`, `useEdgesState` all exist. Let me also check if `ReactFlow` default export and `Background`/`Controls` are in `additional-components`:

> 🔧 **execute_command** — Get-Content node_modules/@xyflow/react/dist/esm/additional-components/index.d.ts -TotalCount 30

### 🤖 Assistant

> 🔧 called: execute_command

Good. `Background` and `Controls` are available. Now let me check the `ReactFlow` default export's `onNodeClick` prop name:

> 🔧 **execute_command** — Get-Content node_modules/@xyflow/react/dist/esm/types/component-props.d.ts -TotalCount 80

### 🤖 Assistant

> 🔧 called: write_file

The API is `onNodeClick` (not `onClick`), confirmed. Now let me rewrite the diagram component with the correct v12 API:

> 🔧 **write_file** — "use client";

import { useCallback, useMemo } from "react";
import ReactFlow, {
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

  const [nodes, , onNodesChange] = useNodesState(styledNodes);
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


### 🤖 Assistant

> 🔧 called: execute_command

Now let me check if `Controls` has `showInteractive` prop in v12:

> 🔧 **execute_command** — Get-Content node_modules/@xyflow/react/dist/esm/additional-components/Controls/index.d.ts -TotalCount 40

### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — Get-Content node_modules/@xyflow/react/dist/esm/additional-components/Controls/types.d.ts

### 🤖 Assistant

> 🔧 called: write_file

`showInteractive` is valid. Now build the main onboarding-map component:

> 🔧 **write_file** — "use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { cn } from "@/lib/cn";
import type { RepoMap, RepoMapModule } from "@/features/repomap/schema";
import { analyzeRepositoryClient } from "./api-client";
import { RepoDiagram } from "./diagram";

// ─── types ───────────────────────────────────────────────────────────────────

type State =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "error"; code: string; message: string }
  | { phase: "success"; analysis: RepoMap };

// ─── sub-components ──────────────────────────────────────────────────────────

function ProviderBadge({ analysis }: { analysis: RepoMap }) {
  const isMock = analysis.provenance.provider === "mock";
  return (
    <span
      title={analysis.provenance.notice ?? undefined}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        isMock
          ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
          : "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950 dark:text-green-300",
      )}
    >
      {isMock ? "Mock data" : "IBM Bob 2.0"}
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
      {children}
    </h2>
  );
}

function ModuleDetail({ module }: { module: RepoMapModule }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-sm font-semibold">{module.name}</p>
      <p className="mt-0.5 font-mono text-xs text-neutral-500">{module.path}</p>
      <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-300">{module.purpose}</p>

      {module.files.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-neutral-500">Key files</p>
          <ul className="mt-1.5 space-y-1">
            {module.files.map((f) => (
              <li key={f} className="font-mono text-xs text-neutral-600 dark:text-neutral-400">
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {module.dependencies.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-neutral-500">Depends on</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {module.dependencies.map((d) => (
              <span
                key={d}
                className="rounded border border-neutral-200 bg-white px-2 py-0.5 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-800"
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── result view ─────────────────────────────────────────────────────────────

function OnboardingMapResult({ analysis }: { analysis: RepoMap }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedModule: RepoMapModule | null =
    analysis.modules.find((m) => m.id === selectedId) ?? null;

  return (
    <div className="mt-8 space-y-10">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-200 pb-6 dark:border-neutral-800">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{analysis.repository.name}</h1>
          <p className="mt-0.5 font-mono text-xs text-neutral-500">{analysis.repository.url}</p>
        </div>
        <div className="flex items-center gap-3">
          <ProviderBadge analysis={analysis} />
          <span className="text-xs text-neutral-400">
            {new Date(analysis.provenance.generatedAt).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Project summary */}
      <section aria-labelledby="summary-heading">
        <SectionHeading>
          <span id="summary-heading">Project summary</span>
        </SectionHeading>
        <p className="mt-3 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {analysis.projectSummary}
        </p>
      </section>

      {/* Technology stack */}
      {analysis.stack.length > 0 && (
        <section aria-labelledby="stack-heading">
          <SectionHeading>
            <span id="stack-heading">Technology stack</span>
          </SectionHeading>
          <div className="mt-3 flex flex-wrap gap-2">
            {analysis.stack.map((tech) => (
              <span
                key={tech}
                className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium dark:border-neutral-700 dark:bg-neutral-900"
              >
                {tech}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Diagram + module detail */}
      <section aria-labelledby="diagram-heading">
        <SectionHeading>
          <span id="diagram-heading">Module relationship diagram</span>
        </SectionHeading>
        <p className="mt-1 text-xs text-neutral-500">
          Click a module to see its details.
        </p>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Diagram */}
          <div
            className="h-80 rounded-lg border border-neutral-200 dark:border-neutral-700"
            style={{ minHeight: 280 }}
          >
            <RepoDiagram
              modules={analysis.modules}
              relationships={analysis.relationships}
              selectedModuleId={selectedId}
              onSelectModule={setSelectedId}
            />
          </div>

          {/* Module detail panel */}
          <div>
            {selectedModule ? (
              <ModuleDetail module={selectedModule} />
            ) : (
              <div className="flex h-full min-h-[160px] items-center justify-center rounded-lg border border-dashed border-neutral-200 p-6 text-center dark:border-neutral-700">
                <p className="text-sm text-neutral-400">
                  Select a module in the diagram to see its explanation.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Module list as fallback / supplement */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {analysis.modules.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedId(m.id)}
              className={cn(
                "rounded-lg border px-4 py-3 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900",
                m.id === selectedId
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                  : "border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:hover:border-neutral-500 dark:hover:bg-neutral-800",
              )}
            >
              <span className="font-medium">{m.name}</span>
              <span className="ml-2 font-mono text-xs opacity-60">{m.path}</span>
              <p
                className={cn(
                  "mt-1.5 text-xs line-clamp-2",
                  m.id === selectedId ? "text-neutral-200 dark:text-neutral-600" : "text-neutral-500",
                )}
              >
                {m.purpose}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Recommended starting files */}
      <section aria-labelledby="files-heading">
        <SectionHeading>
          <span id="files-heading">Where to start reading</span>
        </SectionHeading>
        <p className="mt-1 text-xs text-neutral-500">
          Ranked 1–{analysis.recommendedFiles.length} by IBM Bob 2.0.
        </p>
        <ol className="mt-4 space-y-3">
          {analysis.recommendedFiles
            .slice()
            .sort((a, b) => a.rank - b.rank)
            .map((file) => (
              <li key={file.path} className="flex gap-4">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-neutral-200 text-xs font-semibold text-neutral-500 dark:border-neutral-700">
                  {file.rank}
                </span>
                <div>
                  <p className="font-mono text-sm font-medium">{file.path}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{file.reason}</p>
                </div>
              </li>
            ))}
        </ol>
      </section>

      {/* Gotchas */}
      {analysis.gotchas.length > 0 && (
        <section aria-labelledby="gotchas-heading">
          <SectionHeading>
            <span id="gotchas-heading">Common gotchas</span>
          </SectionHeading>
          <ul className="mt-4 space-y-2">
            {analysis.gotchas.map((gotcha, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-800 dark:bg-amber-950"
              >
                <span className="mt-0.5 flex-shrink-0 text-amber-500" aria-hidden="true">
                  ⚠
                </span>
                <span className="text-amber-900 dark:text-amber-200">{gotcha}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

/**
 * OnboardingMap (PRD §5.1, Tier 1, M2).
 *
 * Renders the repository input form, calls POST /api/repository/analyze, then
 * displays the full Onboarding Map: summary, stack, module diagram, recommended
 * starting files, and gotchas. All data comes from the RepoMap contract — no
 * frontend-invented relationships.
 */
export function OnboardingMap() {
  const [repo, setRepo] = useState("");
  const [state, setState] = useState<State>({ phase: "idle" });

  const isLoading = state.phase === "loading";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = repo.trim();
    if (!trimmed) return;

    setState({ phase: "loading" });

    const result = await analyzeRepositoryClient(trimmed);
    if (result.ok) {
      setState({ phase: "success", analysis: result.analysis });
    } else {
      setState({ phase: "error", code: result.code, message: result.message });
    }
  }

  function handleReset() {
    setState({ phase: "idle" });
    setRepo("");
  }

  return (
    <div>
      {/* Input form — always shown unless we have a success result */}
      {state.phase !== "success" && (
        <section aria-labelledby="onboarding-heading" className="max-w-2xl">
          <h1 id="onboarding-heading" className="text-2xl font-semibold tracking-tight">
            Onboarding Map
          </h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
            Enter a GitHub repository and IBM Bob 2.0 will generate a plain-English map: project
            summary, module breakdown, recommended starting files, and a relationship diagram.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start">
            <label htmlFor="repository-input" className="sr-only">
              GitHub repository URL or owner/repo
            </label>
            <input
              id="repository-input"
              type="text"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="https://github.com/owner/repo  or  owner/repo"
              disabled={isLoading}
              className="flex-1 rounded-md border border-neutral-300 bg-transparent px-4 py-2.5 text-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:focus:ring-white"
            />
            <button
              type="submit"
              disabled={!repo.trim() || isLoading}
              className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {isLoading ? "Analyzing…" : "Analyze"}
            </button>
          </form>

          <p className="mt-3 text-xs text-neutral-500">
            Only public GitHub repositories are supported. Analysis may take up to 5 minutes when
            IBM Bob 2.0 is active.
          </p>
        </section>
      )}

      {/* Loading state */}
      {state.phase === "loading" && (
        <div
          role="status"
          aria-live="polite"
          className="mt-10 flex flex-col items-center gap-4 py-16 text-center"
        >
          <span
            aria-hidden="true"
            className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900 dark:border-neutral-700 dark:border-t-white"
          />
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            IBM Bob 2.0 is reading the repository and building the map…
          </p>
          <p className="text-xs text-neutral-400">This can take several minutes.</p>
        </div>
      )}

      {/* Error state */}
      {state.phase === "error" && (
        <div
          role="alert"
          className="mt-8 max-w-2xl rounded-lg border border-red-200 bg-red-50 p-5 dark:border-red-800 dark:bg-red-950"
        >
          <p className="text-sm font-medium text-red-800 dark:text-red-300">Analysis failed</p>
          <p className="mt-1.5 text-sm text-red-700 dark:text-red-400">{state.message}</p>
          <p className="mt-1 font-mono text-xs text-red-500">code: {state.code}</p>
          <button
            type="button"
            onClick={handleReset}
            className="mt-4 rounded-md border border-red-300 px-4 py-2 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900"
          >
            Try again
          </button>
        </div>
      )}

      {/* Success state */}
      {state.phase === "success" && (
        <>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              ← Analyze another repository
            </button>
          </div>
          <OnboardingMapResult analysis={state.analysis} />
        </>
      )}
    </div>
  );
}


### 🤖 Assistant

> 🔧 called: write_file

Now update the dashboard page to mount the OnboardingMap:

> 🔧 **write_file** — import type { Metadata } from "next";
import { OnboardingMap } from "@/features/onboarding-map/onboarding-map";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Analyze a repository and explore its Onboarding Map.",
};

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <OnboardingMap />
    </div>
  );
}


### 🤖 Assistant

> 🔧 called: update_todo_list

Now run the tests and build:

> 🔧 **update_todo_list** — 
[x] Inspect existing codebase (repomap schema, normalize, API route, dashboard, components)
[x] Plan the Onboarding Map architecture
[x] Implement the Onboarding Map UI
[-] Run pnpm test and pnpm build
[ ] Run git diff --check
[ ] Report results


### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — pnpm test 2>&1

### 🤖 Assistant

> 🔧 called: execute_command

All 55 tests pass. Now build:

> 🔧 **execute_command** — pnpm build 2>&1

### 🤖 Assistant

> 🔧 called: execute_command

`ReactFlow` is not a default export in v12 — it's a named export. Let me verify:

> 🔧 **execute_command** — Select-String -Path node_modules/@xyflow/react/dist/esm/index.d.ts -Pattern "ReactFlow"

### 🤖 Assistant

> 🔧 called: apply_diff

It IS exported as `default as ReactFlow` — but Turbopack is treating the ESM module differently. The issue is the default import style. Let me use the named import instead:

> 🔧 **apply_diff** — src/features/onboarding-map/diagram.tsx

### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — pnpm build 2>&1

### 🤖 Assistant

> 🔧 called: execute_command

Build passes. Now run `git diff --check`:

> 🔧 **execute_command** — git diff --check 2>&1

### 🤖 Assistant

> 🔧 called: execute_command

That's a git line-ending warning (`LF → CRLF`), not a whitespace error. The exit code 1 is from the warning being printed to stderr. Let me verify there are no actual trailing-whitespace or conflict-marker issues:

> 🔧 **execute_command** — git diff --check --ignore-cr-at-eol 2>&1

### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — git diff --check 2>&1 | Select-String "whitespace|conflict" -CaseSensitive

### 🤖 Assistant

> 🔧 called: execute_command



> 🔧 **execute_command** — git diff --check 2>&1; echo "exit: $LASTEXITCODE"

### 🤖 Assistant

> 🔧 called: execute_command

Exit code is **0** — `git diff --check` passes clean. The error code 1 from the earlier run was PowerShell interpreting stderr output as an error; the actual git exit code is 0. No whitespace errors, no conflict markers.

Let me also confirm the new files are all present:

> 🔧 **execute_command** — git status --short 2>&1

### 🤖 Assistant

> 🔧 called: update_todo_list



> 🔧 **update_todo_list** — 
[x] Inspect existing codebase (repomap schema, normalize, API route, dashboard, components)
[x] Plan the Onboarding Map architecture
[x] Implement the Onboarding Map UI
[x] Run pnpm test and pnpm build
[x] Run git diff --check
[-] Report results


### 🤖 Assistant

---

## M2 Onboarding Map — Implementation Report

### Files created / changed

| File | Change |
|---|---|
| [`src/features/onboarding-map/api-client.ts`](src/features/onboarding-map/api-client.ts) | **New** — browser-side typed fetch wrapper around `POST /api/repository/analyze` |
| [`src/features/onboarding-map/diagram.tsx`](src/features/onboarding-map/diagram.tsx) | **New** — `@xyflow/react` v12 diagram component; layout + selection |
| [`src/features/onboarding-map/onboarding-map.tsx`](src/features/onboarding-map/onboarding-map.tsx) | **New** — main `"use client"` component; all states + all display sections |
| [`src/app/dashboard/page.tsx`](src/app/dashboard/page.tsx) | **Modified** — replaced empty shell with `<OnboardingMap />` |

No ScopeShield files were touched. No server/API files were changed.

---

### What the Onboarding Map now does

**Idle state** — repository input form (URL or `owner/repo` shorthand), with helper text about public-only repos and analysis time.

**Loading state** — full-page spinner with `role="status"` + `aria-live` and copy explaining Bob is building the map. Progress message mentions the analysis can take several minutes.

**Error state** — `role="alert"` panel shows the user-readable message, the API error code, and a "Try again" button that resets to idle.

**Success state** — shows all five PRD §5.1 / FR-2–FR-5 elements:
1. **Repository header** — name, URL, generated-at timestamp, provider badge (amber "Mock data" or green "IBM Bob 2.0")
2. **Project summary** — `projectSummary` verbatim
3. **Technology stack** — each `stack[]` entry as a pill badge
4. **Module relationship diagram** — interactive `@xyflow/react` graph; nodes are positioned by topological column (BFS from in-degree-0 nodes), edges from `relationships[]` only (no invented edges); clicking a node highlights it and populates the detail panel
5. **Module grid** — same modules as clickable buttons below the diagram (keyboard accessible); selected module shows name, path, purpose, key files, and dependencies in a detail panel
6. **Where to start reading** — ranked `recommendedFiles[]` list (rank 1–3), each with path + reason
7. **Common gotchas** — `gotchas[]` in amber warning cards

The success view has a "← Analyze another repository" link that resets to idle.

---

### API flow

```
User types owner/repo → submit form
  → browser calls POST /api/repository/analyze  (api-client.ts)
  → route handler (existing, unchanged)
  → analyzeRepository service (existing, unchanged)
  → mock-provider or cli-provider (existing, unchanged)
  → normalize to RepoMap contract (existing, unchanged)
  → { success: true, analysis: RepoMap }
  → OnboardingMap renders all sections from the contract
```

---

### Diagram implementation

[`diagram.tsx`](src/features/onboarding-map/diagram.tsx) builds layout from the contract's `relationships[]` array:

1. **Column assignment** — Kahn-style BFS: nodes with no in-edges go to column 0; each target is placed at `max(col(source) + 1)`. Isolated modules (zero relationships) fall to column 0.
2. **Row assignment** — within each column, modules are ordered by insertion order.
3. **Edges** — created directly from `analysis.relationships[]`; type label shown when it isn't `"depends-on"`.
4. **Selection** — clicking a node calls `onSelectModule(id)`; the selected node gets an inverted (dark) style; the parent component renders the module detail panel.

No external layout library. No invented structure.

---

### Test result

```
ℹ tests 55 · pass 55 · fail 0
```

All pre-existing tests pass unchanged.

---

### Build result

```
✓ Compiled successfully
✓ TypeScript clean
/dashboard → Static (○)
```

Clean production build, no new warnings.

---

### `git diff --check`

Exit code **0**. Only a harmless `LF→CRLF` autocrlf advisory on the modified dashboard page (Windows line-ending normalisation, not a whitespace error).

---

### Remaining limitations

- **Real Bob 2.0 unverified** — the `BOB_API_KEY` is not set; the mock provider runs by default. This is a pre-existing constraint documented in the README. Someone must set `BOB_API_KEY` + `REPOMAP_PROVIDER=bob-2.0` before the demo.
- **Diagram layout is simple** — the BFS column layout works well for a few modules; a deep DAG with many parallel branches may benefit from a proper Dagre layout (can be added later by swapping `computeColumns` for a Dagre call — no API changes needed).
- **No persistence** — every submit re-runs the analysis (pre-existing limitation per PRD §7).
- **Diagram CSS loaded globally** — `@xyflow/react/dist/style.css` is imported inside the client component, which is the recommended pattern for the package.