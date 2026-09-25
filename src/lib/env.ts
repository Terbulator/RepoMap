import { z } from "zod";

/**
 * Server-side environment placeholders for the IBM Bob 2.0 integration.
 * All values are optional so the app builds and runs before integration exists.
 */
const serverEnvSchema = z.object({
  BOB_API_BASE_URL: z.string().url().optional(),
  BOB_API_KEY: z.string().min(1).optional(),
  BOB_PROJECT_ID: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const env: ServerEnv = serverEnvSchema.parse({
  BOB_API_BASE_URL: process.env.BOB_API_BASE_URL || undefined,
  BOB_API_KEY: process.env.BOB_API_KEY || undefined,
  BOB_PROJECT_ID: process.env.BOB_PROJECT_ID || undefined,
});
