import { z } from "zod";

/**
 * RepoMap data contract (PRD 5.1 / FR-2, FR-3, FR-4, FR-5).
 *
 * The `repoMapSchema` below is the strict contract the rest of the app can rely
 * on. The looser `bobAnalysisSchema` is what we ask IBM Bob 2.0 to produce;
 * `toRepoMap` normalises one into the other so a slightly-off model response
 * degrades instead of failing the request.
 */

export const repoMapNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(["module", "file"]),
  path: z.string().min(1),
});

export const repoMapEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  relation: z.enum(["contains", "imports", "depends-on"]),
});

export const repoMapModuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  path: z.string().min(1),
  responsibility: z.string().min(1),
  entryPoints: z.array(z.string().min(1)).default([]),
  dependsOn: z.array(z.string().min(1)).default([]),
});

export const recommendedFileSchema = z.object({
  rank: z.number().int().min(1).max(3),
  path: z.string().min(1),
  why: z.string().min(1),
});

export const gotchaSchema = z.object({
  title: z.string().min(1),
  detail: z.string().min(1),
});

/**
 * Provenance for PRD §7 "transparency of AI involvement": which provider
 * produced this map and which Bob 2.0 task/session it can be traced back to.
 */
export const repoMapProvenanceSchema = z.object({
  provider: z.enum(["bob-2.0", "stub"]),
  bobTaskId: z.string().min(1).nullable(),
  model: z.string().min(1).nullable(),
  requestedAt: z.string().min(1),
  completedAt: z.string().min(1),
  durationMs: z.number().int().nonnegative(),
});

export const repoMapSchema = z.object({
  schemaVersion: z.literal(1),
  repository: z.object({
    url: z.string().min(1),
    slug: z.string().min(1),
    name: z.string().min(1),
  }),
  provenance: repoMapProvenanceSchema,
  summary: z.string().min(1),
  stack: z.array(z.string().min(1)).default([]),
  modules: z.array(repoMapModuleSchema).min(1),
  recommendedFiles: z.array(recommendedFileSchema).min(1).max(3),
  diagram: z.object({
    nodes: z.array(repoMapNodeSchema),
    edges: z.array(repoMapEdgeSchema),
  }),
  gotchas: z.array(gotchaSchema).default([]),
});

export type RepoMap = z.infer<typeof repoMapSchema>;
export type RepoMapModule = z.infer<typeof repoMapModuleSchema>;
export type RepoMapNode = z.infer<typeof repoMapNodeSchema>;
export type RepoMapEdge = z.infer<typeof repoMapEdgeSchema>;
export type RepoMapProvenance = z.infer<typeof repoMapProvenanceSchema>;

/** Shape we request from IBM Bob 2.0. Every field is optional-ish on purpose. */
export const bobAnalysisSchema = z.object({
  summary: z.string().default(""),
  stack: z.array(z.string()).default([]),
  modules: z
    .array(
      z.object({
        name: z.string().default(""),
        path: z.string().default(""),
        responsibility: z.string().default(""),
        entryPoints: z.array(z.string()).default([]),
        dependsOn: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  recommendedFiles: z
    .array(
      z.object({
        path: z.string().default(""),
        why: z.string().default(""),
      }),
    )
    .default([]),
  gotchas: z
    .array(z.object({ title: z.string().default(""), detail: z.string().default("") }))
    .default([]),
});

export type BobAnalysis = z.infer<typeof bobAnalysisSchema>;
