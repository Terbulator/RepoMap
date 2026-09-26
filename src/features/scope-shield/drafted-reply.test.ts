import assert from "node:assert/strict";
import { test } from "node:test";
import { generateClarifyingQuestions } from "./clarifying-questions.ts";
import { buildDraftedReply } from "./drafted-reply.ts";
import { analyzeFeatureRequest } from "./risk-analysis.ts";
import { detectStackContext, formatStack } from "./stack-context.ts";

const request = "Add authentication with Stripe checkout";

function draftFor(text: string) {
  const analysis = analyzeFeatureRequest(text);
  const questions = generateClarifyingQuestions(text);
  return buildDraftedReply({
    request: text,
    stack: detectStackContext(text),
    analysis,
    questions,
  });
}

test("stack context starts from the base project profile", () => {
  const stack = detectStackContext("Make it better");
  assert.deepEqual(stack.languages, ["TypeScript"]);
  assert.deepEqual(stack.frameworks, ["React", "Next.js", "Node.js"]);
  assert.deepEqual(stack.integrations, []);
});

test("stack context adds what the request implies", () => {
  const stack = detectStackContext(request);
  assert.ok(stack.integrations.includes("Stripe"));
  assert.match(formatStack(stack), /PostgreSQL/);
  assert.equal(formatStack(stack).includes("TypeScript, React"), true);
});

test("stack context is deterministic and has no duplicates", () => {
  const first = detectStackContext(request);
  const second = detectStackContext(request);
  assert.deepEqual(first, second);
  for (const group of Object.values(first)) {
    assert.equal(new Set(group).size, group.length);
  }
});

test("draft echoes the request, the stack and the risk level", () => {
  const draft = draftFor(request);
  assert.match(draft, /^Subject: Scope clarification needed: /);
  assert.ok(draft.includes(request));
  assert.ok(draft.includes("TypeScript, React, Next.js, Node.js, PostgreSQL, Stripe"));
  assert.match(draft, /high-risk/);
});

test("draft lists every clarifying question, numbered", () => {
  const draft = draftFor(request);
  const questions = generateClarifyingQuestions(request);
  questions.forEach((question, index) => {
    assert.ok(draft.includes(`${index + 1}. ${question.question}`));
  });
});

test("draft names the hidden scope that was detected", () => {
  const draft = draftFor(request);
  assert.match(draft, /not in the request yet/);
  assert.ok(draft.includes("Security & Auth:"));
});

test("draft ends with the sign-off", () => {
  const draft = draftFor("Add authentication");
  assert.ok(draft.trimEnd().endsWith("Engineering Team"));
  assert.ok(draft.includes("Best regards,"));
});
