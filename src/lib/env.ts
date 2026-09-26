import { z } from "zod";

/**
 * Server-side configuration.
 *
 * REPOMAP_PROVIDER picks the analysis provider: "mock" (default, checked-in
 * fixture) or "bob-2.0" (the installed IBM Bob CLI). There is no invented Bob
 * HTTP endpoint here on purpose — the CLI is the verified integration path.
 *
 * `env` is intentionally a getter rather than a module-level constant so that
 * it always reflects `process.env` at call time. This prevents the common
 * Next.js pitfall where a module is imported before `.env.local` is applied
 * (e.g. during HMR or build-time static analysis), which would otherwise freeze
 * REPOMAP_PROVIDER as "mock" for the lifetime of the module cache even after the
 * server is restarted with the correct environment.
 */
const serverEnvSchema = z.object({
  REPOMAP_PROVIDER: z.enum(["mock", "bob-2.0"]).default("mock"),
  REPOMAP_WORKSPACE_DIR: z.string().min(1).optional(),
  REPOMAP_CLONE_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  BOB_CLI_PATH: z.string().min(1).default("bob"),
  BOB_MAX_TURNS: z.coerce.number().int().positive().default(8),
  BOB_TIMEOUT_MS: z.coerce.number().int().positive().default(300_000),
  BOB_API_KEY: z.string().min(1).optional(),
  BOB_ENDPOINT: z.string().url().optional(),
  BOB_SCOPE_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const env: ServerEnv = serverEnvSchema.parse({
  REPOMAP_PROVIDER: process.env.REPOMAP_PROVIDER || undefined,
  REPOMAP_WORKSPACE_DIR: process.env.REPOMAP_WORKSPACE_DIR || undefined,
  REPOMAP_CLONE_TIMEOUT_MS: process.env.REPOMAP_CLONE_TIMEOUT_MS || undefined,
  BOB_CLI_PATH: process.env.BOB_CLI_PATH || undefined,
  BOB_MAX_TURNS: process.env.BOB_MAX_TURNS || undefined,
  BOB_TIMEOUT_MS: process.env.BOB_TIMEOUT_MS || undefined,
  BOB_API_KEY: process.env.BOB_API_KEY || undefined,
  BOB_ENDPOINT: process.env.BOB_ENDPOINT || undefined,
  BOB_SCOPE_TIMEOUT_MS: process.env.BOB_SCOPE_TIMEOUT_MS || undefined,
});
