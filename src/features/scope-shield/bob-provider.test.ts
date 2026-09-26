import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildBobScopeBody,
  buildScopeSystemPrompt,
  callBobScopeApi,
  normalizeBobScopeResponse,
  BobScopeProviderError,
  type ScopeAnalysisRequest,
} from "./bob-provider.ts";
import type { RepositoryContext, StackContext } from "./stack-context.ts";

const context: RepositoryContext = {
  repositoryName: "Acme Demo Repo",
  primaryStack: ["TypeScript", "React 19", "PostgreSQL 16", "Prisma 6"],
  authArchitecture: ["JWT authentication", "Route guard middleware"],
  directories: ["/src/app", "/src/components", "/src/lib"],
  provenance: {
    source: "mock",
    analyzedAt: "2026-09-26T00:00:00Z",
    moduleCount: 5,
    note: "Static demo data.",
  },
};

const stack: StackContext = {
  languages: ["TypeScript"],
  frameworks: ["React", "Next.js", "Node.js"],
  data: ["PostgreSQL"],
  integrations: ["Stripe"],
};

const validResponse = {
  analysis: {
    riskLevel: "HIGH",
    summary: "High risk: authentication + payments.",
    domains: [
      {
        id: "security",
        name: "Security & Auth",
        items: [
          {
            id: "auth-1",
            title: "Session lifecycle and token validation",
            detail: "Issue, refresh, revoke and validate tokens.",
            signal: "auth",
            tags: ["session", "token"],
            source: "preset",
          },
          {
            id: "auth-2",
            title: "Verification middleware on protected routes",
            detail: "Every route needs the guard.",
            signal: "auth",
            tags: ["middleware"],
            source: "preset",
          },
        ],
      },
      {
        id: "database",
        name: "Database",
        items: [
          {
            id: "db-1",
            title: "Credential and session tables",
            detail: "Users table, sessions table, expiry columns.",
            signal: "auth",
            tags: ["migration", "index"],
            source: "preset",
          },
        ],
      },
    ],
    totalItems: 3,
  },
  questions: [
    {
      id: "role-scope",
      question: "Should this feature support multi-tenant role permissions?",
      why: "Multi-tenancy changes every query.",
      topic: "access",
      layer: "security",
    },
    {
      id: "session-lifetime",
      question: "Do users need to stay signed in across devices?",
      why: "Decides token lifetime.",
      topic: "session",
      layer: "security",
    },
    {
      id: "external-downtime",
      question: "How should the UI behave when Stripe is down?",
      why: "Edge cases and provider downtime.",
      topic: "failure handling",
      layer: "frontend",
    },
  ],
  stack: {
    languages: ["TypeScript"],
    frameworks: ["React", "Next.js"],
    data: ["PostgreSQL"],
    integrations: ["Stripe"],
  },
};

function makePayload(request = "Add authentication with Stripe checkout"): ScopeAnalysisRequest {
  return { request, repositoryContext: context, stackContext: stack };
}

function makeAbortError(): Error {
  const err = new Error("The operation was aborted.");
  err.name = "AbortError";
  return err;
}

function makeMockFetch(status: number, body: unknown, opts: { delay?: number } = {}): typeof fetch {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return (async (_input: RequestInfo | URL, init?: RequestInit) => {
    const signal = init?.signal;

    if (opts.delay) {
      await new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
          reject(makeAbortError());
          return;
        }

        const timer = setTimeout(() => {
          resolve();
        }, opts.delay);

        signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(makeAbortError());
          },
          { once: true },
        );
      });
    }

    return new Response(text, {
      status,
      statusText: status === 200 ? "OK" : "Error",
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
}

/* --- buildScopeSystemPrompt --- */

test("system prompt includes the repository name (FR-7 grounding)", () => {
  const prompt = buildScopeSystemPrompt(context, stack);
  assert.match(prompt, /Acme Demo Repo/);
});

test("system prompt includes the detected primary stack", () => {
  const prompt = buildScopeSystemPrompt(context, stack);
  assert.match(prompt, /TypeScript/);
  assert.match(prompt, /PostgreSQL 16/);
  assert.match(prompt, /Prisma 6/);
});

test("system prompt includes auth architecture and directories", () => {
  const prompt = buildScopeSystemPrompt(context, stack);
  assert.match(prompt, /JWT authentication/);
  assert.match(prompt, /\/src\/app/);
});

test("system prompt includes implied stack from the request", () => {
  const prompt = buildScopeSystemPrompt(context, stack);
  assert.match(prompt, /Stripe/);
});

test("system prompt instructs JSON-only output", () => {
  const prompt = buildScopeSystemPrompt(context, stack);
  assert.match(prompt, /ONLY a JSON object/i);
});

/* --- buildBobScopeBody --- */

test("buildBobScopeBody produces the expected envelope", () => {
  const body = buildBobScopeBody("Add auth", context, stack);
  assert.equal(typeof body.system_prompt, "string");
  assert.equal(body.prompt, 'Feature request: "Add auth"');
  assert.equal(body.max_tokens, 8000);
  assert.deepEqual(body.response_format, { type: "json_object" });
});

/* --- normalizeBobScopeResponse --- */

test("normalizes a valid JSON-string response", () => {
  const text = JSON.stringify(validResponse);
  const result = normalizeBobScopeResponse(text, "Add authentication with Stripe checkout");
  assert.equal(result.request, "Add authentication with Stripe checkout");
  assert.equal(result.analysis.riskLevel, "HIGH");
  assert.equal(result.analysis.domains.length, 2);
  assert.equal(result.questions.length, 3);
  assert.deepEqual(result.stack.integrations, ["Stripe"]);
});

test("normalizes a direct object response", () => {
  const result = normalizeBobScopeResponse(validResponse, "test");
  assert.equal(result.analysis.totalItems, 3);
  assert.equal(result.analysis.domains[0].items.length, 2);
});

test("normalizes a JSON response wrapped in a markdown fence", () => {
  const text = "```json\n" + JSON.stringify(validResponse) + "\n```";
  const result = normalizeBobScopeResponse(text, "test");
  assert.equal(result.questions.length, 3);
});

test("normalizes a response wrapped in an envelope key", () => {
  const text = JSON.stringify({ data: JSON.stringify(validResponse) });
  const result = normalizeBobScopeResponse(text, "test");
  assert.equal(result.analysis.riskLevel, "HIGH");
});

test("normalizes an OpenAI-style choices response", () => {
  const text = JSON.stringify({
    choices: [
      { message: { content: JSON.stringify(validResponse) } },
    ],
  });
  const result = normalizeBobScopeResponse(text, "test");
  assert.equal(result.questions.length, 3);
  assert.equal(result.stack.integrations[0], "Stripe");
});

test("throws on empty JSON object", () => {
  assert.throws(() => normalizeBobScopeResponse("{}", "test"), BobScopeProviderError);
});

test("throws on non-JSON text", () => {
  assert.throws(
    () => normalizeBobScopeResponse("I could not read the repository.", "test"),
    BobScopeProviderError,
  );
});

test("throws when analysis has no domains", () => {
  const bad = JSON.stringify({
    analysis: { riskLevel: "LOW", summary: "x", domains: [], totalItems: 0 },
    questions: [{ id: "q1", question: "?", why: "?", topic: "scope", layer: null }],
    stack: { languages: [], frameworks: [], data: [], integrations: [] },
  });
  assert.throws(() => normalizeBobScopeResponse(bad, "test"), BobScopeProviderError);
});

test("throws when questions are missing", () => {
  const bad = JSON.stringify({
    analysis: {
      riskLevel: "HIGH",
      summary: "x",
      domains: [
        { id: "frontend", name: "Frontend", items: [{ id: "f1", title: "T", detail: "D", signal: "always", tags: [], source: "baseline" }] },
      ],
      totalItems: 1,
    },
    questions: [],
    stack: { languages: [], frameworks: [], data: [], integrations: [] },
  });
  assert.throws(() => normalizeBobScopeResponse(bad, "test"), BobScopeProviderError);
});

test("coerces string totalItems to number and computes from domains", () => {
  const result = normalizeBobScopeResponse(validResponse, "test");
  assert.equal(typeof result.analysis.totalItems, "number");
  assert.equal(result.analysis.totalItems, 3);
});

test("defaults riskLevel to LOW when missing", () => {
  const patched = structuredClone(validResponse);
  delete (patched.analysis as { riskLevel?: unknown }).riskLevel;
  const result = normalizeBobScopeResponse(JSON.stringify(patched), "test");
  assert.equal(result.analysis.riskLevel, "LOW");
});

test("preserves the source tag on risk items", () => {
  const result = normalizeBobScopeResponse(validResponse, "test");
  assert.equal(result.analysis.domains[0].items[0].source, "preset");
});

/* --- callBobScopeApi --- */

test("calls the endpoint with auth header and body", async () => {
  let capturedInit: RequestInit | undefined;
  const mockFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedInit = init;
    return new Response(JSON.stringify(validResponse), {
      status: 200,
      statusText: "OK",
      headers: { "Content-Type": "application/json", "x-bob-task-id": "task_123" },
    });
  }) as typeof fetch;

  const result = await callBobScopeApi(makePayload(), {
    endpoint: "https://api.bob.example/v2/analyze",
    apiKey: "test-key",
    timeoutMs: 5000,
    fetchImpl: mockFetch,
  });

  assert.equal(result.request, "Add authentication with Stripe checkout");
  assert.equal(result.analysis.riskLevel, "HIGH");
  assert.equal(result.questions.length, 3);
  assert.equal(result.trace.taskId, "task_123");
  assert.equal(result.trace.model, null);

  assert.ok(capturedInit);
  assert.equal(capturedInit!.method, "POST");
  const headers = capturedInit!.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer test-key");
  assert.equal(headers["Content-Type"], "application/json");
  assert.ok(capturedInit!.body);
});

test("throws BobScopeProviderError on non-200 response", async () => {
  const mockFetch = makeMockFetch(500, {
    success: false,
    error: { code: "PROVIDER_FAILED", message: "Bad API key" },
  });

  await assert.rejects(
    callBobScopeApi(
      makePayload(),
      { endpoint: "https://api.bob.example", apiKey: "bad", timeoutMs: 5000, fetchImpl: mockFetch },
    ),
    BobScopeProviderError,
  );
});

test("throws BobScopeProviderError on timeout", async () => {
  const mockFetch = makeMockFetch(200, validResponse, { delay: 500 });

  await assert.rejects(
    callBobScopeApi(
      makePayload(),
      { endpoint: "https://api.bob.example", apiKey: "key", timeoutMs: 50, fetchImpl: mockFetch },
    ),
    BobScopeProviderError,
  );
});

test("throws BobScopeProviderError on network failure", async () => {
  const mockFetch = (async () => {
    throw new TypeError("ECONNREFUSED");
  }) as typeof fetch;

  await assert.rejects(
    callBobScopeApi(
      makePayload(),
      { endpoint: "https://api.bob.example", apiKey: "key", timeoutMs: 5000, fetchImpl: mockFetch },
    ),
    BobScopeProviderError,
  );
});

test("throws when endpoint is missing", async () => {
  await assert.rejects(
    callBobScopeApi(makePayload(), {
      endpoint: "", apiKey: "key", timeoutMs: 5000,
    }),
    BobScopeProviderError,
  );
});

test("throws when apiKey is missing", async () => {
  await assert.rejects(
    callBobScopeApi(makePayload(), {
      endpoint: "https://api.bob.example", apiKey: "", timeoutMs: 5000,
    }),
    BobScopeProviderError,
  );
});

test("handles a raw JSON-string response body", async () => {
  const mockFetch = makeMockFetch(200, JSON.stringify(validResponse));

  const result = await callBobScopeApi(makePayload(), {
    endpoint: "https://api.bob.example",
    apiKey: "key",
    timeoutMs: 5000,
    fetchImpl: mockFetch,
  });

  assert.equal(result.analysis.riskLevel, "HIGH");
  assert.equal(result.questions.length, 3);
});
