# RepoMap

An AI teammate built on IBM Bob 2.0 that turns full-repository understanding
into a shared, living map of any codebase.

**Status: M1, the Onboarding Map and ScopeShield are built, and a real IBM Bob
2.0 analysis has been verified end to end.** What works today:

- **M1 backend** — the analysis API, the RepoMap contract, the provider
  abstraction (`mock` | `bob-2.0`) and the zod-validated boundaries.
- **Onboarding Map** — a working UI at `/dashboard` that runs a real analysis
  and renders the summary, architecture graph, module cards, ranked starter
  files and gotchas.
- **ScopeShield** — a working UI at `/scope-shield` that calls the real IBM Bob
  2.0 provider server-side. The old browser-side mock analysis pipeline has been
  removed from the active flow.
- **Verified Bob integration** — a real `bob run` completes, returns a parseable
  JSON envelope, and yields a real Bob task id that is propagated into
  `provenance.bobTaskId`.

Tier 2 (Debug & Code Review Overlay, Release Readiness Check) and Tier 3
(Application Maintenance) are **not** built — there is no source for either.
See [docs/RepoMap-PRD.txt](docs/RepoMap-PRD.txt) for scope; it is the source of
truth.

## Current status

| Area | State |
| --- | --- |
| Onboarding Map (`/dashboard`) | Implemented — real Bob 2.0 analysis, full map UI |
| ScopeShield (`/scope-shield`) | Implemented — real Bob 2.0 scope analysis |
| Real IBM Bob 2.0 | Verified — `configuredProvider: bob-2.0`, `selectedProvider: bob-2.0`, `ready: true`, `apiKeyPresent: true` |
| Onboarding Map → ScopeShield handoff | Working — the same analysed repository reaches both |
| Hydration safety | Fixed — server and first client render are identical |
| Automated validation | 166/166 tests passing, typecheck and build clean |
| Tier 2 / Tier 3 | Not implemented |

Two behaviours are worth stating precisely, because they are easy to overstate:

- **A real Bob failure is a failure.** There is no mock fallback in the active
  path. A missing key, a failed clone, a timeout or an unusable answer all
  produce a structured error, never invented data.
- **The turn limit is a real ceiling.** `BOB_MAX_TURNS` is 16. A
  repository-grounded request succeeds; a very broad question such as
  *"what needs to be fixed?"* can exhaust the budget and return
  `502 PROVIDER_FAILED`. 16 turns is not a guarantee for every request.

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) + React 19 | Frontend and the PRD's thin backend API in one process — one dev server, one build, no CORS. Best fit for a 3-person hackathon. |
| Language | TypeScript (strict) | The RepoMap contract is shared between backend and frontend, so it must typecheck on both sides. |
| Styling | Tailwind CSS v4 | No config files, fast demo polish. |
| Architecture/graph | `@xyflow/react` (React Flow) | In use. `src/components/onboarding/ArchitectureDiagram.tsx` renders modules as nodes and relationships as edges, with zoom/pan/fit controls driving the module detail drawer. |
| 3D (experimental) | `@react-three/fiber`, `@react-three/drei` | Installed but not yet wired: `src/components/onboarding/ArchitectureMap3D.tsx` exists and no component imports it. |
| Validation | `zod` | Validates the API boundary, provider output and env config. |
| Backend | Next.js route handlers under `src/app/api` | Keeps the API thin; Bob calls stay server-side. |
| IBM Bob 2.0 | the installed `bob` CLI (`bobshell`), headless `bob run` | The only integration mechanism actually verified on this machine. |

Deliberately excluded (per PRD §7, non-requirements for this build): auth,
database, Docker, CI pipeline, multi-user support.

## Getting started

Prerequisites: Node.js >= 20.9, pnpm.

```bash
pnpm install
cp .env.example .env.local   # optional; the app runs without it
pnpm dev                     # http://localhost:3000
```

```bash
pnpm build      # production build
pnpm start      # serve the production build
pnpm lint       # eslint
pnpm typecheck  # tsc --noEmit
pnpm test       # node:test unit tests
```

## M1 architecture

The two features are one chain. Onboarding Map produces the repository truth,
and ScopeShield reasons about that same repository.

```
USER
  ↓  POST /api/repository/analyze { repository }
Onboarding Map  (src/components/onboarding/OnboardingMap.tsx, at /dashboard)
  ↓
src/server/repomap/analyze-repository.ts        service layer (no React)
  ↓
src/server/bob/index.ts                          provider selection (mock | bob-2.0)
  ↓
src/server/bob/mock-provider.ts  |  src/server/bob/cli-provider.ts
                                  ↓  bob run --format json --workspace <dir>
                            IBM Bob 2.0
                                  ↓
src/features/repomap/normalize.ts                Bob reasoning → RepoMap contract
  ↓
zod-validated RepoMap JSON → Onboarding Map UI
  ↓
src/features/repomap/store.ts                    saveRepoMap → localStorage["repomap"]
  ↓                                        (the handoff; re-validated on read)
ScopeShield  (src/features/scope-shield/scope-shield.tsx, at /scope-shield)
  ↓  POST /api/scope-shield { request, repository, repoMap }
src/server/scope-shield/analyze-scope.ts
  ↓
getBobProviderFor() → IBM Bob 2.0 (server-side CLI, same provider)
  ↓
validated + mapped → ScopeAnalysisResult → UI
  (RiskAnalysis · ClarifyingQuestion[] · DraftedReply)
```

The frontend depends only on the RepoMap contract, never on raw Bob output, so
Onboarding Map and ScopeShield could be built independently of the Bob side while
it changed underneath. The Bob CLI is only ever invoked from
`src/server/bob/`, so `BOB_API_KEY` never reaches the browser.

| File | Role |
| --- | --- |
| `src/features/repomap/schema.ts` | The RepoMap contract + API envelopes, all zod schemas. |
| `src/features/repomap/normalize.ts` | Provider output → strict contract; derives relationships, caps recommended files, raises on empty analysis. |
| `src/features/repomap/request.ts` | Request body contract. |
| `src/data/mock-analysis.json` | Deterministic development fixture, written in the exact contract shape. |
| `src/server/repomap/analyze-repository.ts` | Service layer: provider → RepoMap. React-free. |
| `src/server/bob/provider.ts` | Provider interface with `analyzeRepository(...)` and `analyzeScope(...)`, plus `BobProviderError`. |
| `src/server/bob/mock-provider.ts` | Returns the fixture. Always labelled `provider: "mock"`. |
| `src/server/bob/cli-provider.ts` | Runs `bob run --format json …` via `execFile`. |
| `src/server/bob/output.ts` | Parses Bob's `--format json` output (document, stream, fence or prose). |
| `src/server/bob/json.ts` | Extracts the analysis JSON from the envelope's `last_message`. |
| `src/server/bob/prompts.ts` | `buildRepoMapPrompt` (PRD 5.1) and `buildScopeShieldPrompt`. |
| `src/server/bob/workspace.ts` | Resolves the local directory Bob reads (shallow clone, or a fixed checkout). |
| `src/lib/repository-url.ts` | Repository input parsing/canonicalisation. |
| `src/lib/env.ts` | Server config, validated with zod. |

## API

### `POST /api/repository/analyze` (canonical)

```bash
curl -X POST http://localhost:3000/api/repository/analyze \
  -H "content-type: application/json" \
  -d '{"repository":"https://github.com/owner/repo"}'
```

`repository` accepts a GitHub URL or the `owner/repo` shorthand. Only `https`
GitHub URLs are accepted.

Success:

```jsonc
{
  "success": true,
  "analysis": { /* RepoMap, below */ }
}
```

Failure:

```jsonc
{ "success": false, "error": { "code": "INVALID_REPOSITORY", "message": "…" } }
```

| HTTP | `error.code` | Cause |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Body is not JSON, or `repository` is missing/blank. |
| 400 | `INVALID_REPOSITORY` | Not an https GitHub URL, or owner/repo incomplete. |
| 502 | `INVALID_ANALYSIS` | Provider answered, but with nothing usable (no modules or no recommended files). |
| 502 | `PROVIDER_FAILED` | The Bob CLI failed, timed out, or returned unreadable output. |
| 503 | `PROVIDER_UNAVAILABLE` | `BOB_API_KEY` missing, the repository could not be cloned, or the server configuration is invalid. |
| 500 | `INTERNAL_ERROR` | Anything unexpected. Messages never include secrets. |

`POST /api/repomap` still exists as a thin alias of the same handler.

### `POST /api/scope-shield` (active ScopeShield path)

Runs the real ScopeShield analysis server-side. **There is no mock fallback in
this path** — a Bob failure is returned as a failure, never as invented data.

Request (`scopeShieldRequestSchema`):

```jsonc
{
  "request": "Add password reset",   // required, min 10 characters
  "repository": "owner/repo",        // required
  "repoMap": { /* RepoMap, below */ } // the Onboarding Map result (nullish at the API)
}
```

Success:

```jsonc
{
  "success": true,
  "result": {
    "riskAnalysis": { /* RiskAnalysis */ },
    "clarifyingQuestions": [ /* ClarifyingQuestion[] */ ],
    "draftedReply": { /* DraftedReply */ },
    "provider": "bob-2.0",
    "bobTaskId": "…"        // present when Bob returns a task id
  }
}
```

Failure:

```jsonc
{ "success": false, "error": { "code": "PROVIDER_FAILED", "message": "…" } }
```

| HTTP | `error.code` | Cause |
| --- | --- | --- |
| 400 | `INVALID_REQUEST` | Body is not JSON, or fails `scopeShieldRequestSchema`. |
| 400 | `INVALID_REPOSITORY` | `repository` is not a usable GitHub reference. |
| 502 | `INVALID_ANALYSIS` | Bob answered, but the payload failed `scopeProviderAnalysisSchema`. |
| 502 | `PROVIDER_FAILED` | The Bob CLI failed, timed out, or returned unreadable output. |
| 503 | `PROVIDER_UNAVAILABLE` | `BOB_API_KEY` missing, clone failed, or the server configuration is invalid. |
| 500 | `INTERNAL_ERROR` | Anything unexpected. |

The error vocabulary is deliberately shared with `/api/repository/analyze`, so
both endpoints read the same. The route itself accepts `repoMap: null`; the
"Analyze a repository first" requirement is enforced in the browser by
`analysis-runner.ts` before the request is ever sent.

### `POST /api/scope/analyze` — **legacy**

**This is not the active ScopeShield route.** The browser calls
`/api/scope-shield`; nothing in the current UI calls this one.

It is a second, higher-level HTTP entry point kept from the earlier direct-HTTP
design. When `BOB_ENDPOINT` is set, it forwards the request to that URL using
`fetch`. When `BOB_ENDPOINT` is **not** set it returns
`503 PROVIDER_UNAVAILABLE`.

**It does not fall back to the mock provider.** The deterministic mock analysis
is reachable only by setting `REPOMAP_PROVIDER=mock`, and that switch applies to
the repository-analysis path, not to this route. Its provider implementation
lives in the equally legacy `src/features/scope-shield/bob-provider.ts`.

### `GET /api/onboarding` — **legacy demo fixture**

Returns `mockOnboardingData` (`src/data/mock-onboarding.ts`) after a small
artificial delay. This is static demo fixture data for the onboarding surface —
it is unrelated to Bob, does not analyse a repository, and has no consumer in the
active UI. The real Onboarding Map calls `POST /api/repository/analyze`.

### `GET /api/health`

Healthy:

```jsonc
{
  "status": "ok",
  "service": "repomap",
  "provider": {
    "selected": "mock",          // or "bob-2.0"
    "ready": true,
    "reason": null,              // why not ready, when it is not
    "bobBinary": "bob",
    "bobApiKeyPresent": false
  }
}
```

Degraded — when the server configuration is invalid the route returns **503** so
an orchestrator can see the failure:

```jsonc
{
  "status": "degraded",
  "provider": { "selected": null, "ready": false, "reason": "…" }
}
```

The `reason` string never contains key material — only the key's presence and
length are reported.

## Onboarding Map

`/dashboard` is the primary working feature. It turns any GitHub repository into
an interactive map, grounded in a real IBM Bob 2.0 analysis of that repository.

### Flow

```
/dashboard
  → src/components/onboarding/OnboardingMap.tsx
  → analyzeRepositoryClient (src/features/onboarding-map/api-client.ts)
  → POST /api/repository/analyze
  → Bob provider → IBM Bob 2.0
  → RepoMap result (zod-validated)
  → UI rendering
```

The route is a thin wrapper: `src/app/dashboard/page.tsx` renders
`<OnboardingMap />`, and the client submits `repository` (a GitHub URL or
`owner/repo` shorthand) to the analysis API, then renders the returned RepoMap.
A failure surfaces the API's structured error rather than a generic message.

### What it renders

| Piece | Component | Shows |
| --- | --- | --- |
| Project Summary | `ProjectSummary` | The one-paragraph pitch plus the detected stack |
| Architecture Diagram | `ArchitectureDiagram` | React Flow graph — modules as nodes, relationships as edges, with zoom/pan/fit. Clicking a node drives the drawer |
| Module Cards | `ModuleCards` | The module breakdown, grouped and selectable |
| Recommended Files | `RecommendedFiles` | Ranked starter files to read first |
| Gotchas | `Gotchas` | Non-obvious traps a newcomer should know about |
| Module Detail Drawer | `ModuleDetailDrawer` | Deep detail for the selected module |

### Handoff to ScopeShield

A successful RepoMap is written to the browser under the localStorage key
`repomap` by `saveRepoMap` (`src/features/repomap/store.ts`), which the active
dashboard component calls after a successful analysis. ScopeShield reads that
same key, so **it reasons about the exact repository Onboarding Map just
analysed** — the summary, stack, module breakdown, auth modules and directories
all come from that run's RepoMap, not from a demo fixture.

The read re-validates against `repoMapSchema`, so a stale or hand-edited value is
discarded rather than trusted, and a blocked storage never breaks an analysis
that just succeeded.

See [The RepoMap handoff](#the-repomap-handoff) under ScopeShield for the
subscription and the hydration-safe first render.

## ScopeShield

ScopeShield is a real IBM Bob 2.0 flow, not a mock pipeline. It takes a
free-text feature request, trims and squeezes the whitespace, and stores the
result in the browser under the localStorage key `featureRequest`. Empty input
is rejected with "Please describe the feature you want to build." A successful
submit shows "Feature request stored successfully!" and logs the request to the
browser console. The stored value is also printed with
`localStorage.getItem("featureRequest")` in DevTools → Application → Local
Storage.

**It requires a successful Onboarding Map result, and it uses that actual
RepoMap as Bob's context.** The repository, its stack, its modules, its auth
modules and its directories are not assumed or demo data — they are the real
RepoMap that `/dashboard` produced, passed to the server in the `repoMap` field
of the request body. Bob then runs against the real workspace for that same
repository.

The analysis, the clarifying questions and the drafted reply are produced by
IBM Bob 2.0 on the server. The deterministic browser-side generators that
previously produced that data — `analyzeFeatureRequest`
(`risk-analysis.ts`), `generateClarifyingQuestions` (`clarifying-questions.ts`),
`buildDraftedReply` (`drafted-reply.ts`) and `detectStackContext` — have no
non-test callers left and are out of the active flow. The view components that
render the results (`RiskAnalysisView`, `ClarifyingQuestionsView`,
`DraftedReplyView`, `RepositoryContextView`) are still mounted; only their data
source changed.

### Flow

```
free-text feature request
  → browser (src/features/scope-shield/scope-shield.tsx)
  → POST /api/scope-shield   { request, repository, repoMap }
  → src/server/scope-shield/analyze-scope.ts
  → Bob provider (getBobProviderFor)
  → IBM Bob 2.0 via the Bob CLI
  → validated against scopeProviderAnalysisSchema
  → map-scope.ts → ScopeAnalysisResult
  → UI (RiskAnalysis · ClarifyingQuestion[] · DraftedReply)
```

`runScopeAnalysis` in `src/features/scope-shield/analysis-runner.ts` owns the run
lifecycle and returns a discriminated outcome (`{status:"success"|"error"}`), so
the UI drives an explicit Idle → Loading → Success | Error state:

| State | What the user sees |
| --- | --- |
| Idle | Empty or whitespace input disables the button; typing clears any error |
| Invalid | Inline message — "Please describe the feature you want to build." when empty, "Please enter a valid feature request." under 10 characters |
| Loading | Button and textarea disabled, inline spinner, "Analyzing repository and calculating risks…" |
| Success | The saved-request confirmation plus the risk, questions and draft sections |
| Error | Rose banner with **Try Again** and **Dismiss**; editing the request clears it |

A stale run that finishes after a newer one is discarded, and the request is
saved to `localStorage` before the run starts so a failure never loses it.

### Precondition: ScopeShield requires an Onboarding Map result

An Onboarding Map result is required before ScopeShield will run, and it is used
as real context rather than as a hint. The API schema treats `repoMap` as
nullish, but `runScopeAnalysis` enforces the requirement in the browser: with no
stored analysis it short-circuits before any Bob call and returns **"Analyze a
repository first. ScopeShield reasons about a real codebase, so it needs an
Onboarding Map result."** Run an analysis at `/dashboard` first.

When that RepoMap is present it is sent as `repoMap` and reaches
`buildScopeShieldPrompt`, so Bob reasons about the specific stack and
architecture of the repository that was actually analysed. There is nothing
sensible for it to reason about otherwise, which is why the flow refuses to run
rather than falling back to invented context.

### The RepoMap handoff

`src/features/repomap/store.ts` defines the handoff between the two halves of
the product, using the localStorage key **`repomap`** (`REPOMAP_STORAGE_KEY`).
Reads re-validate against `repoMapSchema`, so a stale or hand-edited value is
discarded rather than trusted, and a full or blocked storage never breaks an
analysis that just succeeded.

`/dashboard` writes the key (`saveRepoMap` in
`src/components/onboarding/OnboardingMap.tsx`) and `/scope-shield` reads it, so
ScopeShield grounds its analysis in the repository that was actually analysed.
With no stored analysis, `runScopeAnalysis` short-circuits before any Bob call
and asks for an Onboarding Map first.

#### Hydration-safe first render

`scope-shield.tsx` subscribes to the store with `useSyncExternalStore`, which
takes **two** snapshot functions:

```tsx
const repoMap = useSyncExternalStore(
  subscribeToStoredRepoMap,   // storage events from another tab
  getStoredRepoMapSnapshot,   // client: reads localStorage
  getServerRepoMapSnapshot,   // server + first client render: always null
);
```

React calls the *server* snapshot both while rendering on the server and for the
first client render during hydration, so the two must agree. Passing the
`localStorage` reader in that third position is a real bug: the server renders
"no repository analysed yet" while the client hydrates with the stored map
already present, producing *"Hydration failed because the server rendered HTML
didn't match the client."* `getServerRepoMapSnapshot()` returns `null` on both
sides, so the first render is deterministic; React then switches to the
`localStorage` snapshot after mount and the real map appears.

No `suppressHydrationWarning` is used — the divergence is fixed at the source,
not hidden. Four regression tests in `src/features/repomap/store.test.ts` pin the
invariant, including that the server snapshot stays `null` even when a
schema-valid map is in `localStorage`.

`RiskAnalysis` exposes `domains: DomainRisk[]`, grouping the hidden work by
architectural layer (frontend, backend, database, infrastructure, security &
auth).

## IBM Bob 2.0 integration (M1 — CLI-based)

`src/server/bob/` is the only place that talks to Bob 2.0:

| File | Role |
| --- | --- |
| `provider.ts` | Provider interface + `BobProviderError`. Two operations: `analyzeRepository(...)`, `analyzeScope(...)` |
| `mock-provider.ts` | Deterministic fixture for local development |
| `cli-provider.ts` | Runs `bob run --format json …` via `execFile` |
| `output.ts` | Parses Bob's `--format json` output (document, stream, fence or prose) |
| `json.ts` | Extracts the analysis JSON from the envelope's `last_message` |
| `prompts.ts` | `buildRepoMapPrompt` (PRD 5.1) and `buildScopeShieldPrompt` |
| `workspace.ts` | Resolves the local directory Bob reads (shallow clone or fixed checkout) |
| `index.ts` | Provider resolution (`mock` | `bob-2.0`); no silent fallback |

Two deliberate choices:

- **No stub/fake provider.** An invented analysis would be indistinguishable
  from a real one in the UI, which PRD §7 ("transparency of AI involvement")
  rules out. Without credentials the API returns 503 rather than fake data.
- **Normalisation, not trust.** `src/features/repomap/normalize.ts` converts
  Bob's answer into the strict contract: capped at 3 recommended files, deduped
  modules, derived diagram nodes/edges, dropped junk. It raises
  `InvalidAnalysisError` only when there is no usable map at all, rather
  than inventing one.

## RepoMap contract

```ts
{
  schemaVersion: 1,
  repository: { url: string, slug: string, name: string },
  provenance: {                  // PRD §7: which provider, which Bob task
    provider: "bob-2.0" | "mock",
    bobTaskId: string | null,
    generatedAt: string,         // ISO timestamp
    durationMs: number,
    notice: string | null        // always set when provider is "mock"
  },
  projectSummary: string,                    // FR-2
  stack: string[],
  modules: [                                // structural breakdown
    {
      id: string,                           // stable slug, unique
      name: string,
      path: string,
      purpose: string,
      files: string[],
      dependencies: string[]                // module ids or names
    }
  ],
  recommendedFiles: [                       // FR-3, always 2–3 entries
    { path: string, reason: string, rank: 1 | 2 | 3 }
  ],
  gotchas: string[],                        // FR-5
  relationships: [                          // FR-4, module id → module id
    { source: string, target: string, type: string }
  ]
}
```

The Onboarding Map UI can build its diagram from `modules` + `relationships`
alone; `files` and `recommendedFiles` give the file-level detail.

## Bob integration status — verified

**A real IBM Bob 2.0 analysis has been verified end to end.** The success path
works against the live model, and the parsed result is what the UI renders.

### Verified flow

```
repository (URL or owner/repo)
  → workspace resolution (src/server/bob/workspace.ts — shallow clone or fixed checkout)
  → Bob CLI (src/server/bob/cli-provider.ts — execFile, stdin closed)
  → IBM Bob 2.0
  → JSON envelope
  → last_message extraction
  → RepoMap normalisation (src/features/repomap/normalize.ts)
  → validated RepoMap (repoMapSchema)
```

`cli-provider.ts` invokes `bob run --format json --max-turns <n> --disable-mcp
--disable-subagents --workspace <dir> <prompt>`.

### The envelope

`bob run --format json` emits a wrapper document; the analysis JSON is **nested
inside `last_message`**, not returned as the top-level payload:

```jsonc
{
  "type": "result",
  "status": "success",
  "stats": {
    "task_id": "…"          // the real Bob task id
  },
  "last_message": "…"       // stringified envelope containing the analysis JSON
}
```

`parseBobOutput` (`src/server/bob/output.ts`) accepts a single JSON document, a
JSON stream, a fenced block, or prose-embedded JSON, and `json.ts` extracts the
analysis from `last_message`. `stats.task_id` is carried into
`provenance.bobTaskId`, which is `null` only when Bob returns no task id.

### What was confirmed

- IBM Bob 2.0 is installed as the `bob` CLI (`bobshell@2.0.5`, global npm) with
  a config in `~/.bob` and license consent recorded.
- The shallow clone of the target repository works.
- Live `bob run` calls complete and return a parseable envelope.
- A successful run yields a real task id, which appears in `provenance.bobTaskId`.
- The analysis inside `last_message` survives normalisation into a zod-valid
  RepoMap, which the Onboarding Map renders.
- No credential material is logged or returned in any response.

### Verified run

Repository analysis was verified end to end against a real public repository,
`https://github.com/Terbulator/jersey-store`:

| Observation | Value |
| --- | --- |
| `POST /api/repository/analyze` | `200` |
| `provider` | `bob-2.0` |
| `isMock` | `false` |
| `modulesCount` | 10 |
| `relationshipsCount` | 10 |

A concrete ScopeShield request was then successfully analysed against that same
Jersey Store repository, and the UI reported IBM Bob 2.0 as the provider. Both
features were confirmed working against one real repository, not against a
fixture.

Provider selection at the time of verification:

```
configuredProvider: bob-2.0
selectedProvider:   bob-2.0
ready:              true
apiKeyPresent:      true
```

### Known ceiling

`BOB_MAX_TURNS` defaults to 16 (it was 8). Large or open-ended work can exhaust
it, and the route returns a structured `502 PROVIDER_FAILED` carrying Bob's own
"reached the maximum of 16 turns" message. That message is generated from
whatever Bob reports rather than from the configured value, so it stays correct
if the limit is raised again.

Concretely: a repository-grounded request ("add authentication to this
project") succeeds, while a broad question such as *"what needs to be fixed?"*
reached the 16-turn ceiling. **16 turns is not a guarantee that every arbitrary
request will succeed** — a very large or very open repository may need a higher
`BOB_MAX_TURNS`, so treat this as a retry-or-raise-the-limit condition rather
than a bug. `BOB_TIMEOUT_MS` is 900000 (15 minutes) for the same reason: one
observed analysis took over four minutes.

## Project structure

```
docs/
  RepoMap-PRD.txt        Product requirements (source of truth)
  bob-evidence/          Screenshots and exported Bob task output
src/
  app/
    layout.tsx           Root layout, header, footer
    page.tsx             Landing page
    dashboard/page.tsx   Renders <OnboardingMap /> — the Onboarding Map
    scope-shield/page.tsx Renders the ScopeShield UI
    api/
      health/route.ts            GET  /api/health — 200 healthy / 503 degraded
      repository/analyze/route.ts POST /api/repository/analyze (canonical, ACTIVE)
      repomap/route.ts           POST /api/repomap (alias of the canonical route)
      scope-shield/route.ts      POST /api/scope-shield (real Bob path, ACTIVE)
      scope/analyze/route.ts     POST /api/scope/analyze — LEGACY, BOB_ENDPOINT
                                 HTTP path, no active UI caller
      onboarding/route.ts        GET  /api/onboarding — LEGACY static mock
                                 fixture, no active consumer
  components/
    layout/              Site header and footer
    onboarding/          Onboarding Map UI (ACTIVE — rendered by /dashboard):
                         OnboardingMap, ProjectSummary, ArchitectureDiagram,
                         ModuleCards, RecommendedFiles, Gotchas,
                         ModuleDetailDrawer (+ experimental 3D variant)
  data/
    mock-onboarding.ts   Static fixture served by the legacy GET /api/onboarding
  features/
    registry.ts          Declares every PRD module, its tier, and status
    onboarding-map/
      api-client.ts      posts to /api/repository/analyze
      onboarding-map.tsx LEGACY duplicate — /dashboard renders
                         src/components/onboarding/ instead, so this file is
                         unreferenced
    repomap/
      schema.ts          RepoMap + Bob analysis contracts (zod)
      normalize.ts       Bob answer -> strict RepoMap, diagram derivation
      request.ts         POST body contract
      store.ts           localStorage `repomap` handoff between Map and
                         ScopeShield; re-validates reads, exposes the
                         hydration-safe getServerRepoMapSnapshot()
      store.test.ts      Regression tests for the store's server/client
                         snapshot split
    scope-shield/
      analysis-runner.ts   Validation + POST /api/scope-shield, success/error outcome
      feature-request.ts   localStorage key + text cleanup
      scope-shield.tsx     Input form, loading, result mount, store subscription
      provider-schema.ts   ScopeShield request/response + Bob payload schemas (zod)
      keyword-match.ts     Question relevance scoring shared by the views
      stack-context.ts     Repository context read by the ScopeShield UI
      bob-provider.ts      LEGACY direct-BOB_ENDPOINT HTTP provider, used only
                           by the legacy /api/scope/analyze route
      risk-analysis-view.tsx / clarifying-questions-view.tsx /
      drafted-reply-view.tsx / repository-context-view.tsx
                          Views for the Bob-supplied result
      risk-analysis.ts / clarifying-questions.ts / drafted-reply.ts
                          Legacy mock generators — no non-test callers
  lib/
    env.ts               Server-side env, validated with zod
    repository-url.ts    Repository input parsing/canonicalisation
    cn.ts                Class-name helper
  server/
    bob/                 The only code that talks to IBM Bob 2.0 (CLI-based)
    repomap/analyze-repository.ts  M1 orchestration: Bob call -> RepoMap
    scope-shield/        analyze-scope.ts, map-scope.ts
```

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `REPOMAP_PROVIDER` | `mock` | `mock` (fixture) or `bob-2.0` (real CLI). |
| `BOB_CLI_PATH` | `bob` | Path to the Bob CLI. On Windows use the `bobshell/dist/bob.js` entry (see below). |
| `BOB_API_KEY` | — | **Required** for `bob-2.0`. Read from the environment by the CLI; never committed, never sent to the browser. |
| `BOB_ENDPOINT` | — | IBM Bob 2.0 HTTP API endpoint, used only by the legacy `POST /api/scope/analyze` route. When unset that route answers 503 `PROVIDER_UNAVAILABLE`. |
| `BOB_MAX_TURNS` | `16` | Turn limit for one analysis. |
| `BOB_TIMEOUT_MS` | `900000` | Aborts a Bob run. One observed analysis took over 4 minutes. |
| `BOB_SCOPE_TIMEOUT_MS` | `15000` | Timeout for the ScopeShield live scope-analysis call to Bob 2.0 (ms). |
| `REPOMAP_WORKSPACE_DIR` | — | Analyse this local checkout instead of cloning. |
| `REPOMAP_CLONE_TIMEOUT_MS` | `120000` | Timeout for the shallow clone. |

Windows note: `bob` is installed as an npm shim (`bob.cmd`/`bob.ps1`) which
Node cannot spawn directly. Set:

```
BOB_CLI_PATH=<npm-global-dir>/node_modules/bobshell/dist/bob.js
```

A `.js` path is executed through the current Node binary automatically.

## Validation

Current state of the automated checks:

| Command | Result |
| --- | --- |
| `pnpm test` | **166 passed, 0 failed** |
| `pnpm typecheck` | clean, 0 errors |
| `pnpm lint` | 0 errors, 0 warnings |
| `pnpm build` | successful |
| `git diff --check` | clean |

`pnpm lint` is now clean. The unused `nodes` binding in
`src/features/onboarding-map/diagram.tsx` has been removed, and
`.kilo/worktrees/` is excluded via `eslint.config.mjs` — which is what eliminates
the duplicate second warning.

On Windows the working tree uses `core.autocrlf=true`; `git diff --check` on the
current diff emits no `LF will be replaced by CRLF` notices and exits 0. Any such
line-ending notices are informational, not whitespace errors.

The build emits the expected application and API routes:

```
/  /_not-found  /dashboard  /scope-shield
/api/health  /api/onboarding  /api/repomap
/api/repository/analyze  /api/scope-shield  /api/scope/analyze
```

## Mock development mode

`REPOMAP_PROVIDER=mock` (the default) returns `src/data/mock-analysis.json`
verbatim. It is deterministic, contains no randomness, and every response is
labelled `provenance.provider: "mock"` with
`provenance.notice: "Mock data for local development. IBM Bob 2.0 was not
called."` The frontend team can build the Onboarding Map and ScopeShield
without any Bob credentials.

```bash
curl -X POST http://localhost:3000/api/repository/analyze \
  -H "content-type: application/json" \
  -d '{"repository":"https://github.com/acme/anything"}'
```

## Current limitations

- **The 16-turn ceiling is real.** A repository-grounded request succeeds; a
  broad one ("what needs to be fixed?") can exhaust `BOB_MAX_TURNS` and return
  `502 PROVIDER_FAILED`. Raise `BOB_MAX_TURNS` for very large repositories.
- No server-side persistence or caching: every analysis request re-runs Bob. On
  the client, a successful RepoMap is written to browser `localStorage` under the
  key `repomap`, and ScopeShield reads it back — so the handoff works, but only
  within the same browser. Clearing site data means running the Onboarding Map
  again before ScopeShield will run.
- Bob analyses a local directory, so a target repository is shallow-cloned into
  `.repomap-cache/` on first use (gitignored). Private repositories are not
  supported.
- One repository at a time; no batching, no progress streaming (a real Bob run
  takes minutes and the HTTP request blocks for that long).
- Module ids are slugs of module paths; a provider that returns duplicate paths
  collapses them.
- No auth, no rate limiting, no multi-user support (out of scope per PRD §7).
- `gotchas` are capped at 8 and `recommendedFiles` at 3 by the normaliser.
- Legacy code is retained, not removed: `/api/scope/analyze`,
  `src/features/scope-shield/bob-provider.ts`, `/api/onboarding` and the
  duplicate `src/features/onboarding-map/onboarding-map.tsx`. None are reached by
  the active UI, but they still compile and are still served.

## Build plan

Milestones from PRD §9, against the current source:

1. Repo map generation (backend + Bob 2.0 calls) — **done**, and the live Bob
   path is verified
2. Onboarding Map UI + diagram rendering — **done**, at `/dashboard`
3. Scope Clarifier (ScopeShield) end-to-end — **done** on the real Bob path at
   `/scope-shield`; it receives the Onboarding Map's own RepoMap through the
   `repomap` localStorage handoff
4. Debug overlay on the seeded demo repo (Tier 2) — not started
5. Release readiness verdict on a seeded diff (Tier 2) — not started
6. Demo video and submission assets — not started

Tier 3 (Application Maintenance, PRD 5.5) is roadmap only and must not be
represented as implemented.
