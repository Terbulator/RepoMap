"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import {
  EMPTY_REQUEST_MESSAGE,
  STORED_REQUEST_MESSAGE,
  isEmptyFeatureRequest,
  saveFeatureRequest,
} from "@/features/scope-shield/feature-request";

/**
 * Stage 1 of ScopeShield (PRD 5.2): capture the free-text feature request.
 *
 * The request is normalised, stored in localStorage under "featureRequest" and
 * echoed back for confirmation. No analysis happens here yet.
 */
export function ScopeShield() {
  const [text, setText] = useState("");
  const [submittedRequest, setSubmittedRequest] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [message, setMessage] = useState("");

  const isEmpty = isEmptyFeatureRequest(text);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isEmptyFeatureRequest(text)) {
      setIsSubmitted(false);
      setSubmittedRequest("");
      setMessage(EMPTY_REQUEST_MESSAGE);
      return;
    }

    const request = saveFeatureRequest(text);
    console.log("ScopeShield feature request:", request);

    setSubmittedRequest(request);
    setIsSubmitted(true);
    setMessage(STORED_REQUEST_MESSAGE);
  }

  return (
    <section aria-label="ScopeShield feature request" className="max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">ScopeShield</h1>

      <form onSubmit={handleSubmit} className="mt-6">
        <label htmlFor="feature-request" className="block text-sm font-medium">
          Describe the feature you want to build:
        </label>
        <textarea
          id="feature-request"
          name="featureRequest"
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={8}
          placeholder="e.g., Add authentication to the project"
          aria-describedby="feature-request-status"
          className="mt-3 w-full rounded-md border border-neutral-300 bg-transparent px-4 py-3 text-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-700 dark:focus:ring-white"
        />

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={isEmpty}
            className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Analyze Scope
          </button>
          {message && !isSubmitted ? (
            <p
              id="feature-request-status"
              role="status"
              className="text-sm text-red-600 dark:text-red-400"
            >
              {message}
            </p>
          ) : null}
        </div>
      </form>

      {isSubmitted ? (
        <div
          id="feature-request-status"
          role="status"
          className="mt-6 rounded-md border border-neutral-200 p-4 text-sm dark:border-neutral-800"
        >
          <p className="font-medium">{message}</p>
          <p className="mt-1 text-neutral-600 dark:text-neutral-300">
            Request saved: {submittedRequest}
          </p>
          <p className="mt-2 text-xs text-neutral-500">
            Stored in localStorage under the key &quot;featureRequest&quot;.
            Scope analysis is not built yet.
          </p>
        </div>
      ) : null}
    </section>
  );
}
