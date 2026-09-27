import { z } from "zod";
import type { AnalyzeErrorResponse } from "../repomap/schema.ts";
import { repoMapSchema } from "../repomap/schema.ts";
import type { DomainId } from "./risk-analysis.ts";

/**
 * The ScopeShield server contract (PRD 5.2).
 *
 * `scopeProviderAnalysisSchema` is the exact shape IBM Bob 2.0 has to return.
 * It is deliberately strict: a missing risk level or an empty hiddenScope is a
 * provider failure, never a value this server fills in, because a ScopeShield
 * result that quietly invents its own analysis is worse than an error the user
 * can see and retry.
 *
 * The layer vocabulary is Bob-facing. `security-auth` becomes the `security`
 * DomainId at the UI boundary (see server/scope-shield/analyze-scope.ts).
 */

/** Architectural layers Bob must assign every finding to. */
export const scopeLayerSchema = z.enum([
  "frontend",
  "backend",
  "database",
  "infrastructure",
  "security-auth",
]);

export const scopeRiskSchema = z.object({
  level: z.enum(["low", "medium", "high"]),
  summary: z.string().min(1),
});

export const hiddenScopeItemSchema = z.object({
  layer: scopeLayerSchema,
  title: z.string().min(1),
  detail: z.string().min(1),
  // No default: an omitted tags array is a malformed response, not an empty one.
  tags: z.array(z.string().min(1)),
});

export const scopeQuestionSchema = z.object({
  question: z.string().min(1),
  reason: z.string().min(1),
  category: scopeLayerSchema,
});

/**
 * Stack fields are required and may legitimately be empty — "no cache found" is
 * real information. They are not defaulted, because an absent field is a
 * malformed response rather than an empty finding.
 */
export const scopeStackSchema = z.object({
  languages: z.array(z.string().min(1)),
  frameworks: z.array(z.string().min(1)),
  data: z.array(z.string().min(1)),
  integrations: z.array(z.string().min(1)),
});

/** What IBM Bob 2.0 must return for one ScopeShield run. */
export const scopeProviderAnalysisSchema = z
  .object({
    risk: scopeRiskSchema,
    hiddenScope: z.array(hiddenScopeItemSchema).min(1),
    clarifyingQuestions: z.array(scopeQuestionSchema).min(1),
    draftedReply: z.string().min(1),
    stack: scopeStackSchema,
    grounding: z.string().min(1),
  })
  // Strict: the prompt fixes the top-level shape, so an extra or renamed key is a
  // contract drift this server should surface instead of silently dropping.
  .strict();

export type ScopeProviderAnalysis = z.infer<typeof scopeProviderAnalysisSchema>;
export type ScopeLayer = z.infer<typeof scopeLayerSchema>;

/**
 * The only translation between Bob's layer vocabulary and the UI's DomainId.
 * `security-auth` is the single rename; both directions are derived from the
 * same table so the mock provider and the real mapper cannot drift apart.
 */
export const SCOPE_LAYER_TO_DOMAIN_ID: Record<ScopeLayer, DomainId> = {
  frontend: "frontend",
  backend: "backend",
  database: "database",
  infrastructure: "infrastructure",
  "security-auth": "security",
};

export const DOMAIN_ID_TO_SCOPE_LAYER: Record<DomainId, ScopeLayer> = {
  frontend: "frontend",
  backend: "backend",
  database: "database",
  infrastructure: "infrastructure",
  security: "security-auth",
};

/** API body: POST /api/scope-shield. `repoMap` is the real Onboarding Map result. */
export const scopeShieldRequestSchema = z.object({
  request: z.string().min(10, "Describe the feature in at least 10 characters."),
  repository: z.string().min(1, "A repository is required."),
  repoMap: repoMapSchema.nullish(),
});

export type ScopeShieldRequest = z.infer<typeof scopeShieldRequestSchema>;

/** Reuses the Onboarding Map error vocabulary so both endpoints read the same. */
export type ScopeShieldErrorCode = AnalyzeErrorResponse["error"]["code"];

export const scopeShieldErrorResponseSchema = z.object({
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

export type ScopeShieldErrorResponse = z.infer<typeof scopeShieldErrorResponseSchema>;
