import { z } from "zod";

/**
 * The RepoMap contract (PRD 5.1, FR-2 to FR-5).
 *
 * This is the only shape the frontend consumes. Raw IBM Bob 2.0 output never
 * leaves the server: `src/features/repomap/normalize.ts` converts it into this
 * contract, so the Onboarding Map and ScopeShield can be built against a stable
 * interface while Bob's output changes underneath.
 */

export const repoMapModuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  path: z.string().min(1),
  purpose: z.string().min(1),
  files: z.array(z.string().min(1)).default([]),
  dependencies: z.array(z.string().min(1)).default([]),
});

export const recommendedFileSchema = z.object({
  path: z.string().min(1),
  reason: z.string().min(1),
  rank: z.number().int().min(1).max(3),
});

export const relationshipSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  type: z.string().min(1),
});

/**
 * PRD §7 "transparency of AI involvement": who produced this map, and which
 * Bob task it can be traced back to. `provider: "mock"` is always development
 * data, never a real analysis.
 */
export const provenanceSchema = z.object({
  provider: z.enum(["bob-2.0", "mock"]),
  bobTaskId: z.string().min(1).nullable(),
  generatedAt: z.string().min(1),
  durationMs: z.number().int().nonnegative(),
  notice: z.string().min(1).nullable(),
});

export const repositorySchema = z.object({
  url: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
});

export const repoMapSchema = z.object({
  schemaVersion: z.literal(1),
  repository: repositorySchema,
  provenance: provenanceSchema,
  projectSummary: z.string().min(1),
  stack: z.array(z.string().min(1)).default([]),
  modules: z.array(repoMapModuleSchema).min(1),
  recommendedFiles: z.array(recommendedFileSchema).min(1).max(3),
  gotchas: z.array(z.string().min(1)).default([]),
  relationships: z.array(relationshipSchema).default([]),
});

export type RepoMap = z.infer<typeof repoMapSchema>;
export type RepoMapModule = z.infer<typeof repoMapModuleSchema>;
export type RecommendedFile = z.infer<typeof recommendedFileSchema>;
export type Relationship = z.infer<typeof relationshipSchema>;
export type Provenance = z.infer<typeof provenanceSchema>;
export type RepositoryRef = z.infer<typeof repositorySchema>;

/** API envelope: POST /api/repository/analyze */
export const analyzeResponseSchema = z.object({
  success: z.literal(true),
  analysis: repoMapSchema,
});

export const analyzeErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum([
      "INVALID_REQUEST",
      "INVALID_REPOSITORY",
      "PROVIDER_UNAVAILABLE",
      "PROVIDER_FAILED",
      "INVALID_ANALYSIS",
      "INTERNAL_ERROR",
    ]),
    message: z.string().min(1),
  }),
});

export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;
export type AnalyzeErrorResponse = z.infer<typeof analyzeErrorResponseSchema>;

/**
 * Loosest shape accepted from a provider before normalisation: every field is
 * optional so a partial Bob answer is normalised rather than rejected outright.
 */
export const providerAnalysisSchema = z.object({
  projectSummary: z.string().optional(),
  summary: z.string().optional(),
  stack: z.array(z.string()).optional(),
  modules: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().optional(),
        path: z.string().optional(),
        purpose: z.string().optional(),
        responsibility: z.string().optional(),
        files: z.array(z.string()).optional(),
        entryPoints: z.array(z.string()).optional(),
        dependencies: z.array(z.string()).optional(),
        dependsOn: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  recommendedFiles: z
    .array(
      z.object({
        path: z.string().optional(),
        reason: z.string().optional(),
        why: z.string().optional(),
        rank: z.number().optional(),
      }),
    )
    .optional(),
  gotchas: z
    .array(z.union([z.string(), z.object({ title: z.string().optional(), detail: z.string().optional() })]))
    .optional(),
  relationships: z
    .array(
      z.object({
        source: z.string().optional(),
        target: z.string().optional(),
        type: z.string().optional(),
        relation: z.string().optional(),
      }),
    )
    .optional(),
});

export type ProviderAnalysis = z.infer<typeof providerAnalysisSchema>;
