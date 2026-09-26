import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeFeatureRequest } from "./risk-analysis.ts";
import type { DomainId, RiskAnalysis } from "./risk-analysis.ts";

function domain(analysis: RiskAnalysis, id: DomainId) {
  const found = analysis.domains.find((entry) => entry.id === id);
  assert.ok(found, `expected a ${id} domain`);
  return found;
}

function hasItem(analysis: RiskAnalysis, id: DomainId, titlePart: string) {
  return domain(analysis, id).items.some((item) =>
    item.title.includes(titlePart),
  );
}

test("reports one card per architectural layer", () => {
  const analysis = analyzeFeatureRequest("Add a settings page");
  assert.deepEqual(
    analysis.domains.map((entry) => entry.id),
    ["frontend", "backend", "database", "infrastructure", "security"],
  );
});

test("is deterministic and low risk for a vague request", () => {
  const first = analyzeFeatureRequest("Add a settings page");
  const second = analyzeFeatureRequest("Add a settings page");
  assert.deepEqual(first, second);
  assert.equal(first.riskLevel, "LOW");
});

test("every layer keeps its unspoken baseline items", () => {
  const analysis = analyzeFeatureRequest(
    "Add authentication with Stripe checkout",
  );
  for (const entry of analysis.domains) {
    assert.ok(
      entry.items.length >= 2,
      `${entry.id} lost its baseline items`,
    );
  }
  assert.equal(
    analysis.totalItems,
    analysis.domains.reduce((total, entry) => total + entry.items.length, 0),
  );
});

test("'Add authentication' returns the authentication pattern", () => {
  const analysis = analyzeFeatureRequest("Add authentication");
  assert.ok(hasItem(analysis, "security", "Session lifecycle and token validation"));
  assert.ok(hasItem(analysis, "security", "Verification middleware"));
  assert.ok(hasItem(analysis, "backend", "Credential handling rules"));
  assert.ok(hasItem(analysis, "database", "Credential and session tables"));
  assert.ok(hasItem(analysis, "frontend", "Sign-in form validation"));
  assert.notEqual(analysis.riskLevel, "LOW");
});

test("'Add payments' returns the payments pattern", () => {
  const analysis = analyzeFeatureRequest("Add payments");
  assert.ok(hasItem(analysis, "security", "Webhook signature verification"));
  assert.ok(hasItem(analysis, "backend", "Idempotent charge flow"));
  assert.ok(hasItem(analysis, "database", "refund and ledger records"));
  assert.ok(hasItem(analysis, "infrastructure", "Provider credentials"));
  assert.ok(hasItem(analysis, "frontend", "Checkout states"));
});

test("'Create user roles' returns the roles pattern", () => {
  const analysis = analyzeFeatureRequest("Create user roles");
  assert.ok(hasItem(analysis, "security", "Permission checks on every action"));
  assert.ok(hasItem(analysis, "database", "Role and membership relationships"));
  assert.ok(hasItem(analysis, "backend", "Authorisation middleware and default policy"));
  assert.ok(hasItem(analysis, "frontend", "Conditional UI per role"));
});

test("preset items are tagged with their source and concerns", () => {
  const analysis = analyzeFeatureRequest("Add authentication");
  const item = domain(analysis, "security").items.find(
    (entry) => entry.source === "preset",
  );
  assert.ok(item);
  assert.ok(item.tags.includes("session"));
  assert.equal(item.signal, "auth");
});

test("no duplicate item titles inside a layer", () => {
  const analysis = analyzeFeatureRequest(
    "Add authentication with Stripe checkout, user roles and a webhook",
  );
  for (const entry of analysis.domains) {
    const titles = entry.items.map((item) => item.title);
    assert.equal(new Set(titles).size, titles.length, `${entry.id} has duplicates`);
  }
});

test("a request touching many layers is high risk", () => {
  const analysis = analyzeFeatureRequest(
    "Add authentication with Stripe checkout, user roles and a webhook",
  );
  assert.equal(analysis.riskLevel, "HIGH");
});

test("summary names the request, counts the items and states no AI was used", () => {
  const analysis = analyzeFeatureRequest("Add authentication to the project");
  assert.match(analysis.summary, /no AI was consulted/);
  assert.match(analysis.summary, /Add authentication to the project/);
  assert.match(analysis.summary, new RegExp(`${analysis.totalItems} items`));
});
