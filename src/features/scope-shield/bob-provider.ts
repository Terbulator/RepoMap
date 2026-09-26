/**
 * IBM Bob 2.0 provider for ScopeShield scope analysis (Stage 6 live path).
 *
 * This module is server-only: it reads `BOB_API_KEY` and `BOB_ENDPOINT` from the
 * environment and makes the HTTP call to Bob 2.0. It is imported by the
 * `/api/scope/analyze` API route, never by client code. The client talks to the
 * API route so credentials never reach the browser bundle.
 *
 * The contract shapes — `RiskAnalysis`, `ClarifyingQuestion`, `StackContext` —
 * stay in their feature modules. This module validates/coerces raw Bob output
 * into those shapes, mirroring how `src/features/repomap/normalize.ts`
 * normalises repository analysis.
 */

import { z } from "zod";
import { extractJsonPayload, readString } from "../../server/bob/json.ts";
import type { ClarifyingQuestion } from "./clarifying-questions.ts";
import type {
  DomainId,
  DomainRisk,
  RiskAnalysis,
  RiskItem,
  RiskLevel,
  RiskSource,
} from "./risk-analysis.ts";
import type { RepositoryContext, StackContext } from "./stack-context.ts";

/** Payload the client sends to /api/scope/analyze. */
export type ScopeAnalysisRequest = {
  request: string;
  repositoryContext: RepositoryContext;
  stackContext: StackContext;
};

/**
 * What a live Bob 2.0 run returns — the part that replaces the three mock
 * generators. `draft` and `grounding` are computed client-side by the existing
 * deterministic composers (`buildDraftedReply`, `formatGroundingNote`), so Bob
 * only has to produce analysis, questions and stack.
 */
export type BobScopeResult = {
  request: string;
  analysis: RiskAnalysis;
  questions: ClarifyingQuestion[];
  stack: StackContext;
};

export type BobScopeTrace = {
  taskId: string | null;
  model: string | null;
};

export type BobScopeResponse = BobScopeResult & {
  trace: BobScopeTrace;
};

export type BobScopeOptions = {
  endpoint: string;
  apiKey: string;
  timeoutMs: number;
  maxTokens?: number;
  fetchImpl?: typeof fetch;
};

/** Error response envelope for /api/scope/analyze, mirroring the repomap route. */
export const ANALYZE_SCOPE_ERROR_CODES = [
  "INVALID_REQUEST",
  "PROVIDER_UNAVAILABLE",
  "PROVIDER_FAILED",
  "INTERNAL_ERROR",
] as const;

export const analyzeScopeErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum(ANALYZE_SCOPE_ERROR_CODES),
    message: z.string().min(1),
  }),
});

export type AnalyzeScopeErrorResponse = z.infer<
  typeof analyzeScopeErrorResponseSchema
>;

/** Schema for the body the client POSTs to /api/scope/analyze. */
const repositoryContextSchema = z.object({
  repositoryName: z.string(),
  primaryStack: z.array(z.string()),
  authArchitecture: z.array(z.string()),
  directories: z.array(z.string()),
  provenance: z.object({
    source: z.string(),
    analyzedAt: z.string(),
    moduleCount: z.number(),
    note: z.string(),
  }),
});

const stackContextSchema = z.object({
  languages: z.array(z.string()),
  frameworks: z.array(z.string()),
  data: z.array(z.string()),
  integrations: z.array(z.string()),
});

export const bobScopeRequestSchema = z.object({
  request: z.string().min(1),
  repositoryContext: repositoryContextSchema,
  stackContext: stackContextSchema,
});

export type BobScopeRequest = z.infer<typeof bobScopeRequestSchema>;

export class BobScopeProviderError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "BobScopeProviderError";
    this.cause = cause;
  }
}

/* --- Loosened zod schemas: accept variations, repair in TypeScript --- */

const DOMAIN_IDS = ["frontend", "backend", "database", "infrastructure", "security"] as const;
const RISK_LEVELS = ["HIGH", "MEDIUM", "LOW"] as const;
const RISK_SOURCES = ["preset", "trigger", "baseline"] as const;

const DOMAIN_LABELS: Record<DomainId, string> = {
  frontend: "Frontend",
  backend: "Backend",
  database: "Database",
  infrastructure: "Infrastructure",
  security: "Security & Auth",
};

function isDomainId(value: unknown): value is DomainId {
  return typeof value === "string" && (DOMAIN_IDS as readonly string[]).includes(value);
}
function isRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === "string" && (RISK_LEVELS as readonly string[]).includes(value);
}
function isRiskSource(value: unknown): value is RiskSource {
  return typeof value === "string" && (RISK_SOURCES as readonly string[]).includes(value);
}

const bobRiskItemSchema = z.object({
  id: z.string().default("item"),
  title: z.string().default("Hidden work"),
  detail: z.string().default(""),
  signal: z.string().default("always"),
  tags: z.array(z.string()).default([]),
  source: z.string().default("trigger"),
});

const bobDomainRiskSchema = z.object({
  id: z.string().default("frontend"),
  name: z.string().default(""),
  items: z.array(bobRiskItemSchema).default([]),
});

const bobRiskAnalysisSchema = z.object({
  request: z.string().optional(),
  riskLevel: z.string().default("LOW"),
  summary: z.string().default(""),
  domains: z.array(bobDomainRiskSchema).default([]),
  totalItems: z.union([z.number(), z.string()]).default(0),
});

const bobClarifyingQuestionSchema = z.object({
  id: z.string().default("question"),
  question: z.string().default("Could you clarify this?"),
  why: z.string().default("Missing context."),
  topic: z.string().default("scope"),
  layer: z.union([z.string(), z.null()]).default(null),
});

const bobStackSchema = z.object({
  languages: z.array(z.string()).default([]),
  frameworks: z.array(z.string()).default([]),
  data: z.array(z.string()).default([]),
  integrations: z.array(z.string()).default([]),
});

const bobScopeResponseSchema = z.object({
  analysis: bobRiskAnalysisSchema.optional(),
  questions: z.array(bobClarifyingQuestionSchema).optional(),
  stack: bobStackSchema.optional(),
});

/* --- Prompt builders --- */

/**
 * System prompt that grounds Bob 2.0 in the detected repository stack (FR-7).
 * The repository context — primary stack, auth architecture, directories — is
 * passed here and becomes the lens through which Bob weighs hidden scope.
 */
export function buildScopeSystemPrompt(
  context: RepositoryContext,
  stack: StackContext,
): string {
  const stackSummary = [
    ...stack.languages,
    ...stack.frameworks,
    ...stack.data,
    ...stack.integrations,
  ].join(", ");

  return [
    "You are ScopeShield, a scope-analysis assistant that finds hidden work and unspoken requirements before implementation begins.",
    "",
    "GROUNDING — the target repository the feature is being built in:",
    `Repository: ${context.repositoryName}`,
    `Primary stack: ${context.primaryStack.join(", ") || "not detected"}`,
    `Auth & middleware: ${(context.authArchitecture ?? ["not detected"]).join(", ") || "not detected"}`,
    `Primary directories: ${(context.directories ?? []).slice(0, 6).join(", ") || "not detected"}`,
    `Provenance: ${context.provenance.source} · ${context.provenance.moduleCount} modules`,
    "",
    `Implied stack from this request: ${stackSummary || "none"}`,
    "",
    "Instructions:",
    "- Analyse the feature request against this codebase and surface hidden scope across these layers: frontend, backend, database, infrastructure, security.",
    "- Identify risk level: HIGH (4+ signals), MEDIUM (2+ signals), LOW (fewer).",
    "- Each hidden-scope item needs an id, title, detail (why it's missed), signal (the triggering word or 'always'), tags, and source (preset/trigger/baseline).",
    "- Generate 3-4 clarifying questions a developer should ask before writing code. Each needs an id, question text, why (the ambiguity it resolves), topic slug, and the layer it protects (or null).",
    "- Return the implied stack context (languages, frameworks, data stores, integrations) as a structured object.",
    "- Return ONLY a JSON object, no prose and no markdown fence.",
  ].join("\n");
}

/** Builds the user prompt Bob 2.0 sees — the feature request itself. */
export function buildScopeUserPrompt(request: string): string {
  return `Feature request: "${request}"`;
}

/**
 * Builds the request body for the Bob 2.0 HTTP API. The envelope is kept
 * generic (system_prompt + prompt) so it works with any Bob 2.0 chat-style
 * endpoint.
 */
export function buildBobScopeBody(
  request: string,
  context: RepositoryContext,
  stack: StackContext,
  maxTokens = 8000,
): Record<string, unknown> {
  return {
    system_prompt: buildScopeSystemPrompt(context, stack),
    prompt: buildScopeUserPrompt(request),
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
  };
}

/* --- Response normalisation --- */

/**
 * Normalises raw Bob output (string or object, possibly wrapped) into
 * `BobScopeResult`. Throws `BobScopeProviderError` when the response carries no
 * usable scope analysis at all.
 */
export function normalizeBobScopeResponse(raw: unknown, request: string): BobScopeResult {
  const payload = parseScopeJson(raw);

  if (payload == null || typeof payload !== "object") {
    throw new BobScopeProviderError(
      "Bob 2.0 returned no parsable JSON for scope analysis.",
    );
  }

  let parsed: z.infer<typeof bobScopeResponseSchema>;
  try {
    parsed = bobScopeResponseSchema.parse(payload);
  } catch (error) {
    throw new BobScopeProviderError(
      "Bob 2.0 scope response did not match the expected contract.",
      error,
    );
  }

  const analysis = normalizeRiskAnalysis(parsed.analysis, request);
  const questions = normalizeQuestions(parsed.questions);
  const stack = normalizeStack(parsed.stack);

  if (analysis.domains.length === 0) {
    throw new BobScopeProviderError(
      "Bob 2.0 returned no hidden-scope domains in the analysis.",
    );
  }
  if (questions.length === 0) {
    throw new BobScopeProviderError(
      "Bob 2.0 returned no clarifying questions.",
    );
  }

  return { request, analysis, questions, stack };
}

function normalizeRiskAnalysis(raw: unknown, request: string): RiskAnalysis {
  const parsed = bobRiskAnalysisSchema.parse(raw ?? {});

  const domains: DomainRisk[] = (parsed.domains ?? [])
    .map((domain): DomainRisk => {
      const id: DomainId = isDomainId(domain.id) ? domain.id : "frontend";
      const items: RiskItem[] = (domain.items ?? [])
        .map((item, index): RiskItem => ({
          id: item.id || `item-${id}-${index}`,
          title: item.title || `Hidden work for ${id}`,
          detail: item.detail || "",
          signal: item.signal || "always",
          tags: deduplicate((item.tags ?? []).filter(Boolean)),
          source: isRiskSource(item.source) ? item.source : "trigger",
        }))
        .filter((item) => item.title);

      return {
        id,
        name: DOMAIN_LABELS[id],
        items,
      };
    })
    .filter((domain) => domain.items.length > 0);

  const totalItems = domains.reduce(
    (total, domain) => total + domain.items.length,
    0,
  );

  const riskLevel: RiskLevel = isRiskLevel(parsed.riskLevel) ? parsed.riskLevel : "LOW";

  return {
    request,
    riskLevel,
    summary: parsed.summary || `Scope analysis for "${request}".`,
    domains,
    totalItems: Number.isFinite(totalItems) && totalItems > 0 ? totalItems : domains.length,
  };
}

function normalizeQuestions(raw: unknown): ClarifyingQuestion[] {
  const parsed = z.array(bobClarifyingQuestionSchema).parse(raw ?? []);
  return parsed.map(
    (entry, index): ClarifyingQuestion => ({
      id: entry.id || `question-${index}`,
      question: entry.question,
      why: entry.why,
      topic: entry.topic,
      layer: isDomainId(entry.layer) ? entry.layer : null,
    }),
  );
}

function normalizeStack(raw: unknown): StackContext {
  const parsed = bobStackSchema.parse(raw ?? {});
  return {
    languages: deduplicate((parsed.languages ?? []).filter(Boolean)),
    frameworks: deduplicate((parsed.frameworks ?? []).filter(Boolean)),
    data: deduplicate((parsed.data ?? []).filter(Boolean)),
    integrations: deduplicate((parsed.integrations ?? []).filter(Boolean)),
  };
}

function deduplicate(values: string[]): string[] {
  return Array.from(new Set(values));
}

/**
 * Parses raw Bob output into a JSON value. Handles strings (JSON, fenced,
 * embedded in prose) and objects (direct shape or wrapped in common
 * chat-completion envelopes). Unlike `extractJsonPayload`, this does NOT unwrap
 * an object that already has the scope-analysis keys (`analysis`/`questions`/
 * `stack`), because those keys would collide with the envelope scanner.
 */
function parseScopeJson(raw: unknown): unknown {
  if (typeof raw === "string") {
    const parsed = extractJsonPayload(raw);
    if (parsed != null && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parseScopeJson(parsed);
    }
    return parsed;
  }

  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    const record = raw as Record<string, unknown>;

    if (record.analysis || record.questions || record.stack) {
      return raw;
    }

    for (const key of ["data", "result", "output", "text"]) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.trim()) {
        const parsed = extractJsonPayload(candidate);
        if (parsed != null) return parseScopeJson(parsed);
      }
    }

    if (Array.isArray(record.choices)) {
      for (const choice of record.choices) {
        if (choice == null || typeof choice !== "object") continue;
        const choiceRecord = choice as Record<string, unknown>;
        const message = choiceRecord.message;
        if (typeof message === "string" && message.trim()) {
          const parsed = extractJsonPayload(message);
          if (parsed != null) return parseScopeJson(parsed);
        }
        if (message != null && typeof message === "object") {
          const content = (message as Record<string, unknown>).content;
          if (typeof content === "string" && content.trim()) {
            const parsed = extractJsonPayload(content);
            if (parsed != null) return parseScopeJson(parsed);
          }
        }
      }
    }
  }

  return raw;
}

/* --- HTTP client --- */

/**
 * Calls the IBM Bob 2.0 HTTP API for scope analysis.
 *
 * Reads credentials from `options` (the API route reads them from env before
 * calling). Aborts after `timeoutMs` via `AbortController`. The response body is
 * parsed so fenced, streamed or envelope-wrapped JSON is handled. Throws
 * `BobScopeProviderError` on any failure.
 */
export async function callBobScopeApi(
  payload: ScopeAnalysisRequest,
  options: BobScopeOptions,
): Promise<BobScopeResponse> {
  const { endpoint, apiKey, timeoutMs, maxTokens = 8000, fetchImpl = fetch } = options;

  if (!endpoint) {
    throw new BobScopeProviderError(
      "BOB_ENDPOINT is not set; cannot call IBM Bob 2.0 for scope analysis.",
    );
  }
  if (!apiKey) {
    throw new BobScopeProviderError(
      "BOB_API_KEY is not set; headless IBM Bob 2.0 runs require it.",
    );
  }

  const body = buildBobScopeBody(
    payload.request,
    payload.repositoryContext,
    payload.stackContext,
    maxTokens,
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new BobScopeProviderError(
        `IBM Bob 2.0 scope analysis timed out after ${timeoutMs}ms.`,
      );
    }
    throw new BobScopeProviderError(
      "Network error calling IBM Bob 2.0 for scope analysis.",
      error,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const detail = await safeText(response).catch(() => "");
    throw new BobScopeProviderError(
      `IBM Bob 2.0 scope analysis returned HTTP ${response.status}${
        response.statusText ? ` ${response.statusText}` : ""
      }: ${detail.slice(0, 300)}`,
    );
  }

  const text = await response.text();
  const trace = extractTrace(text, response);
  const result = normalizeBobScopeResponse(text, payload.request);

  return { ...result, trace };
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

/** Best-effort extraction of a task id / model from the raw response. */
function extractTrace(
  rawText: string,
  response: Response,
): BobScopeTrace {
  const headerTaskId =
    typeof response.headers?.get === "function"
      ? response.headers.get("x-bob-task-id")
      : null;
  const headerModel =
    typeof response.headers?.get === "function"
      ? response.headers.get("x-bob-model")
      : null;

  if (headerTaskId || headerModel) {
    return { taskId: headerTaskId, model: headerModel };
  }

  const payload = extractJsonPayload(rawText);
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    return {
      taskId:
        readString(record.taskId) ??
        readString(record.id) ??
        readString(record.sessionId) ??
        null,
      model: readString(record.model) ?? null,
    };
  }

  return { taskId: null, model: null };
}
