import type { Metadata } from "next";
import { ScopeShield } from "@/features/scope-shield/scope-shield";

export const metadata: Metadata = {
  title: "ScopeShield",
  description:
    "Describe a feature request and store it for the scope analysis that follows.",
};

export default function ScopeShieldPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="border-b border-neutral-200 pb-6 text-sm text-neutral-600 dark:border-neutral-300 dark:border-neutral-800">
        Stage 1 — feature request input, stored in your browser. Stage 2 —
        hidden scope per architectural layer. Stage 3 — clarifying questions.
        Stage 4 — a drafted professional reply. Stage 5 — the detected
        repository context every output is grounded in. Stage 6 — loading,
        validation and error states. Clicking &quot;Analyze Scope&quot; sends the request
        to IBM Bob 2.0 via /api/scope/analyze; if Bob is unavailable the UI
        falls back to deterministic mock generators.
      </p>

      <div className="mt-8">
        <ScopeShield />
      </div>
    </div>
  );
}
