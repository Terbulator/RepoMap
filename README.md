# RepoMap

An AI teammate built on IBM Bob 2.0 that turns full-repository understanding
into a shared, living map of any codebase.

**Status: M1 (backend) done, real Bob run unverified.** The analysis API, the
RepoMap contract, the provider abstraction and a deterministic mock provider are
built and tested. The frontend is still an empty shell — the Onboarding Map,
ScopeShield and all Tier 2 features are not built. See
[docs/RepoMap-PRD.txt](docs/RepoMap-PRD.txt) for scope; it is the source of
truth.

## Stack

| Concern | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router) + React 19 | Frontend and the PRD's thin backend API in one process — one dev server, one build, no CORS. Best fit for a 3-person hackathon. |
| Language | TypeScript (strict) | The RepoMap contract is shared between backend and frontend, so it must typecheck on both sides. |
| Styling | Tailwind CSS v4 | No config files, fast demo polish. |
| Architecture/graph | `@xyflow/react` (React Flow) | Node-graph rendering for FR-4; not imported yet (UI is not built). |
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

```
POST /api/repository/analyze
        ↓
src/server/repomap/analyze-repository.ts     service layer (no React)
        ↓
src/server/bob/index.ts                       provider selection (mock | bob-2.0)
        ↓
src/server/bob/mock-provider.ts   |   src/server/bob/cli-provider.ts
        ↓                               ↓  (bob run --format json, workspace = shallow clone)
src/features/repomap/normalize.ts            Bob reasoning → RepoMap contract
        ↓
zod-validated RepoMap JSON → frontend
```

The frontend depends only on the RepoMap contract, never on raw Bob output, so
Tushar and Satyaki can build the Onboarding Map and ScopeShield in parallel
while the Bob side changes underneath.

| File | Role |
| --- | --- |
| `src/features/repomap/schema.ts` | The RepoMap contract + API envelopes, all zod schemas. |
| `src/features/repomap/normalize.ts` | Provider output → strict contract; derives relationships, caps recommended files, raises on empty analysis. |
| `src/features/repomap/request.ts` | Request body contract. |
| `src/data/mock-analysis.json` | Deterministic development fixture, written in the exact contract shape. |
| `src/server/repomap/analyze-repository.ts` | Service layer: provider → RepoMap. React-free. |
| `src/server/bob/provider.ts` | Provider interface, `BobProviderError`. |
| `src/server/bob/mock-provider.ts` | Returns the fixture. Always labelled `provider: "mock"`. |
| `src/server/bob/cli-provider.ts` | Runs `bob run --format json …` via `execFile`. |
| `src/server/bob/output.ts` | Parses Bob's `--format json` output (document, stream, fence or prose). |
| `src/server/bob/prompts.ts` | The one analysis prompt, derived from PRD 5.1. |
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
| 503 | `PROVIDER_UNAVAILABLE` | `BOB_API_KEY` missing, or the repository could not be cloned. |
| 500 | `INTERNAL_ERROR` | Anything unexpected. Messages never include secrets. |

`POST /api/repomap` still exists as a thin alias of the same handler.

### `GET /api/health`

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

## Bob integration status — read this

**A real IBM Bob 2.0 analysis has not been verified.** Do not demo it as if it
were.

What is verified:

- IBM Bob 2.0 is installed as the `bob` CLI (`bobshell@2.0.5`, global npm) with
  a config in `~/.bob` and license consent recorded.
- `bob run` accepts `--format json --workspace <dir> --max-turns <n> <prompt>`,
  which is exactly what `cli-provider.ts` invokes. The full command line was
  observed in a real failure message.
- The shallow clone of the target repository works (`.repomap-cache/` was
  created and populated for `octocat/Hello-World`).
- Provider failures propagate correctly: a bad key produces
  `502 PROVIDER_FAILED` with Bob's own message, `Invalid or expired API key.`
- `parseBobOutput` handles a single JSON document, a JSON stream, a fenced
  block and prose-embedded JSON (unit tested).

What is missing:

- **A valid `BOB_API_KEY`.** It is not set in the process, user or machine
  environment on this machine, and the only key available for testing was
  invalid, so every real run failed authentication.
- Because of that, the actual shape of a successful `--format json` payload and
  the real `bobTaskId` field are **unconfirmed**. The parser is deliberately
  tolerant and fails loudly rather than guessing.
- One anomalous run returned HTTP 200 after 4 minutes with a payload that could
  not be reproduced; later identical runs failed. Treat the success path as
  unproven until it is re-run with a valid key.

Before the demo, someone must: set `BOB_API_KEY`, set `REPOMAP_PROVIDER=bob-2.0`,
and re-run the verification above.

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `REPOMAP_PROVIDER` | `mock` | `mock` (fixture) or `bob-2.0` (real CLI). |
| `BOB_CLI_PATH` | `bob` | Path to the Bob CLI. On Windows use the `bobshell/dist/bob.js` entry (see below). |
| `BOB_API_KEY` | — | **Required** for `bob-2.0`. Read from the environment by the CLI; never committed, never sent to the browser. |
| `BOB_MAX_TURNS` | `8` | Turn limit for one analysis. |
| `BOB_TIMEOUT_MS` | `300000` | Aborts a Bob run. One observed analysis took over 4 minutes. |
| `REPOMAP_WORKSPACE_DIR` | — | Analyse this local checkout instead of cloning. |
| `REPOMAP_CLONE_TIMEOUT_MS` | `120000` | Timeout for the shallow clone. |

Windows note: `bob` is installed as an npm shim (`bob.cmd`/`bob.ps1`) which
Node cannot spawn directly. Set:

```
BOB_CLI_PATH=C:\Users\<you>\AppData\Roaming\npm\node_modules\bobshell\dist\bob.js
```

A `.js` path is executed through the current Node binary automatically.

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

- No persistence: every request re-runs the analysis; nothing is cached or stored.
- Bob analyses a local directory, so a target repository is shallow-cloned into
  `.repomap-cache/` on first use (gitignored). Private repositories are not
  supported.
- One repository at a time; no batching, no progress streaming (a real Bob run
  takes minutes and the HTTP request blocks for that long).
- Module ids are slugs of module paths; a provider that returns duplicate paths
  collapses them.
- No auth, no rate limiting, no multi-user support (out of scope per PRD §7).
- `gotchas` are capped at 8 and `recommendedFiles` at 3 by the normaliser.

## Build plan

Feature work happens on branches off `feature/bob-analysis`. Planned milestones
from PRD §9:

1. Repo map generation (backend + Bob 2.0 calls) — **M1, done except live Bob verification**
2. Onboarding Map UI + diagram rendering
3. Scope Clarifier (ScopeShield) end-to-end
4. Debug overlay on the seeded demo repo (Tier 2, optional)
5. Release readiness verdict on a seeded diff (Tier 2, optional)
6. Demo video and submission assets

Tier 3 (Application Maintenance, PRD 5.5) is roadmap only and must not be
represented as implemented.
