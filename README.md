# RepoMap

An AI teammate built on IBM Bob 2.0 that turns full-repository understanding
into a shared, living map of any codebase.

**Status: M1 (backend) complete.** The landing page, dashboard shell, health
route and the RepoMap generation API exist. The dashboard still renders an
empty shell — the diagram and the Tier 1/2 modules are not built. See
[docs/RepoMap-PRD.txt](docs/RepoMap-PRD.txt) for scope — it is the source of
truth.

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
pnpm test       # node:test unit tests (data contract, normaliser, Bob payload parsing)
```

## API

### `POST /api/repomap`

Generates the repo map for a repository (PRD 5.1, FR-1 to FR-5).

```bash
curl -X POST http://localhost:3000/api/repomap \
  -H "content-type: application/json" \
  -d '{"repository":"https://github.com/owner/repo"}'
```

`repository` accepts a GitHub URL or the `owner/repo` shorthand. Responses:

| Status | Meaning |
| --- | --- |
| 200 | RepoMap contract (below) |
| 400 | Missing/!https/non-GitHub repository input |
| 502 | IBM Bob 2.0 failed, timed out, or returned unusable analysis |
| 503 | Bob 2.0 is not configured (no `BOB_API_BASE_URL`) |

The contract lives in `src/features/repomap/schema.ts` and is validated with
zod on every response:

```jsonc
{
  "schemaVersion": 1,
  "repository": { "url": "...", "slug": "owner/repo", "name": "repo" },
  "provenance": {                  // PRD §7 traceability
    "provider": "bob-2.0",
    "bobTaskId": "task_...",        // null if the service exposes none
    "model": "...",
    "requestedAt": "...", "completedAt": "...", "durationMs": 1234
  },
  "summary": "...",                // FR-2
  "stack": ["TypeScript", "Next.js"],
  "modules": [                     // structural breakdown
    { "id": "src-app", "name": "web", "path": "src/app",
      "responsibility": "...", "entryPoints": ["src/app/page.tsx"],
      "dependsOn": ["src/server"] }
  ],
  "recommendedFiles": [            // FR-3, always 2-3 entries
    { "rank": 1, "path": "README.md", "why": "..." }
  ],
  "diagram": {                     // FR-4, framework-agnostic
    "nodes": [{ "id": "src-app", "label": "web", "kind": "module", "path": "src/app" }],
    "edges": [{ "id": "...", "source": "src-app", "target": "src-server",
                "relation": "depends-on" }]
  },
  "gotchas": [{ "title": "...", "detail": "..." }]  // FR-5
}
```

The diagram is deliberately framework-agnostic; the dashboard will map these
nodes and edges onto React Flow when the UI work starts.

### `GET /api/health`

Liveness plus whether Bob 2.0 is configured.

## ScopeShield — Stages 1–4 (input, risk analysis, questions, drafted reply)

`/scope-shield` takes a free-text feature request, trims and squeezes the
whitespace, and stores the result in the browser under the localStorage key
`featureRequest`. Empty input is rejected with "Please describe the feature you
want to build." A successful submit shows "Feature request stored successfully!"
and logs the request to the browser console. The stored value is also printed
with `localStorage.getItem("featureRequest")` in DevTools → Application → Local
Storage.

Stage 2 adds a **mock** hidden-scope analysis below the input.
`analyzeFeatureRequest` in `src/features/scope-shield/risk-analysis.ts` returns a
risk level (HIGH/MEDIUM/LOW) and the work nobody asked for, grouped by
architectural layer (frontend, backend, database, infrastructure, security &
auth). It combines three deterministic sources:

| Source | What it is | Example |
| --- | --- | --- |
| `preset` | Structured templates for the three common asks — "Add authentication", "Add payments", "Create user roles" | session lifecycle, idempotent charge flow, permission checks |
| `trigger` | Keyword rules, max 2 per layer | `migration` → index and rollback plan, `middleware` → placement and ordering |
| `baseline` | Unspoken for almost any request | empty/loading/error states, transaction boundaries, deploy order |

The UI renders these in a "Hidden Scope & Unspoken Requirements" section: one
amber-bordered card per layer, each item tagged with its layer, its concern tags
(`migration`, `middleware`, `validation`, …) and where it came from.

Stage 3 adds a **mock** "Clarifying Questions" section below the risk analysis.
`generateClarifyingQuestions` in
`src/features/scope-shield/clarifying-questions.ts` scores a pool of questions by
keyword match, so the three or four returned follow the request: an
authentication ask surfaces the multi-tenant role and session-lifetime
questions, a payments ask surfaces reconciliation and provider-downtime
questions. Each question carries the ambiguity it resolves and the layer it
protects, can be ticked off in the UI, and the whole list is copyable with
`formatQuestions` (the "Copy Questions" button).

Stage 4 adds a **mock** "Drafted Professional Reply" below the questions.
`detectStackContext` in `src/features/scope-shield/stack-context.ts` returns the
stack the reply is grounded in (FR-7): a base project profile plus whatever the
request implies (Stripe, Twilio, object storage, full-text search, …).
`buildDraftedReply` in `src/features/scope-shield/drafted-reply.ts` stitches the
request, that stack, the risk level, up to four detected hidden-scope items and
the clarifying questions into an email-shaped message. The UI shows it in an
editable textarea with "Copy Drafted Reply" and "Reset Draft".

Every stage so far is a mock: the analysis, the questions and the draft are
computed in the browser, deterministic, and consult no AI. The real IBM Bob 2.0
provider replaces `analyzeFeatureRequest`, `generateClarifyingQuestions` and
`buildDraftedReply`; the `RiskAnalysis`, `ClarifyingQuestion` and
`StackContext` shapes are the contracts that call must satisfy. No auth,
database, or Tier 2/3 work is in any of these stages.

## IBM Bob 2.0 integration

`src/server/bob/` is the only place that talks to Bob 2.0:

| File | Role |
| --- | --- |
| `provider.ts` | Provider interface + `BobProviderError` |
| `http-provider.ts` | Real HTTP call (endpoint, project, model, timeout all env-driven) |
| `prompts.ts` | The single analysis prompt, written from PRD 5.1 |
| `json.ts` | Tolerant extraction of JSON from model output (fences, prose, envelopes) |
| `index.ts` | Provider resolution; no silent fallback provider |

Two deliberate choices:

- **No stub/fake provider.** An invented analysis would be indistinguishable
  from a real one in the UI, which PRD §7 ("transparency of AI involvement")
  rules out. Without credentials the API returns 503 rather than fake data.
- **Normalisation, not trust.** `src/features/repomap/normalize.ts` converts
  Bob's answer into the strict contract: capped at 3 recommended files, deduped
  modules, derived diagram nodes/edges, dropped junk. It raises
  `EmptyRepoMapAnalysisError` only when there is no usable map at all, rather
  than inventing one.

`scripts/fake-bob-server.mjs` is a local stand-in used to verify the pipeline
before real credentials exist. It is a development script, not part of the app:

```bash
node scripts/fake-bob-server.mjs                                  # terminal 1
$env:BOB_API_BASE_URL="http://127.0.0.1:4010"; pnpm dev           # terminal 2 (PowerShell)
```

## Project structure

```
docs/
  RepoMap-PRD.txt        Product requirements (source of truth)
scripts/
  fake-bob-server.mjs     Local Bob 2.0 stand-in for pipeline verification (dev only)
src/
  app/
    layout.tsx           Root layout, header, footer
    page.tsx             Landing page
    dashboard/page.tsx   Dashboard shell (still empty)
    scope-shield/page.tsx ScopeShield Stage 1 + 2 UI
    api/health/route.ts  Health check route
    api/repomap/route.ts POST /api/repomap — repo map generation (M1)
  components/
    layout/              Site header and footer
  features/
    registry.ts          Declares every PRD module, its tier, and status
    repomap/
      schema.ts          RepoMap + Bob analysis contracts (zod)
      normalize.ts       Bob answer -> strict RepoMap, diagram derivation
      request.ts         POST body contract
    scope-shield/
      feature-request.ts   Stage 1: localStorage key + text cleanup
      scope-shield.tsx     Stage 1 + 2: input form, loading, result mount
      risk-analysis.ts     Stage 2: mock hidden-scope detector + contract
      risk-analysis-view.tsx Stage 2: risk badge, per-layer hidden-scope cards
      clarifying-questions.ts Stage 3: mock question pool + formatter
      clarifying-questions-view.tsx Stage 3: checklist + Copy Questions button
      stack-context.ts     Stage 4: mock stack detection (FR-7 grounding)
      drafted-reply.ts     Stage 4: mock reply composer
      drafted-reply-view.tsx Stage 4: editable draft + copy/reset buttons
  lib/
    env.ts               Server-side env, validated with zod
    repository-url.ts    Repository input parsing/canonicalisation
    cn.ts                Class-name helper
  server/
    bob/                 The only code that talks to IBM Bob 2.0
    repomap/generate.ts  M1 orchestration: Bob call -> RepoMap
```

## Environment variables

All optional for now; the app builds and runs without them. They exist so the
IBM Bob 2.0 integration has a defined seam. Never expose them to the browser.

| Variable | Purpose |
| --- | --- |
| `BOB_API_BASE_URL` | Base URL of the IBM Bob 2.0 service (required for analysis) |
| `BOB_API_KEY` | API token for IBM Bob 2.0 |
| `BOB_PROJECT_ID` | Bob 2.0 project/team that analyses submitted repositories |
| `BOB_ANALYSIS_PATH` | Analysis path appended to the base URL (default `v1/repositories/analyze`) |
| `BOB_MODEL` | Optional model override |
| `BOB_TIMEOUT_MS` | Analysis timeout in ms (default `120000`) |

**Bob 2.0 endpoint shape is an assumption.** The request/response contract is
fixed in `src/server/bob/http-provider.ts`, but the actual URL, auth header and
payload keys depend on the Bob 2.0 access the team is given. When credentials
arrive, adjust that one file (or set `BOB_ANALYSIS_PATH`) rather than the rest
of the app.

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
