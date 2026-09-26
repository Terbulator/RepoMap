/**
 * Stage 2 of ScopeShield (PRD 5.2): hidden-scope risk analysis.
 *
 * IMPORTANT: this is a MOCK generator. It maps keywords in the request onto
 * structured risk templates so the Stage 2 UI can be built and demoed before
 * any IBM Bob 2.0 call exists. Stage 3 replaces `analyzeFeatureRequest` with the
 * real provider; the returned shape is what that call must produce.
 */

export type RiskLevel = "HIGH" | "MEDIUM" | "LOW";

export type DomainId =
  | "backend"
  | "database"
  | "frontend"
  | "infrastructure"
  | "security";

export type RiskItem = {
  /** Stable id so React keys stay predictable. */
  id: string;
  /** Short name of the piece of work. */
  title: string;
  /** Why it is easy to miss in the original request. */
  detail: string;
  /** The word in the request that pulled this item in. */
  signal: string;
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
};

/** Shown for every request, because these costs are near-universal. */
const BASELINE_ITEMS: Record<DomainId, Array<Omit<RiskItem, "id">>> = {
  backend: [
    {
      title: "Error and edge-case handling",
      detail:
        "The happy path is what gets estimated; retries, timeouts and partial failures are not.",
      signal: "always",
    },
    {
      title: "Feature flag or rollout guard",
      detail:
        "Shipping a toggle costs far less than shipping a rollback. Requests rarely mention it.",
      signal: "always",
    },
  ],
  database: [
    {
      title: "Migration and backfill",
      detail:
        "Schema changes need a forward migration, a backfill for existing rows and a tested rollback.",
      signal: "always",
    },
    {
      title: "Transaction boundaries",
      detail:
        "Any write that touches more than one table needs an explicit transaction and a retry story.",
      signal: "always",
    },
  ],
  frontend: [
    {
      title: "Empty, loading and error states",
      detail:
        "Three extra UI states per surface. They are usually the last thing budgeted and the first thing reviewed.",
      signal: "always",
    },
    {
      title: "Client state ownership",
      detail:
        "Decide what is server state, what is URL state and what is local state before the components multiply.",
      signal: "always",
    },
  ],
  infrastructure: [
    {
      title: "New environment variables",
      detail:
        "Every new setting needs a documented variable, a local default and a value in each deployment target.",
      signal: "always",
    },
    {
      title: "Deploy and rollback path",
      detail:
        "A migration plus new code means the deploy order is part of the work, not an afterthought.",
      signal: "always",
    },
  ],
  security: [
    {
      title: "Secret handling review",
      detail:
        "Confirm no key, token or credential reaches the browser bundle or the logs.",
      signal: "always",
    },
    {
      title: "Authorisation checks",
      detail:
        "Authentication is not authorisation: every new route or action needs an ownership check.",
      signal: "always",
    },
  ],
};

/** Keyword-triggered hidden work. */
const TRIGGERS: Array<{
  domain: DomainId;
  keywords: string[];
  item: Omit<RiskItem, "id" | "signal">;
}> = [
  {
    domain: "security",
    keywords: ["auth", "authenticate", "authentication", "login", "sign in", "signup", "register", "password", "session", "oauth"],
    item: {
      title: "Verification and token middleware",
      detail:
        "Credential verification, token issuance and refresh, plus middleware on every protected route.",
    },
  },
  {
    domain: "database",
    keywords: ["user", "account", "profile", "team", "organisation", "organization", "member", "role", "permission"],
    item: {
      title: "Ownership and relationship records",
      detail:
        "New entities imply join tables, foreign keys and a decision about who owns each row.",
    },
  },
  {
    domain: "backend",
    keywords: ["webhook", "callback", "notify", "notification", "email", "sync", "import", "export", "cron", "schedule"],
    item: {
      title: "Async processing and retries",
      detail:
        "Background jobs, idempotency keys, retry with backoff and a dead-letter path.",
    },
  },
  {
    domain: "backend",
    keywords: ["api", "endpoint", "route", "search", "filter", "report", "upload", "file", "payment", "checkout"],
    item: {
      title: "Endpoint surface and rate limits",
      detail:
        "Request validation, pagination, rate limiting and a documented error contract per endpoint.",
    },
  },
  {
    domain: "frontend",
    keywords: ["dashboard", "page", "screen", "form", "settings", "list", "table", "chart", "status", "upload"],
    item: {
      title: "New surfaces and status components",
      detail:
        "Each page or panel brings layout, loading skeleton, error state and its own state handling.",
    },
  },
  {
    domain: "infrastructure",
    keywords: ["stripe", "twilio", "s3", "openai", "github", "slack", "provider", "integration", "third party", "api key"],
    item: {
      title: "Provider credentials and config",
      detail:
        "Secrets in the secret manager, an environment variable per target, and a documented fallback when the provider is down.",
    },
  },
  {
    domain: "security",
    keywords: ["payment", "checkout", "role", "admin", "private", "permission", "token"],
    item: {
      title: "Abuse and access review",
      detail:
        "Anything touching money or privileges needs rate limits, an audit trail and a manual override story.",
    },
  },
];

const DOMAIN_NAMES: Record<DomainId, string> = {
  backend: "Backend",
  database: "Database",
  frontend: "Frontend",
  infrastructure: "Infrastructure",
  security: "Security",
};

const DOMAIN_ORDER: DomainId[] = [
  "backend",
  "database",
  "frontend",
  "infrastructure",
  "security",
];

/** At most this many triggered items per domain, so the card stays readable. */
const MAX_TRIGGERED_ITEMS_PER_DOMAIN = 3;

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function riskLevelFor(triggerCount: number): RiskLevel {
  if (triggerCount >= 4) return "HIGH";
  if (triggerCount >= 2) return "MEDIUM";
  return "LOW";
}

/**
 * Builds the mock risk analysis for a request.
 *
 * Deterministic: the same request always produces the same analysis, so the
 * demo and the tests are stable.
 */
export function analyzeFeatureRequest(request: string): RiskAnalysis {
  const text = request.toLowerCase();

  const domains: DomainRisk[] = DOMAIN_ORDER.map((id) => {
    const triggered = TRIGGERS.filter(
      (trigger) => trigger.domain === id && trigger.keywords.some((keyword) => text.includes(keyword)),
    ).slice(0, MAX_TRIGGERED_ITEMS_PER_DOMAIN);

    const triggeredItems: RiskItem[] = triggered.map((trigger) => {
      const signal =
        trigger.keywords.find((keyword) => text.includes(keyword)) ?? "";

      return {
        id: `${id}-${slugify(trigger.item.title)}`,
        title: trigger.item.title,
        detail: trigger.item.detail,
        signal,
      };
    });

    const baselineItems: RiskItem[] = BASELINE_ITEMS[id].map((item) => ({
      ...item,
      id: `${id}-${slugify(item.title)}`,
    }));

    return {
      id,
      name: DOMAIN_NAMES[id],
      items: [...triggeredItems, ...baselineItems],
    };
  });

  const triggerCount = domains.reduce(
    (total, domain) => total + (domain.items.length - BASELINE_ITEMS[domain.id].length),
    0,
  );
  const riskLevel = riskLevelFor(triggerCount);

  return {
    request,
    riskLevel,
    summary: buildSummary(request, riskLevel, triggerCount, domains),
    domains,
  };
}

function buildSummary(
  request: string,
  riskLevel: RiskLevel,
  triggerCount: number,
  domains: DomainRisk[],
): string {
  const busiest = [...domains].sort(
    (a, b) => b.items.length - a.items.length,
  )[0];

  const signalCount =
    triggerCount === 1 ? "1 signal in the request" : `${triggerCount} signals in the request`;

  return `${riskLevel} risk. ${signalCount} point${triggerCount === 1 ? "" : "s"} to hidden work, and ${busiest.name.toLowerCase()} carries the most of it. Mock analysis for "${request}" — no AI was consulted.`;
}
