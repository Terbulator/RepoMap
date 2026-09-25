# RepoMap

An AI teammate built on IBM Bob 2.0 that turns full-repository understanding
into a shared, living map of any codebase.

**Status: project foundation only.** This repository currently contains the
application shell (landing page, dashboard shell, a health API route) and
nothing else. None of the product modules described in the PRD are built yet.
See [docs/RepoMap-PRD.txt](docs/RepoMap-PRD.txt) for scope — it is the source
of truth.

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) + React 19 | Frontend and the PRD's thin backend API in one process — one dev server, one build, no CORS. Best fit for a 3-person hackathon. |
| Language | TypeScript (strict) | Catches mistakes in the graph data structures the map is built on. |
| Styling | Tailwind CSS v4 | No config files, no CSS architecture debate, fast demo polish. |
| Architecture/graph | `@xyflow/react` (React Flow) | Node-graph rendering for FR-4; clickable module nodes match PRD 5.1 directly. |
| Validation | `zod` | Validates the API boundary (free-text requests in FR-6) and env placeholders. |
| Backend | Next.js route handlers under `src/app/api` | Keeps the API thin; IBM Bob 2.0 calls stay server-side. |

Deliberately excluded (per PRD §7, non-requirements for this build): auth,
database, Docker, CI pipeline, test infrastructure, multi-user support.

## Getting started

Prerequisites: Node.js >= 20.9, pnpm.

```bash
pnpm install
cp .env.example .env.local   # optional; the app runs without it
pnpm dev                     # http://localhost:3000
```

Other commands:

```bash
pnpm build      # production build
pnpm start      # serve the production build
pnpm lint       # eslint
pnpm typecheck  # tsc --noEmit
```

## Project structure

```
docs/
  RepoMap-PRD.txt        Product requirements (source of truth)
src/
  app/
    layout.tsx           Root layout, header, footer
    page.tsx             Landing page
    dashboard/page.tsx   Dashboard shell (empty)
    api/health/route.ts  Health check route — thin backend proof
  components/
    layout/              Site header and footer
  features/
    registry.ts          Declares every PRD module, its tier, and status
  lib/
    env.ts               Server-side env placeholders (validated with zod)
    cn.ts                Class-name helper
```

## Environment variables

All optional for now; the app builds and runs without them. They exist so the
IBM Bob 2.0 integration has a defined seam. Never expose them to the browser.

| Variable | Purpose |
| --- | --- |
| `BOB_API_BASE_URL` | Base URL of the IBM Bob 2.0 service |
| `BOB_API_KEY` | API token for IBM Bob 2.0 |
| `BOB_PROJECT_ID` | Bob 2.0 project/team that analyses submitted repositories |

## Build plan

Feature work happens on branches off `main`. Planned milestones from PRD §9:

1. Repo map generation (backend + Bob 2.0 calls)
2. Onboarding Map UI + diagram rendering
3. Scope Clarifier (ScopeShield) end-to-end
4. Debug overlay on the seeded demo repo (Tier 2, optional)
5. Release readiness verdict on a seeded diff (Tier 2, optional)
6. Demo video and submission assets

Tier 3 (Application Maintenance, PRD 5.5) is roadmap only and must not be
represented as implemented.
