import { z } from "zod";

/**
 * Server-side environment for the IBM Bob 2.0 integration.
 * Only BOB_API_BASE_URL is required for analysis; the rest have defaults so the
 * app builds and runs before Bob 2.0 is wired up.
 */
const serverEnvSchema = z.object({
  BOB_API_BASE_URL: z.string().url().optional(),
  BOB_API_KEY: z.string().min(1).optional(),
  BOB_PROJECT_ID: z.string().min(1).optional(),
  BOB_ANALYSIS_PATH: z.string().min(1).default("v1/repositories/analyze"),
  BOB_MODEL: z.string().min(1).optional(),
  BOB_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const env: ServerEnv = serverEnvSchema.parse({
  BOB_API_BASE_URL: process.env.BOB_API_BASE_URL || undefined,
  BOB_API_KEY: process.env.BOB_API_KEY || undefined,
  BOB_PROJECT_ID: process.env.BOB_PROJECT_ID || undefined,
  BOB_ANALYSIS_PATH: process.env.BOB_ANALYSIS_PATH || undefined,
  BOB_MODEL: process.env.BOB_MODEL || undefined,
  BOB_TIMEOUT_MS: process.env.BOB_TIMEOUT_MS || undefined,
});
