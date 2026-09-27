// Relative imports, not `@/`: the Next alias is not resolvable by `node --test`,
// and this mapper is the piece that has to be provably free of invented data.
import { toRepositoryContext } from "../../features/scope-shield/stack-context.ts";
import type { ClarifyingQuestion } from "../../features/scope-shield/clarifying-questions.ts";
import { DOMAIN_NAMES } from "../../features/scope-shield/risk-analysis.ts";
import type {
  DomainId,
  DomainRisk,
  RiskAnalysis,
  RiskItem,
  RiskLevel,
} from "../../features/scope-shield/risk-analysis.ts";
import { SCOPE_LAYER_TO_DOMAIN_ID } from "../../features/scope-shield/provider-schema.ts";
import type { ScopeProviderAnalysis } from "../../features/scope-shield/provider-schema.ts";
import type { RepoMap } from "../../features/repomap/schema.ts";
import type { ScopeAnalysisResult } from "../../features/scope-shield/analysis-runner.ts";

/**
 * Bob's ScopeShield contract becomes the result the existing UI already renders.
 * The mirror of `features/repomap/normalize.ts`: one pure translation, no I/O,
 * and nothing invented. A layer Bob did not mention produces an empty group
 * rather than filler, and every string the UI shows comes from Bob or from the
 * real RepoMap.
 */

/** Every UI DomainId, in the order the mock used, so the cards keep their order. */
const DOMAIN_ORDER: DomainId[] = [
  "frontend",
  "backend",
  "database",
  "infrastructure",
  "security",
];

const RISK_LEVELS: Record<ScopeProviderAnalysis["risk"]["level"], RiskLevel> = {
  low: "LOW",
  medium: "MEDIUM",
  high: "HIGH",
};

export function toScopeAnalysisResult(
  request: string,
  scope: ScopeProviderAnalysis,
  repoMap: RepoMap | null,
): Omit<ScopeAnalysisResult, "provider" | "bobTaskId"> {
  const byDomain = new Map<DomainId, RiskItem[]>();
  for (const domain of DOMAIN_ORDER) byDomain.set(domain, []);

  for (const [index, item] of scope.hiddenScope.entries()) {
    const domain = SCOPE_LAYER_TO_DOMAIN_ID[item.layer];
    byDomain.get(domain)?.push({
      id: `bob-${domain}-${index}-${slug(item.title)}`,
      title: item.title,
      detail: item.detail,
      signal: "",
      tags: item.tags,
      // Every item came from one Bob run, so "baseline" is the honest label: it
      // is work the request did not spell out.
      source: "baseline",
    });
  }

  const domains: DomainRisk[] = DOMAIN_ORDER.map((id) => ({
    id,
    name: DOMAIN_NAMES[id],
    items: byDomain.get(id) ?? [],
  }));

  const questions: ClarifyingQuestion[] = scope.clarifyingQuestions.map((question, index) => ({
    id: `bob-question-${index}-${slug(question.question)}`,
    question: question.question,
    why: question.reason,
    topic: DOMAIN_NAMES[SCOPE_LAYER_TO_DOMAIN_ID[question.category]],
    layer: SCOPE_LAYER_TO_DOMAIN_ID[question.category],
  }));

  const analysis: RiskAnalysis = {
    request,
    riskLevel: RISK_LEVELS[scope.risk.level],
    summary: scope.risk.summary,
    domains,
    totalItems: domains.reduce((total, domain) => total + domain.items.length, 0),
  };

  return {
    request,
    analysis,
    questions,
    stack: scope.stack,
    // The schema requires a non-empty grounding, so Bob's own line is used
    // as-is; nothing here paraphrases it.
    grounding: scope.grounding,
    draft: scope.draftedReply,
    context: toRepositoryContext(repoMap),
  };
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
