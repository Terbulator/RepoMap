/**
 * Single place where the product surface is declared.
 *
 * Status is intentionally explicit: nothing in this table is implemented yet.
 * Tier references point at sections of docs/RepoMap-PRD.txt.
 */
export type ModuleStatus = "not-implemented";

export type ProductModule = {
  id: string;
  name: string;
  prdSection: string;
  tier: 1 | 2 | 3;
  summary: string;
  status: ModuleStatus;
};

export const productModules: ProductModule[] = [
  {
    id: "onboarding-map",
    name: "Onboarding Map",
    prdSection: "5.1",
    tier: 1,
    summary:
      "Plain-English repo summary, module breakdown, first files to read, and a visual diagram of relationships.",
    status: "not-implemented",
  },
  {
    id: "scope-shield",
    name: "ScopeShield",
    prdSection: "5.2",
    tier: 1,
    summary:
      "Turns a free-text feature request into risk analysis, clarifying questions, and a drafted reply.",
    status: "not-implemented",
  },
  {
    id: "debug-overlay",
    name: "Debug & Code Review Overlay",
    prdSection: "5.3",
    tier: 2,
    summary:
      "Flags a seeded bug and a seeded over-engineered location on the map, each with a one-line rationale.",
    status: "not-implemented",
  },
  {
    id: "release-readiness",
    name: "Release Readiness Check",
    prdSection: "5.4",
    tier: 2,
    summary:
      "Bob's reasoned verdict on a diff or branch, with reasons and an approximation of blast radius.",
    status: "not-implemented",
  },
  {
    id: "application-maintenance",
    name: "Application Maintenance",
    prdSection: "5.5",
    tier: 3,
    summary:
      "Roadmap only: proactive scanning, prioritized fix plan, and an approve-implement-verify loop. Not built.",
    status: "not-implemented",
  },
];
