import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDraftedReply } from "./drafted-reply.ts";
import { generateClarifyingQuestions } from "./clarifying-questions.ts";
import { analyzeFeatureRequest } from "./risk-analysis.ts";
import {
  detectStackContext,
  formatGroundingNote,
  getRepositoryContext,
} from "./stack-context.ts";

test("repository context exposes the four architectural layers", () => {
  const context = getRepositoryContext();
  assert.equal(typeof context.repositoryName, "string");
  assert.ok(context.primaryStack.length >= 3);
  assert.ok(context.authArchitecture.length >= 2);
  assert.ok(context.directories.length >= 3);
  assert.ok(context.directories.every((path) => path.startsWith("/")));
});

test("repository context declares that it is mock data", () => {
  const { provenance } = getRepositoryContext();
  assert.match(provenance.note, /no AI was consulted/);
  assert.match(provenance.source, /mock/);
});

test("grounding note names the repository, the stack and the request extras", () => {
  const note = formatGroundingNote(
    getRepositoryContext(),
    detectStackContext("Add payments with Stripe"),
  );
  assert.match(note, /^Grounded in Repo Analysis — RepoMap Demo Repository/);
  assert.ok(note.includes("React 19"));
  assert.ok(note.includes("Stripe"));
});

test("grounding note omits extras when the request implies none", () => {
  const note = formatGroundingNote(
    getRepositoryContext(),
    detectStackContext("Make it better"),
  );
  assert.ok(!note.includes("plus"));
});

test("the drafted reply carries the grounding line", () => {
  const request = "Add authentication";
  const stack = detectStackContext(request);
  const grounding = formatGroundingNote(getRepositoryContext(), stack);
  const draft = buildDraftedReply({
    request,
    stack,
    grounding,
    analysis: analyzeFeatureRequest(request),
    questions: generateClarifyingQuestions(request),
  });
  assert.ok(draft.includes(grounding));
});
