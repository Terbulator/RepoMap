import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatQuestions,
  generateClarifyingQuestions,
} from "./clarifying-questions.ts";

const ids = (request: string) =>
  generateClarifyingQuestions(request).map((question) => question.id);

test("returns three to four questions for any request", () => {
  for (const request of [
    "Add authentication",
    "Add payments",
    "Create user roles",
    "Make the dashboard nicer",
  ]) {
    const questions = generateClarifyingQuestions(request);
    assert.ok(questions.length >= 3, `${request} got ${questions.length}`);
    assert.ok(questions.length <= 4, `${request} got ${questions.length}`);
  }
});

test("is deterministic", () => {
  assert.deepEqual(
    generateClarifyingQuestions("Add authentication"),
    generateClarifyingQuestions("Add authentication"),
  );
});

test("an authentication request asks about roles and rate limits", () => {
  const found = ids("Add authentication to the project");
  assert.ok(found.includes("role-scope"));
  assert.ok(found.includes("session-lifetime"));
});

test("a payments request asks about reconciliation and downtime", () => {
  const found = ids("Add payments with Stripe checkout");
  assert.ok(found.includes("payment-reconciliation"));
  assert.ok(found.includes("external-downtime"));
});

test("a roles request asks about multi-tenancy and data migration", () => {
  const found = ids("Create user roles for the team");
  assert.ok(found.includes("role-scope"));
  assert.ok(found.includes("data-migration"));
});

test("questions are never repeated and carry a reason", () => {
  const questions = generateClarifyingQuestions("Add authentication and roles");
  const unique = new Set(questions.map((question) => question.id));
  assert.equal(unique.size, questions.length);
  for (const question of questions) {
    assert.ok(question.question.length > 10);
    assert.ok(question.why.length > 10);
  }
});

test("a vague request still gets the always-applicable questions", () => {
  const found = ids("Make it better");
  assert.ok(found.includes("scope-boundary"));
  assert.ok(found.includes("acceptance-criterion"));
});

test("formatQuestions produces a numbered, copyable block", () => {
  const text = formatQuestions(generateClarifyingQuestions("Add payments"));
  const lines = text.split("\n");
  assert.match(lines[0], /^1\. /);
  assert.match(text, /Why: /);
});
