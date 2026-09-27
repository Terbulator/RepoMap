/**
 * The single prompt RepoMap sends to IBM Bob 2.0 (PRD 5.1). It asks for every
 * Tier 1 output explicitly and for strict JSON so the response can be parsed
 * without guessing.
 */
import type { RepoMap } from "../../features/repomap/schema.ts";

/** ponytail: caps the rendered context; raise them if Bob misses modules in practice. */
const CONTEXT_LIMITS = { modules: 12, gotchas: 8, relationships: 12, purpose: 120 } as const;

/**
 * Renders the Onboarding Map result as prompt context.
 *
 * This is the handoff between the two halves of the product: ScopeShield sends
 * the real RepoMap so Bob starts from what the Onboarding Map already learned
 * instead of re-deriving the architecture from scratch.
 */
export function formatRepoMapContext(repoMap: RepoMap | null | undefined): string | null {
  if (!repoMap) return null;

  const lines = [
    `Repository: ${repoMap.repository.name} (${repoMap.repository.url})`,
    `Summary: ${repoMap.projectSummary}`,
    `Stack: ${repoMap.stack.join(", ")}`,
  ];

  if (repoMap.modules.length > 0) {
    lines.push("Modules:");
    for (const item of repoMap.modules.slice(0, CONTEXT_LIMITS.modules)) {
      const files = item.files.length > 0 ? ` — files: ${item.files.join(", ")}` : "";
      lines.push(`  - ${item.name} (${item.path}): ${clip(item.purpose, CONTEXT_LIMITS.purpose)}${files}`);
    }
  }

  if (repoMap.recommendedFiles.length > 0) {
    lines.push("Recommended starting files:");
    for (const file of [...repoMap.recommendedFiles].sort((a, b) => a.rank - b.rank)) {
      lines.push(`  - ${file.path}: ${clip(file.reason, CONTEXT_LIMITS.purpose)}`);
    }
  }

  if (repoMap.relationships.length > 0) {
    lines.push("Relationships:");
    for (const relationship of repoMap.relationships.slice(0, CONTEXT_LIMITS.relationships)) {
      lines.push(`  - ${relationship.source} ${relationship.type} ${relationship.target}`);
    }
  }

  if (repoMap.gotchas.length > 0) {
    lines.push("Gotchas:");
    for (const gotcha of repoMap.gotchas.slice(0, CONTEXT_LIMITS.gotchas)) {
      lines.push(`  - ${clip(gotcha, CONTEXT_LIMITS.purpose)}`);
    }
  }

  return lines.join("\n");
}

function clip(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

export function buildRepoMapPrompt(repositoryUrl: string): string {
  return [
    `Analyse the repository at ${repositoryUrl} in your workspace and describe it for a developer who has never seen it.`,
    "",
    "Step 1 — Inspect FIRST: read the repository's package.json (or equivalent manifest) and",
    "the top-level directory listing before producing any output. Identify every distinct",
    "source directory or logical layer (e.g. src/, app/, lib/, tests/, scripts/, config/).",
    "Do not return a partial answer. Before responding, identify at least 3 distinct",
    "repository modules/directories with actual repository-relative paths.",
    "",
    "Step 2 — Return ONLY a JSON object, no prose and no markdown fence, with this shape:",
    "{",
    '  "projectSummary": "2-4 plain-English sentences on what the project is and who uses it",',
    '  "stack": ["language", "framework", "notable dependency"],',
    '  "modules": [',
    '    { "id": "stable-slug-id", "name": "module name", "path": "path/or/dir", "purpose": "one sentence on what this part is responsible for", "files": ["path/to/file.ts"], "dependencies": ["id of another module"] }',
    "  ],",
    '  "recommendedFiles": [',
    '    { "path": "path/to/file.ts", "reason": "one sentence on why a newcomer should read this first", "rank": 1 }',
    "  ],",
    '  "gotchas": ["one sentence per trap a newcomer will hit"],',
    '  "relationships": [',
    '    { "source": "module id", "target": "module id", "type": "depends-on" }',
    "  ]",
    "}",
    "",
    "Requirements:",
    "- projectSummary: REQUIRED.",
    "- stack: REQUIRED.",
    "- modules: REQUIRED. Minimum 3 entries. Each entry must have id, name, path, purpose, files, and dependencies.",
    "  The modules array must never be omitted or empty — if you find fewer than 3 natural modules,",
    "  split by source directory (src/, tests/, config/ etc.).",
    "- recommendedFiles: REQUIRED. Must contain exactly 2 or 3 files, ranked 1 first.",
    "- gotchas: array (may be empty).",
    "- relationships: array (may be empty).",
    "",
    "Rules:",
    "- Cover the whole repository, not just one directory.",
    "- Module ids must be unique slugs; relationships reference those ids.",
    "- Use repository-relative paths everywhere.",
    "- Only describe what is actually in the code. Do not speculate.",
    "- The JSON object is your entire response. Do not add any text before or after it.",
  ].join("\n");
}

/**
 * The prompt ScopeShield sends to IBM Bob 2.0 (PRD 5.2).
 *
 * The RepoMap context is passed in as *supporting evidence*, not as truth: the
 * prompt tells Bob to open the files himself and to distrust the summary where
 * the code disagrees, because a scope analysis built on a stale map is exactly
 * the kind of confident wrong answer this product exists to prevent.
 */
export function buildScopeShieldPrompt(
  repositoryUrl: string,
  request: string,
  repoMapContext?: string | null,
): string {
  return [
    `You are analysing the repository at ${repositoryUrl}, which is checked out in your workspace.`,
    "",
    "A developer has asked for this feature:",
    request,
    "",
    "Inspect the actual repository in your workspace before answering. Read the files you are about to reason about, and use this repository's real architecture rather than generic assumptions about how applications like this are usually built.",
    "",
    ...(repoMapContext
      ? [
          "An earlier automated repository map of this codebase is included below.",
          "Treat it as supporting evidence, not as truth: verify anything you rely on by reading the file,",
          "and prefer the code over the map wherever the two disagree.",
          "",
          repoMapContext,
          "",
        ]
      : []),
    "Return ONLY a JSON object, no prose and no markdown fence, with this shape:",
    "{",
    '  "risk": { "level": "low" | "medium" | "high", "summary": "why this request carries this much risk, in plain English" },',
    '  "hiddenScope": [',
    '    { "layer": "frontend" | "backend" | "database" | "infrastructure" | "security-auth", "title": "the piece of work", "detail": "why it is easy to miss and what it actually involves, naming real files or modules from this repository", "tags": ["short", "concern-tags"] }',
    "  ],",
    '  "clarifyingQuestions": [',
    '    { "question": "the question to send back to the requester", "reason": "which ambiguity this resolves", "category": "frontend" | "backend" | "database" | "infrastructure" | "security-auth" }',
    "  ],",
    '  "draftedReply": "a professional reply to the developer: what is in scope, what is hidden, and what you need answered. Write it as prose they can paste into Slack or email, and do not mention that you are an AI or that this is JSON.",',
    '  "stack": { "languages": ["..."], "frameworks": ["..."], "data": ["..."], "integrations": ["..."] },',
    '  "grounding": "one or two sentences naming the specific files and modules in this repository that drove the analysis"',
    "}",
    "",
    "Rules:",
    "- Ground every item in this repository. Name the real file paths you looked at.",
    "- Do not claim something exists unless you can verify it in the repository.",
    "- hiddenScope must cover each affected architectural layer separately, not one merged list.",
    "- clarifyingQuestions must be questions a human can actually answer, about scope, acceptance criteria or the affected layer.",
    "- stack must describe THIS repository, taken from its manifests and imports.",
    "- If you cannot verify part of the request, say so in the clarifying questions instead of guessing.",
  ].join("\n");
}
