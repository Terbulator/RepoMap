/**
 * Stage 3 of ScopeShield (PRD 5.2 / FR-6): clarifying questions to ask before
 * anyone writes code.
 *
 * MOCK generator. Questions are picked from a pool by keyword match, so the
 * list follows the request instead of being generic. Stage 4 replaces this with
 * the IBM Bob 2.0 provider; `ClarifyingQuestion` is the contract for that call.
 */

import type { DomainId } from "@/features/scope-shield/risk-analysis";

export type ClarifyingQuestion = {
  /** Stable id so React keys and the checklist state stay predictable. */
  id: string;
  /** The question to send to the requester. */
  question: string;
  /** What ambiguity this resolves. Shown under the question. */
  why: string;
  /** Short topic slug used as a badge. */
  topic: string;
  /** Architectural layer this question protects, when it maps to one. */
  layer: DomainId | null;
};

type QuestionTemplate = {
  id: string;
  topic: string;
  layer: DomainId | null;
  question: string;
  why: string;
  /** Rank of a match: a hit outranks a question that always applies. */
  weight: number;
  keywords: string[];
};

/**
 * `weight` is the score when nothing in the request matches. A keyword hit adds
 * 3, so request-specific questions always outrank the generic safety net.
 */
const QUESTION_POOL: QuestionTemplate[] = [
  {
    id: "scope-boundary",
    topic: "scope",
    layer: null,
    question:
      "What is explicitly out of scope for the first version of this, and what would make you drop it?",
    why: "Scope creep starts where the boundary is never written down.",
    weight: 1,
    keywords: [],
  },
  {
    id: "acceptance-criterion",
    topic: "acceptance",
    layer: null,
    question:
      "What is the acceptance criterion that tells us this is done, and who signs it off?",
    why: "A shared definition of done prevents a second round of rework.",
    weight: 1,
    keywords: [],
  },
  {
    id: "external-downtime",
    topic: "failure handling",
    layer: "frontend",
    question:
      "How should the UI behave when an external service is down, slow or returns an error mid-task?",
    why: "Edge cases and provider downtime are where unplanned work appears.",
    weight: 1,
    keywords: [
      "provider",
      "integration",
      "third party",
      "stripe",
      "twilio",
      "openai",
      "s3",
      "github",
      "slack",
      "webhook",
      "api",
      "sync",
      "import",
      "export",
    ],
  },
  {
    id: "rollout-guard",
    topic: "delivery",
    layer: "infrastructure",
    question:
      "Should this ship behind a feature flag, and who can turn it off if it misbehaves in production?",
    why: "A toggle costs hours; a rollback costs the release.",
    weight: 1,
    keywords: ["deploy", "release", "production", "rollout", "flag"],
  },
  {
    id: "role-scope",
    topic: "access",
    layer: "security",
    question:
      "Should this feature support multi-tenant role permissions, or are basic role checks enough?",
    why: "Multi-tenancy changes every query, every cache key and every test.",
    weight: 0,
    keywords: [
      "role",
      "permission",
      "admin",
      "team",
      "member",
      "tenant",
      "owner",
      "access",
      "auth",
      "share",
      "collaborat",
    ],
  },
  {
    id: "rate-limit-audit",
    topic: "reliability",
    layer: "security",
    question:
      "What rate limiting, audit logging or compliance requirements apply to the endpoints this adds?",
    why: "Both are cheap to add during the change and expensive to retrofit.",
    weight: 0,
    keywords: [
      "endpoint",
      "api",
      "route",
      "webhook",
      "admin",
      "payment",
      "upload",
      "export",
      "report",
      "public",
    ],
  },
  {
    id: "error-surfaces",
    topic: "failure handling",
    layer: "backend",
    question:
      "Which failures must the user see verbatim, and which should we retry or swallow quietly?",
    why: "Decides retry logic, error contracts and what the UI has to render.",
    weight: 0,
    keywords: [
      "retry",
      "queue",
      "batch",
      "process",
      "generate",
      "send",
      "email",
      "notify",
      "background",
    ],
  },
  {
    id: "data-migration",
    topic: "data",
    layer: "database",
    question:
      "Do we need to migrate or backfill existing data, and what is the rollback plan if the migration goes wrong?",
    why: "Schema changes need a forward migration, a backfill and a tested rollback.",
    weight: 0,
    keywords: [
      "database",
      "record",
      "store",
      "save",
      "history",
      "report",
      "payment",
      "invoice",
      "user",
      "role",
      "profile",
      "existing",
    ],
  },
  {
    id: "session-lifetime",
    topic: "session",
    layer: "security",
    question:
      "Do users need to stay signed in across devices, and what should happen when a session expires mid-task?",
    why: "Decides token lifetime, refresh flow and whether work is lost.",
    weight: 0,
    keywords: [
      "auth",
      "login",
      "sign in",
      "signin",
      "session",
      "token",
      "password",
      "register",
      "signup",
    ],
  },
  {
    id: "payment-reconciliation",
    topic: "payments",
    layer: "backend",
    question:
      "How are duplicate charges, failed payments and refunds detected and reconciled?",
    why: "Money paths need idempotency and a manual override story, not retries.",
    weight: 0,
    keywords: [
      "payment",
      "pay",
      "stripe",
      "checkout",
      "billing",
      "subscription",
      "invoice",
      "refund",
      "price",
      "cart",
    ],
  },
  {
    id: "file-limits",
    topic: "files",
    layer: "infrastructure",
    question:
      "What are the size and type limits for uploads, where are files stored, and how long are they kept?",
    why: "Storage, scanning and retention are never part of the original ask.",
    weight: 0,
    keywords: [
      "upload",
      "file",
      "image",
      "photo",
      "attachment",
      "document",
      "pdf",
      "csv",
    ],
  },
  {
    id: "scale-target",
    topic: "performance",
    layer: "database",
    question:
      "What volume should this handle, and which query or page is expected to be the slow one?",
    why: "Load and indexing decisions are made here or not at all.",
    weight: 0,
    keywords: [
      "report",
      "search",
      "filter",
      "list",
      "table",
      "chart",
      "bulk",
      "large",
      "dashboard",
    ],
  },
];

const DEFAULT_LIMIT = 4;
const MIN_QUESTIONS = 3;
const KEYWORD_HIT_SCORE = 3;

function toQuestion(template: QuestionTemplate, signal: string): ClarifyingQuestion {
  return {
    id: template.id,
    question: template.question,
    why: signal
      ? `${template.why} (raised by "${signal}" in the request)`
      : template.why,
    topic: template.topic,
    layer: template.layer,
  };
}

/**
 * Builds the mock clarifying questions for a request.
 *
 * Deterministic: the same request always produces the same list, in the same
 * order, with the request-specific questions first.
 */
export function generateClarifyingQuestions(
  request: string,
  limit: number = DEFAULT_LIMIT,
): ClarifyingQuestion[] {
  const text = request.toLowerCase();
  const maxCount = Math.max(limit, MIN_QUESTIONS);

  const scored = QUESTION_POOL.map((template, index) => {
    const signal = template.keywords.find((keyword) => text.includes(keyword)) ?? "";
    const score = template.weight + (signal ? KEYWORD_HIT_SCORE : 0);
    return { template, index, signal, score };
  });

  const questions = scored
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, maxCount)
    .map((entry) => toQuestion(entry.template, entry.signal));

  // Nothing in the request matched: fall back to the safety-net questions in
  // pool order, so a vague request still gets the three that always apply.
  for (const entry of scored) {
    if (questions.length >= maxCount) break;
    if (questions.some((question) => question.id === entry.template.id)) continue;
    questions.push(toQuestion(entry.template, entry.signal));
  }

  return questions;
}

/** Plain-text form used by the "Copy Questions" button. */
export function formatQuestions(questions: ClarifyingQuestion[]): string {
  return questions
    .map(
      (question, index) =>
        `${index + 1}. ${question.question}\n   Why: ${question.why}`,
    )
    .join("\n\n");
}
