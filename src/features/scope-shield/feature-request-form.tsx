"use client";

import { useState } from "react";
import {
  EMPTY_REQUEST_MESSAGE,
  STORED_REQUEST_MESSAGE,
  isEmptyFeatureRequest,
  saveFeatureRequest,
} from "@/features/scope-shield/feature-request";

export function FeatureRequestForm() {
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isEmptyFeatureRequest(text)) {
      setIsError(true);
      setMessage(EMPTY_REQUEST_MESSAGE);
      return;
    }

    const stored = saveFeatureRequest(text);
    console.log("ScopeShield feature request:", stored);

    setIsError(false);
    setMessage(STORED_REQUEST_MESSAGE);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl">
      <label
        htmlFor="feature-request"
        className="block text-sm font-medium"
      >
        Describe the feature you want to build:
      </label>
      <textarea
        id="feature-request"
        name="featureRequest"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={8}
        placeholder="Example: Add authentication to the project"
        className="mt-3 w-full rounded-md border border-neutral-300 bg-transparent px-4 py-3 text-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-700 dark:focus:ring-white"
      />
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Analyze Scope
        </button>
        {message ? (
          <p
            role="status"
            className={
              isError
                ? "text-sm text-red-600 dark:text-red-400"
                : "text-sm text-neutral-600 dark:text-neutral-300"
            }
          >
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
