"use client";

import { cn } from "@/lib/cn";

interface SeverityBadgeProps {
  severity: "high" | "medium" | "low";
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";
  const variants = {
    high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  };

  return <span className={cn(base, variants[severity])}>{severity}</span>;
}

interface StackBadgeProps {
  children: React.ReactNode;
}

export function StackBadge({ children }: StackBadgeProps) {
  return (
    <span className="inline-flex items-center rounded-md bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
      {children}
    </span>
  );
}

interface FileIconProps {
  language?: string;
  className?: string;
}

export function FileIcon({ language, className }: FileIconProps) {
  const icons: Record<string, string> = {
    TypeScript: "📘",
    TSX: "⚛️",
    JavaScript: "📙",
    JSX: "⚛️",
    Python: "🐍",
    Go: "🐹",
    Rust: "🦀",
    JSON: "📋",
    CSS: "🎨",
    HTML: "🌐",
  };

  return (
    <span className={cn("text-base", className)} aria-hidden="true">
      {icons[language || ""] || "📄"}
    </span>
  );
}