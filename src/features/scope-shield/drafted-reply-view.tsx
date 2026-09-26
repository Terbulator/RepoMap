"use client";

import { useEffect, useRef, useState } from "react";

const RESET_COPIED_AFTER_MS = 2000;

/** Stage 4 output: an editable, copyable reply for the requester. */
export function DraftedReplyView({
  draft,
  source,
}: {
  draft: string;
  source?: "bob-2.0" | "mock";
}) {
  const [text, setText] = useState(draft);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const isEdited = text !== draft;

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopyState("idle"), RESET_COPIED_AFTER_MS);
  }

  return (
    <section aria-label="Drafted professional reply" className="mt-10">
      <div className="flex flex-wrap items-center gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-500">
          Drafted Professional Reply
        </h2>
        <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800 ring-1 ring-sky-600/20 dark:bg-sky-500/15 dark:text-sky-300">
          {isEdited ? "Edited draft" : "Ready to send"}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {isEdited ? (
            <button
              type="button"
              onClick={() => setText(draft)}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Reset Draft
            </button>
          ) : null}
          <button
            type="button"
            onClick={copyDraft}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Copy Drafted Reply
          </button>
        </div>
      </div>

      <label htmlFor="drafted-reply" className="mt-4 block text-sm font-medium">
        Edit the message before sending:
      </label>
      <textarea
        id="drafted-reply"
        rows={18}
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="mt-2 w-full rounded-md border border-neutral-300 bg-transparent px-4 py-3 font-mono text-xs leading-relaxed focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:border-neutral-700 dark:focus:ring-white"
      />

      <p role="status" className="mt-2 min-h-4 text-xs text-neutral-500">
        {copyState === "copied"
          ? "Draft copied. Paste it into email or Slack."
          : copyState === "failed"
            ? "Could not reach the clipboard. Select the text and copy it manually."
            : source === "bob-2.0"
              ? "Draft generated live by IBM Bob 2.0."
              : "Mock draft assembled from the request, the detected stack and the clarifying questions above."}
      </p>
    </section>
  );
}
