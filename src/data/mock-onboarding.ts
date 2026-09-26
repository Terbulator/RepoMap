import type {
  OnboardingMapData,
  Module,
  ModuleFile,
  RecommendedFile,
  Gotcha,
  Relationship,
} from "@/types/onboarding";

const moduleFiles: Record<string, ModuleFile[]> = {
  "config": [
    { path: "src/config/index.ts", language: "TypeScript", size: 2048 },
    { path: "src/config/env.ts", language: "TypeScript", size: 1536 },
    { path: "src/config/constants.ts", language: "TypeScript", size: 512 },
    { path: "src/config/features.ts", language: "TypeScript", size: 1024 },
  ],
  "database": [
    { path: "src/database/schema.ts", language: "TypeScript", size: 8192 },
    { path: "src/database/migrations/001_initial.ts", language: "TypeScript", size: 4096 },
    { path: "src/database/migrations/002_add_indexes.ts", language: "TypeScript", size: 2048 },
    { path: "src/database/client.ts", language: "TypeScript", size: 2048 },
    { path: "src/database/queries.ts", language: "TypeScript", size: 3072 },
    { path: "src/database/transactions.ts", language: "TypeScript", size: 1536 },
  ],
  "auth": [
    { path: "src/auth/provider.tsx", language: "TSX", size: 4096 },
    { path: "src/auth/session.ts", language: "TypeScript", size: 2048 },
    { path: "src/auth/jwt.ts", language: "TypeScript", size: 2048 },
    { path: "src/auth/middleware.ts", language: "TypeScript", size: 1536 },
    { path: "src/auth/permissions.ts", language: "TypeScript", size: 2048 },
    { path: "src/auth/hooks.ts", language: "TypeScript", size: 1536 },
  ],
  "api": [
    { path: "src/api/routes.ts", language: "TypeScript", size: 4096 },
    { path: "src/api/middleware.ts", language: "TypeScript", size: 2048 },
    { path: "src/api/validation.ts", language: "TypeScript", size: 2048 },
    { path: "src/api/handlers/users.ts", language: "TypeScript", size: 3072 },
    { path: "src/api/handlers/projects.ts", language: "TypeScript", size: 3072 },
    { path: "src/api/handlers/webhooks.ts", language: "TypeScript", size: 2048 },
    { path: "src/api/rate-limiter.ts", language: "TypeScript", size: 1536 },
  ],
  "services": [
    { path: "src/services/email.ts", language: "TypeScript", size: 3072 },
    { path: "src/services/storage.ts", language: "TypeScript", size: 3072 },
    { path: "src/services/webhooks.ts", language: "TypeScript", size: 2048 },
    { path: "src/services/analytics.ts", language: "TypeScript", size: 2048 },
    { path: "src/services/cache.ts", language: "TypeScript", size: 1536 },
  ],
  "ui": [
    { path: "src/ui/components/Button.tsx", language: "TSX", size: 1536 },
    { path: "src/ui/components/Modal.tsx", language: "TSX", size: 3072 },
    { path: "src/ui/components/Table.tsx", language: "TSX", size: 4096 },
    { path: "src/ui/components/Form.tsx", language: "TSX", size: 3072 },
    { path: "src/ui/components/Navigation.tsx", language: "TSX", size: 2048 },
    { path: "src/ui/theme.ts", language: "TypeScript", size: 2048 },
    { path: "src/ui/hooks.ts", language: "TypeScript", size: 1024 },
  ],
  "features": [
    { path: "src/features/dashboard/page.tsx", language: "TSX", size: 3072 },
    { path: "src/features/projects/page.tsx", language: "TSX", size: 4096 },
    { path: "src/features/settings/page.tsx", language: "TSX", size: 2048 },
    { path: "src/features/analytics/page.tsx", language: "TSX", size: 3072 },
    { path: "src/features/team/page.tsx", language: "TSX", size: 2048 },
  ],
  "shared": [
    { path: "src/shared/types.ts", language: "TypeScript", size: 2048 },
    { path: "src/shared/utils.ts", language: "TypeScript", size: 2048 },
    { path: "src/shared/hooks.ts", language: "TypeScript", size: 1536 },
    { path: "src/shared/constants.ts", language: "TypeScript", size: 1024 },
    { path: "src/shared/errors.ts", language: "TypeScript", size: 1536 },
  ],
};

const modules: Module[] = [
  {
    id: "config",
    name: "Configuration",
    path: "src/config",
    purpose: "Centralized application configuration, environment variable validation, feature flags, and runtime constants",
    files: moduleFiles.config,
    dependencies: ["shared"],
    bobExplanation: "Centralizes all environment configuration, feature flags, and runtime constants. Uses Zod for validation and provides type-safe access to environment variables.",
  },
  {
    id: "database",
    name: "Database",
    path: "src/database",
    purpose: "Database schema definitions, migration system, query builders, transaction management, and the PostgreSQL client wrapper",
    files: moduleFiles.database,
    dependencies: ["config", "shared"],
    bobExplanation: "Manages PostgreSQL schema, migrations, and query execution. Provides a type-safe query builder and transaction wrapper around the native pg client.",
  },
  {
    id: "auth",
    name: "Authentication",
    path: "src/auth",
    purpose: "Authentication provider, JWT token management, session handling, role-based permissions, and auth middleware",
    files: moduleFiles.auth,
    dependencies: ["config", "database", "shared"],
    bobExplanation: "Implements JWT-based authentication with HttpOnly cookies, role-based access control, and session management. Integrates with Next.js middleware for route protection.",
  },
  {
    id: "api",
    name: "API Layer",
    path: "src/api",
    purpose: "REST API route definitions, request validation, rate limiting, and endpoint handlers for users, projects, and webhooks",
    files: moduleFiles.api,
    dependencies: ["config", "auth", "database", "services", "shared"],
    bobExplanation: "Defines REST endpoints using Next.js App Router route handlers. Includes request validation (Zod), rate limiting, and standardized error responses.",
  },
  {
    id: "services",
    name: "External Services",
    path: "src/services",
    purpose: "Integrations with third-party services: email (SendGrid), file storage (S3), webhook delivery, analytics, and caching (Redis)",
    files: moduleFiles.services,
    dependencies: ["config", "shared"],
    bobExplanation: "Abstracts third-party integrations: SendGrid for email, S3 for file storage, webhook delivery with retry logic, analytics events, and Redis caching.",
  },
  {
    id: "ui",
    name: "UI Components",
    path: "src/ui",
    purpose: "Design system primitives: Button, Modal, Table, Form, Navigation components, theming, and shared UI hooks",
    files: moduleFiles.ui,
    dependencies: ["shared"],
    bobExplanation: "Design system built on Tailwind CSS v4 with CSS variables. Provides accessible, composable components (Button, Modal, Table, Form, Navigation) with consistent theming.",
  },
  {
    id: "features",
    name: "Feature Pages",
    path: "src/features",
    purpose: "Page-level React components for each product feature: Dashboard, Projects, Settings, Analytics, Team management",
    files: moduleFiles.features,
    dependencies: ["ui", "api", "auth", "shared"],
    bobExplanation: "Page-level feature components that compose UI primitives and call API handlers. Each feature is self-contained with its own routing and state management.",
  },
  {
    id: "shared",
    name: "Shared Utilities",
    path: "src/shared",
    purpose: "Cross-cutting utilities: TypeScript types, helper functions, custom React hooks, error classes, and constants",
    files: moduleFiles.shared,
    dependencies: [],
    bobExplanation: "Cross-cutting utilities: TypeScript type definitions, helper functions (date formatting, string manipulation), custom React hooks, and error classes.",
  },
];

const recommendedFiles: RecommendedFile[] = [
  {
    path: "src/config/env.ts",
    reason: "Central configuration — shows all environment variables, feature flags, and runtime settings",
    rank: 1,
  },
  {
    path: "src/api/routes.ts",
    reason: "API entry point — maps all REST endpoints to their handlers and middleware",
    rank: 2,
  },
  {
    path: "src/database/schema.ts",
    reason: "Database schema — reveals all data models, relationships, and constraints",
    rank: 3,
  },
  {
    path: "src/auth/provider.tsx",
    reason: "Auth provider — shows how authentication, sessions, and permissions are wired",
    rank: 4,
  },
  {
    path: "src/shared/types.ts",
    reason: "Shared types — defines core domain types used across the entire application",
    rank: 5,
  },
];

const gotchas: Gotcha[] = [
  {
    id: "gotcha-1",
    title: "Circular dependency between Auth and Database",
    description:
      "The auth module imports database for user lookups, but database imports auth types for row-level security policies. Resolve by extracting shared types to the shared module.",
    severity: "high",
    filePaths: ["src/auth/provider.tsx", "src/database/schema.ts"],
  },
  {
    id: "gotcha-2",
    title: "API routes bypass middleware in development",
    description:
      "Next.js App Router middleware doesn't execute for API routes in dev mode. Auth checks only run in production. Always test middleware behavior in a production-like environment.",
    severity: "high",
    filePaths: ["src/api/middleware.ts", "src/auth/middleware.ts"],
  },
  {
    id: "gotcha-3",
    title: "Database migrations run automatically on every deploy",
    description:
      "Migration scripts execute on every deployment without confirmation or rollback option. Migrations must be idempotent and backward-compatible. No manual approval step exists.",
    severity: "high",
    filePaths: ["src/database/migrations/001_initial.ts", "src/database/migrations/002_add_indexes.ts"],
  },
  {
    id: "gotcha-4",
    title: "UI theme uses CSS variables — not Tailwind config",
    description:
      "All theme colors are defined in CSS variables (globals.css), not in tailwind.config.js. Theme changes require editing CSS files directly; Tailwind rebuild won't pick up changes.",
    severity: "medium",
    filePaths: ["src/ui/theme.ts", "src/app/globals.css"],
  },
  {
    id: "gotcha-5",
    title: "Rate limiter only applies to API routes, not Server Actions",
    description:
      "The rate-limiting middleware is attached to API routes only. Server Actions and form submissions bypass it entirely. Consider adding rate limiting at the edge or middleware level.",
    severity: "medium",
    filePaths: ["src/api/rate-limiter.ts"],
  },
  {
    id: "gotcha-6",
    title: "Feature flags evaluated at build time, not runtime",
    description:
      "Feature flags in config/features.ts are tree-shaken at build time. Changing a flag requires a full rebuild and redeploy — no runtime toggling is possible.",
    severity: "medium",
    filePaths: ["src/config/features.ts"],
  },
  {
    id: "gotcha-7",
    title: "Webhook delivery has no retry mechanism",
    description:
      "Outgoing webhooks (src/services/webhooks.ts) fire once and don't retry on failure. Failed deliveries are logged but not retried. Consider adding exponential backoff.",
    severity: "low",
    filePaths: ["src/services/webhooks.ts"],
  },
];

const relationships: Relationship[] = [
  { source: "config", target: "shared", type: "imports" },
  { source: "database", target: "config", type: "imports" },
  { source: "database", target: "shared", type: "imports" },
  { source: "auth", target: "config", type: "imports" },
  { source: "auth", target: "database", type: "calls" },
  { source: "auth", target: "shared", type: "imports" },
  { source: "api", target: "config", type: "imports" },
  { source: "api", target: "auth", type: "imports" },
  { source: "api", target: "database", type: "calls" },
  { source: "api", target: "services", type: "calls" },
  { source: "api", target: "shared", type: "imports" },
  { source: "services", target: "config", type: "imports" },
  { source: "services", target: "shared", type: "imports" },
  { source: "ui", target: "shared", type: "imports" },
  { source: "features", target: "ui", type: "imports" },
  { source: "features", target: "api", type: "calls" },
  { source: "features", target: "auth", type: "imports" },
  { source: "features", target: "shared", type: "imports" },
];

export const mockOnboardingData: OnboardingMapData = {
  repository: {
    name: "repomap",
    url: "https://github.com/terbulator/repomap",
    branch: "main",
    commitSha: "a1b2c3d4e5f6g7h8i9j0",
    analyzedAt: "2026-09-25T20:45:00Z",
  },
  projectSummary:
    "RepoMap is a full-stack TypeScript application built with Next.js 16 (App Router) that provides a REST API with authentication, database persistence, and a React-based admin dashboard. The codebase follows a modular architecture with clear separation between configuration, database layer, authentication, API routes, external service integrations, UI component library, and feature-specific page components. It uses a custom PostgreSQL client wrapper with a migration system, JWT-based authentication with HttpOnly cookies and role-based permissions, and a design system built on Tailwind CSS v4 with CSS variables for theming. The application serves as a code intelligence platform that ingests repositories and generates interactive architecture maps.",
  stack: ["Next.js 16", "TypeScript 5", "React 19", "Tailwind CSS v4", "PostgreSQL", "JWT Auth", "Redis", "SendGrid", "S3"],
  modules,
  recommendedFiles,
  gotchas,
  relationships,
};