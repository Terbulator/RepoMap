/**
 * The single prompt RepoMap sends to IBM Bob 2.0 (PRD 5.1). It asks for every
 * Tier 1 output explicitly and for strict JSON so the response can be parsed
 * without guessing.
 */
export function buildRepoMapPrompt(repositoryUrl: string): string {
  return [
    `Analyse the repository at ${repositoryUrl} in your workspace and describe it for a developer who has never seen it.`,
    "",
    "Return ONLY a JSON object, no prose and no markdown fence, with this shape:",
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
    "Rules:",
    "- Cover the whole repository, not just one directory.",
    "- Module ids must be unique slugs; relationships reference those ids.",
    "- recommendedFiles must contain 2 or 3 files, ranked 1 first.",
    "- Use repository-relative paths everywhere.",
    "- Only describe what is actually in the code. Do not speculate.",
  ].join("\n");
}
