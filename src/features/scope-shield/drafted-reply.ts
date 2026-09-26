/**
 * Stage 4 of ScopeShield (PRD 5.2, FR-6/FR-7): the drafted professional reply.
 *
 * MOCK composer. It stitches together the outputs of the earlier stages — the
 * request, the mock stack context, the risk analysis and the clarifying
 * questions — into a message a developer can send as-is. A real provider will
 * rewrite the wording, but the inputs and the shape stay the same.
 */

import type { ClarifyingQuestion } from "./clarifying-questions.ts";
import type { RiskAnalysis } from "./risk-analysis.ts";
import type { StackContext } from "./stack-context.ts";
import { formatStack } from "./stack-context.ts";

export type DraftedReplyInput = {
  request: string;
  stack: StackContext;
  analysis: RiskAnalysis;
  questions: ClarifyingQuestion[];
};

/** How many hidden-scope items the draft names before it asks its questions. */
const MAX_CALLED_OUT_ITEMS = 4;

/** How many items from a single layer, so one layer cannot fill the list. */
const MAX_CALLED_OUT_PER_LAYER = 2;

function subjectFor(request: string): string {
  const trimmed =
    request.length > 60 ? `${request.slice(0, 57).trimEnd()}…` : request;
  return `Scope clarification needed: ${trimmed}`;
}

function calledOutItems(analysis: RiskAnalysis): string[] {
  // Busiest layers first, so the draft leads with what the request actually hit.
  const ranked = analysis.domains
    .map((domain, index) => ({
      domain,
      index,
      detected: domain.items.filter((item) => item.source !== "baseline"),
    }))
    .sort((a, b) => b.detected.length - a.detected.length || a.index - b.index);

  const lines: string[] = [];

  for (const entry of ranked) {
    for (const item of entry.detected.slice(0, MAX_CALLED_OUT_PER_LAYER)) {
      lines.push(`- ${entry.domain.name}: ${item.title}`);
      if (lines.length >= MAX_CALLED_OUT_ITEMS) return lines;
    }
  }

  return lines;
}

/** Builds the full draft: subject line, greeting, grounding, questions, sign-off. */
export function buildDraftedReply({
  request,
  stack,
  analysis,
  questions,
}: DraftedReplyInput): string {
  const stackLine = formatStack(stack);
  const items = calledOutItems(analysis);

  const lines: string[] = [];

  lines.push(`Subject: ${subjectFor(request)}`);
  lines.push("");
  lines.push("Hi team,");
  lines.push("");
  lines.push(`Thanks for submitting the feature request: "${request}".`);
  lines.push("");
  lines.push(
    `Before we begin implementation, we reviewed the request against our current codebase architecture (${stackLine}). To prevent scope creep and keep the change stable inside the existing system, we need to clarify a few points first.`,
  );

  if (items.length > 0) {
    lines.push("");
    lines.push(
      `Our read is that this is ${analysis.riskLevel.toLowerCase()}-risk work. These parts are not in the request yet but are usually needed:`,
    );
    lines.push(...items);
  }

  lines.push("");
  lines.push("Could you confirm the following?");
  lines.push("");
  questions.forEach((question, index) => {
    lines.push(`${index + 1}. ${question.question}`);
  });

  lines.push("");
  lines.push(
    "Once these requirements are confirmed, we can provide an accurate timeline and proceed with development.",
  );
  lines.push("");
  lines.push("Best regards,");
  lines.push("Engineering Team");

  return lines.join("\n");
}
