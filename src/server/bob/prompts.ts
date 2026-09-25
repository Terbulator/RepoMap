/**
 * The single prompt RepoMap sends to IBM Bob 2.0 (PRD 5.1). It asks for every
 * Tier 1 output explicitly and for strict JSON so the response can be parsed
 * without guessing.
 */
export function buildRepoMapPrompt(repositoryUrl: string): string {
  return [
    `Analyse the GitHub repository at ${repositoryUrl} and describe it for a developer who has never seen it.`,
    "",
    "Return ONLY a JSON object, no prose and no markdown fence, with this shape:",
    "{",
    '  "summary": "2-4 plain-English sentences on what the project is and who uses it",',
    '  "stack": ["language", "framework", "notable dependency"],',
    '  "modules": [',
    '    { "name": "module name", "path": "path/or/dir", "responsibility": "one sentence on what this part is responsible for", "entryPoints": ["path/to/file.tsx"], "dependsOn": ["path or name of another module"] }',
    "  ],",
    '  "recommendedFiles": [',
    '    { "path": "path/to/file.ts", "why": "one sentence on why a newcomer should read this first" }',
    "  ],",
    '  "gotchas": [',
    '    { "title": "short gotcha title", "detail": "one sentence explaining the trap and how to avoid it" }',
    "  ]",
    "}",
    "",
    "Rules:",
    "- Cover the whole repository, not just one directory.",
    "- recommendedFiles must contain exactly 2 or 3 files, best first.",
    "- Use repository-relative paths everywhere.",
    "- Only describe what is actually in the code. Do not speculate.",
  ].join("\n");
}
