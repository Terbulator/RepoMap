/**
 * Stage 2 of ScopeShield (PRD 5.2): hidden-scope detection.
 *
 * IMPORTANT: this is a MOCK detector. It combines three sources of hidden work:
 *
 *  1. Presets  — structured templates for the common asks (auth, payments,
 *                roles). Matched on keywords, so "Add authentication" always
 *                returns the same recognisable list.
 *  2. Triggers — keyword rules that add a single specific item per layer.
 *  3. Baseline — items that are unspoken for almost any feature request.
 *
 * No AI is consulted. A real provider replaces `analyzeFeatureRequest`; the
 * returned `RiskAnalysis` shape is the contract that call must satisfy.
 */

import { findSignal, matchesAny } from "./keyword-match.ts";

export type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

export type DomainId =
  | "frontend"
  | "backend"
  | "database"
  | "infrastructure"
  | "security";

/** Where an item came from. Surfaced in the UI so the mock is not mistaken for AI. */
export type RiskSource = "preset" | "trigger" | "baseline";

export type RiskItem = {
  /** Stable id so React keys stay predictable. */
  id: string;
  /** Short name of the piece of work. */
  title: string;
  /** Why it is easy to miss in the original request. */
  detail: string;
  /** The word in the request that pulled this item in. */
  signal: string;
  /** Short concern tags, e.g. "migration", "middleware", "validation". */
  tags: string[];
  source: RiskSource;
};

export type DomainRisk = {
  id: DomainId;
  name: string;
  items: RiskItem[];
};

export type RiskAnalysis = {
  request: string;
  riskLevel: RiskLevel;
  summary: string;
  domains: DomainRisk[];
  totalItems: number;
};

/** Layer label as shown in the UI. */
const DOMAIN_NAMES: Record<DomainId, string> = {
  frontend: "Frontend",
  backend: "Backend",
  database: "Database",
  infrastructure: "Infrastructure",
  security: "Security & Auth",
};

const DOMAIN_ORDER: DomainId[] = [
  "frontend",
  "backend",
  "database",
  "infrastructure",
  "security",
];

type PresetItem = {
  layer: DomainId;
  title: string;
  detail: string;
  tags: string[];
};

type Preset = {
  id: string;
  label: string;
  keywords: string[];
  items: PresetItem[];
};

/** Structured mock templates for the three most common feature asks. */
const PRESETS: Preset[] = [
  {
    id: "authentication",
    label: "authentication",
    keywords: [
      "auth",
      "login",
      "log in",
      "sign in",
      "signin",
      "signup",
      "sign up",
      "register",
      "password",
      "session",
      "oauth",
      "sso",
      "2fa",
      "mfa",
    ],
    items: [
      {
        layer: "security",
        title: "Session lifecycle and token validation",
        detail:
          "Issue, refresh, revoke and validate tokens. Expiry, rotation and 'log out everywhere' are unstated work.",
        tags: ["session", "token"],
      },
      {
        layer: "security",
        title: "Verification middleware on protected routes",
        detail:
          "Every route needs the guard, and the ordering matters: authenticated but not authorised is a common hole.",
        tags: ["middleware", "routing"],
      },
      {
        layer: "backend",
        title: "Credential handling rules",
        detail:
          "Hashing, lockout after failed attempts, and never logging the submitted password.",
        tags: ["business logic"],
      },
      {
        layer: "database",
        title: "Credential and session tables",
        detail:
          "A users table, a sessions or refresh-token table, expiry columns and an index on the lookup key.",
        tags: ["migration", "index"],
      },
      {
        layer: "frontend",
        title: "Sign-in form validation and error states",
        detail:
          "Field validation, pending state, wrong-password and locked-account messaging, plus where the token is kept.",
        tags: ["validation", "state"],
      },
    ],
  },
  {
    id: "payments",
    label: "payments",
    keywords: [
      "payment",
      "pay",
      "stripe",
      "checkout",
      "billing",
      "subscription",
      "invoice",
      "refund",
      "cart",
      "price",
      "pricing",
    ],
    items: [
      {
        layer: "security",
        title: "Webhook signature verification",
        detail:
          "Payment webhooks must be verified, deduplicated and replayed safely before anything is written.",
        tags: ["verification", "webhooks"],
      },
      {
        layer: "backend",
        title: "Idempotent charge flow with retries",
        detail:
          "A double-submitted card must not charge twice. Idempotency keys, retry with backoff, and a manual reconciliation path.",
        tags: ["business logic", "retry"],
      },
      {
        layer: "database",
        title: "Payment, refund and ledger records",
        detail:
          "Transaction records with a status column, unique constraints on idempotency keys, and a currency decision.",
        tags: ["schema", "constraints"],
      },
      {
        layer: "infrastructure",
        title: "Provider credentials per environment",
        detail:
          "Live and test keys in the secret manager, plus webhook secrets and the environment variable that selects them.",
        tags: ["credentials", "env config"],
      },
      {
        layer: "frontend",
        title: "Checkout states: pending, failed, cancelled",
        detail:
          "Payment UI is mostly edge cases. Never navigate away mid-charge; recover the session when the user returns.",
        tags: ["validation", "state"],
      },
    ],
  },
  {
    id: "roles",
    label: "roles and permissions",
    keywords: [
      "role",
      "permission",
      "admin",
      "team",
      "member",
      "access",
      "rbac",
      "authorise",
      "authorize",
      "owner",
    ],
    items: [
      {
        layer: "security",
        title: "Permission checks on every action",
        detail:
          "Hiding a button is not enforcement. The check belongs in the handler that performs the action.",
        tags: ["authorization"],
      },
      {
        layer: "database",
        title: "Role and membership relationships",
        detail:
          "Join tables, a default role for new accounts, and constraints that stop a user removing their own access.",
        tags: ["migration", "constraints"],
      },
      {
        layer: "backend",
        title: "Authorisation middleware and default policy",
        detail:
          "One place that answers 'may this actor do this?' so rules stop drifting between endpoints.",
        tags: ["middleware", "business logic"],
      },
      {
        layer: "frontend",
        title: "Conditional UI per role",
        detail:
          "Menus, buttons and routes change by role, which also means a role switch invalidates cached views.",
        tags: ["state", "validation"],
      },
    ],
  },
];

/** Keyword-triggered hidden work: one specific item per matched rule. */
const TRIGGERS: Array<{
  domain: DomainId;
  keywords: string[];
  item: { title: string; detail: string; tags: string[] };
}> = [
  {
    domain: "frontend",
    keywords: ["validation", "validate", "form", "input", "search", "filter"],
    item: {
      title: "Validation rules on both sides",
      detail:
        "Client validation is a convenience; the same rules must be enforced server-side or they are a bug.",
      tags: ["validation", "state"],
    },
  },
  {
    domain: "frontend",
    keywords: ["page", "screen", "dashboard", "panel", "modal", "list", "table", "report", "settings"],
    item: {
      title: "Extra UI surfaces and their states",
      detail:
        "Each surface needs layout, loading skeleton, empty state, error state and permission-aware rendering.",
      tags: ["state", "ui"],
    },
  },
  {
    domain: "backend",
    keywords: ["api", "endpoint", "route", "webhook", "cron", "schedule", "sync", "import", "export", "notify", "email"],
    item: {
      title: "Endpoint contract and background processing",
      detail:
        "Validation, pagination, rate limits, a documented error shape, and retries for anything asynchronous.",
      tags: ["business logic", "retry"],
    },
  },
  {
    domain: "backend",
    keywords: ["middleware", "policy", "rule", "logic"],
    item: {
      title: "Middleware placement and ordering",
      detail:
        "Where the new check runs relative to existing ones changes what it can see and what it can block.",
      tags: ["middleware"],
    },
  },
  {
    domain: "database",
    keywords: ["migration", "schema", "index", "query", "column", "table", "report", "performance", "slow"],
    item: {
      title: "Schema change, index and rollback plan",
      detail:
        "Migration plus backfill plus a tested rollback, and an index review so the new query does not degrade later.",
      tags: ["migration", "index", "constraints"],
    },
  },
  {
    domain: "security",
    keywords: ["token", "session", "auth", "password", "login", "oauth", "admin", "role", "permission", "private", "upload", "file"],
    item: {
      title: "Authorisation and secret hygiene",
      detail:
        "Ownership checks on every new action, and confirmation that no token, key or private file reaches the client.",
      tags: ["authorization", "secrets"],
    },
  },
  {
    domain: "infrastructure",
    keywords: ["stripe", "twilio", "s3", "openai", "github", "slack", "provider", "integration", "api key", "env", "environment variable", "deploy"],
    item: {
      title: "Provider credentials and environment config",
      detail:
        "Secrets in the secret manager, a documented variable per target, and behaviour when the provider is down.",
      tags: ["credentials", "env config"],
    },
  },
];

/** Near-universal costs that a request never states. */
const BASELINE_ITEMS: Record<DomainId, Array<Omit<RiskItem, "id">>> = {
  frontend: [
    {
      title: "Empty, loading and error states",
      detail:
        "Three extra states per surface. They are the last thing estimated and the first thing reviewed.",
      signal: "always",
      tags: ["state", "ui"],
      source: "baseline",
    },
    {
      title: "Client state ownership",
      detail:
        "Decide what is server state, what is URL state and what is local state before the components multiply.",
      signal: "always",
      tags: ["state"],
      source: "baseline",
    },
  ],
  backend: [
    {
      title: "Error and edge-case handling",
      detail:
        "The happy path is what gets estimated; retries, timeouts and partial failures are not.",
      signal: "always",
      tags: ["business logic"],
      source: "baseline",
    },
    {
      title: "Rollout guard or feature flag",
      detail:
        "Shipping a toggle costs far less than shipping a rollback. Requests rarely mention it.",
      signal: "always",
      tags: ["deploy"],
      source: "baseline",
    },
  ],
  database: [
    {
      title: "Migration and backfill",
      detail:
        "Schema changes need a forward migration, a backfill for existing rows and a tested rollback.",
      signal: "always",
      tags: ["migration", "constraints"],
      source: "baseline",
    },
    {
      title: "Transaction boundaries",
      detail:
        "Any write touching more than one table needs an explicit transaction and a retry story.",
      signal: "always",
      tags: ["constraints", "business logic"],
      source: "baseline",
    },
  ],
  infrastructure: [
    {
      title: "New environment variables",
      detail:
        "Every new setting needs a documented variable, a local default and a value in each deployment target.",
      signal: "always",
      tags: ["env config"],
      source: "baseline",
    },
    {
      title: "Deploy order and rollback",
      detail:
        "New code plus a migration means the deploy sequence is part of the work, not an afterthought.",
      signal: "always",
      tags: ["deploy"],
      source: "baseline",
    },
  ],
  security: [
    {
      title: "Secret handling review",
      detail:
        "Confirm no key, token or credential reaches the browser bundle or the logs.",
      signal: "always",
      tags: ["secrets"],
      source: "baseline",
    },
    {
      title: "Audit trail",
      detail:
        "Who did what, when, and from where. Cheap to add during the change, expensive to retrofit.",
      signal: "always",
      tags: ["authorization"],
      source: "baseline",
    },
  ],
};

/** At most this many trigger items per domain, so the card stays readable. */
const MAX_TRIGGER_ITEMS_PER_DOMAIN = 2;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function riskLevelFor(signalCount: number): RiskLevel {
  if (signalCount >= 4) return "HIGH";
  if (signalCount >= 2) return "MEDIUM";
  return "LOW";
}

function firstMatch(keywords: string[], text: string): string {
  return findSignal(keywords, text);
}

/**
 * Builds the mock hidden-scope analysis for a request.
 *
 * Deterministic: the same request always produces the same analysis, so the
 * demo and the tests are stable.
 */
export function analyzeFeatureRequest(request: string): RiskAnalysis {
  const text = request.toLowerCase();

  const matchedPresets = PRESETS.filter((preset) => matchesAny(preset.keywords, text)).slice(
    0,
    2,
  );

  const domains: DomainRisk[] = DOMAIN_ORDER.map((id) => {
    const items: RiskItem[] = [];
    const seen = new Set<string>();

    const push = (item: RiskItem): boolean => {
      const key = slugify(item.title);
      if (seen.has(key)) return false;
      seen.add(key);
      items.push(item);
      return true;
    };

    for (const preset of matchedPresets) {
      for (const presetItem of preset.items) {
        if (presetItem.layer !== id) continue;
        push({
          id: `preset-${preset.id}-${slugify(presetItem.title)}`,
          title: presetItem.title,
          detail: presetItem.detail,
          signal: firstMatch(preset.keywords, text),
          tags: presetItem.tags,
          source: "preset",
        });
      }
    }

    let triggerCount = 0;
    for (const trigger of TRIGGERS) {
      if (triggerCount >= MAX_TRIGGER_ITEMS_PER_DOMAIN) break;
      if (trigger.domain !== id) continue;
      const signal = firstMatch(trigger.keywords, text);
      if (!signal) continue;
      const added = push({
        id: `trigger-${slugify(trigger.item.title)}`,
        title: trigger.item.title,
        detail: trigger.item.detail,
        signal,
        tags: trigger.item.tags,
        source: "trigger",
      });
      if (added) triggerCount += 1;
    }

    for (const baseline of BASELINE_ITEMS[id]) {
      push({ ...baseline, id: `baseline-${slugify(baseline.title)}` });
    }

    return { id, name: DOMAIN_NAMES[id], items };
  });

  const baselineCount = Object.values(BASELINE_ITEMS).reduce(
    (total, items) => total + items.length,
    0,
  );
  const signalCount = domains.reduce(
    (total, domain) =>
      total +
      domain.items.filter((item) => item.source !== "baseline").length,
    0,
  );
  const totalItems = domains.reduce(
    (total, domain) => total + domain.items.length,
    0,
  );
  const riskLevel = riskLevelFor(signalCount);

  return {
    request,
    riskLevel,
    summary: buildSummary(request, riskLevel, signalCount, totalItems, baselineCount, domains),
    domains,
    totalItems,
  };
}

function buildSummary(
  request: string,
  riskLevel: RiskLevel,
  signalCount: number,
  totalItems: number,
  baselineCount: number,
  domains: DomainRisk[],
): string {
  const busiest = [...domains].sort(
    (a, b) => b.items.length - a.items.length,
  )[0];

  const signals =
    signalCount === 1
      ? "1 signal in the request"
      : `${signalCount} signals in the request`;

  return `${riskLevel} risk. ${signals} point to ${totalItems} items of work nobody asked for (${baselineCount} of them apply to any feature), and ${busiest.name.toLowerCase()} carries the most. Mock analysis for "${request}" — no AI was consulted.`;
}
