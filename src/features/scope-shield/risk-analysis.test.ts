import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeFeatureRequest } from "./risk-analysis.ts";

test("always reports one card per technical domain", () => {
  const analysis = analyzeFeatureRequest("Add a settings page");
  assert.deepEqual(
    analysis.domains.map((domain) => domain.id),
    ["backend", "database", "frontend", "infrastructure", "security"],
  );
});

test("is deterministic and low risk for a vague request", () => {
  const first = analyzeFeatureRequest("Add a settings page");
  const second = analyzeFeatureRequest("Add a settings page");
  assert.deepEqual(first, second);
  assert.equal(first.riskLevel, "LOW");
});

test("an authentication request pulls in the verification work", () => {
  const analysis = analyzeFeatureRequest("Add authentication to the project");

  const security = analysis.domains.find((domain) => domain.id === "security");
  assert.ok(security);
  assert.ok(
    security.items.some((item) =>
      item.title.includes("Verification and token middleware"),
    ),
  );
  assert.ok(security.items.some((item) => item.signal === "auth"));
});

test("a request that touches many layers is high risk", () => {
  const analysis = analyzeFeatureRequest(
    "Add authentication with Stripe checkout, user roles and a webhook",
  );
  assert.equal(analysis.riskLevel, "HIGH");
});

test("provider keywords surface infrastructure credentials work", () => {
  const analysis = analyzeFeatureRequest("Send receipts through Twilio by webhook");
  const infrastructure = analysis.domains.find(
    (domain) => domain.id === "infrastructure",
  );
  assert.ok(infrastructure);
  assert.ok(
    infrastructure.items.some((item) =>
      item.title.includes("Provider credentials and config"),
    ),
  );
});

test("every domain keeps its baseline items", () => {
  const analysis = analyzeFeatureRequest("Add authentication with Stripe checkout");
  for (const domain of analysis.domains) {
    assert.ok(domain.items.length >= 2, `${domain.id} lost its baseline items`);
  }
});

test("summary names the request and states that no AI was used", () => {
  const analysis = analyzeFeatureRequest("Add authentication to the project");
  assert.match(analysis.summary, /no AI was consulted/);
  assert.match(analysis.summary, /Add authentication to the project/);
});
