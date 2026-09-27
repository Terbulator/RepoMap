import { z } from "zod";

/**
 * Server-side configuration.
 *
 * REPOMAP_PROVIDER picks the analysis provider: "mock" (default, checked-in
 * fixture) or "bob-2.0" (the installed IBM Bob CLI). There is no invented Bob
 * HTTP endpoint here on purpose — the CLI is the verified integration path.
 *
 * `env` is a lazy Proxy: every property access re-reads and re-validates
 * `process.env`. Two reasons:
 *
 * 1. A module is often imported before `.env.local` is applied (during HMR or
 *    build-time analysis), so validating once at import would freeze
 *    REPOMAP_PROVIDER for the lifetime of the module cache.
 * 2. More importantly, an invalid value must not throw while this module is
 *    being imported. A throw here happens before any route handler runs, so
 *    Next.js cannot answer with our JSON error envelope and the client receives
 *    an empty non-JSON body instead. Deferring the throw to property access
 *    moves it inside the request, where callers can catch EnvConfigError and
 *    still return a structured JSON error.
 */
const serverEnvSchema = z.object({
  REPOMAP_PROVIDER: z.enum(["mock", "bob-2.0"]).default("mock"),
  REPOMAP_WORKSPACE_DIR: z.string().min(1).optional(),
  REPOMAP_CLONE_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  BOB_CLI_PATH: z.string().min(1).default("bob"),
  BOB_MAX_TURNS: z.coerce.number().int().positive().default(32),
  BOB_TIMEOUT_MS: z.coerce.number().int().positive().default(900_000),
  BOB_API_KEY: z.string().min(1).optional(),
  BOB_ENDPOINT: z.string().url().optional(),
  BOB_SCOPE_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Raised when `.env.local` / the process environment holds a value the schema
 * rejects. The message names the offending variable but never its value, so it
 * is safe to log: a malformed BOB_API_KEY cannot leak through it.
 */
export class EnvConfigError extends Error {
  readonly keys: readonly string[];

  constructor(keys: readonly string[]) {
    super(
      `Invalid server configuration for: ${keys.join(", ")}. ` +
        `Check the value in .env.local (values are never included in this message).`,
    );
    this.name = "EnvConfigError";
    this.keys = keys;
  }
}

function readEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
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

  if (!parsed.success) {
    const keys = [
      ...new Set(
        parsed.error.issues
          .map((issue) => issue.path.join("."))
          .filter((key) => key.length > 0),
      ),
    ];
    throw new EnvConfigError(keys);
  }

  return parsed.data;
}

export const env: ServerEnv = new Proxy({} as ServerEnv, {
  get: (_target, property: string) => Reflect.get(readEnv(), property),
});
