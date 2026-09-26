import { execFile } from "node:child_process";
import { env } from "@/lib/env";
import { parseBobOutput, parseScopeOutput } from "./output.ts";
import { buildRepoMapPrompt, buildScopeShieldPrompt } from "./prompts.ts";
import { BobProviderError, type BobProvider, type RepositoryAnalysis, type ScopeAnalysis } from "./provider.ts";

export type CliBobProviderOptions = {
  workspace: string;
  binary?: string;
  maxTurns?: number;
  timeoutMs?: number;
  apiKey?: string;
  runImpl?: typeof execFile;
};

/**
 * Runs IBM Bob 2.0 through its installed CLI (`bobshell`, the `bob` command) in
 * headless mode: `bob run --format json --workspace <dir> <prompt>`.
 *
 * This is the only integration path, and it is verified end to end on this
 * machine (bobshell 2.0.5): the Onboarding Map and ScopeShield both complete a
 * real run against a cloned workspace. It requires BOB_API_KEY in the server
 * environment; the browser never sees it.
 */
export function createCliBobProvider(options: CliBobProviderOptions): BobProvider {
  const {
    workspace,
    binary = env.BOB_CLI_PATH,
    maxTurns = env.BOB_MAX_TURNS,
    timeoutMs = env.BOB_TIMEOUT_MS,
    apiKey = process.env.BOB_API_KEY,
    runImpl = execFile,
  } = options;

  return {
    name: "bob-2.0",

    async analyzeRepository(repositoryUrl: string): Promise<RepositoryAnalysis> {
      const stdout = await runPrompt(buildRepoMapPrompt(repositoryUrl));
      return parseBobOutput(stdout, binary);
    },

    /**
     * ScopeShield's operation. Same CLI, same execution path, same prompt shape
     * rules as `analyzeRepository` — only the prompt differs.
     */
    async analyzeScope(
      repositoryUrl: string,
      request: string,
      context?: string | null,
    ): Promise<ScopeAnalysis> {
      const stdout = await runPrompt(buildScopeShieldPrompt(repositoryUrl, request, context));
      return parseScopeOutput(stdout, binary);
    },
  };

  /**
   * One `bob run` invocation, shared by both operations so BOB_CLI_PATH,
   * BOB_MAX_TURNS, BOB_TIMEOUT_MS and the Windows .js handling can never drift
   * apart between them.
   */
  async function runPrompt(prompt: string): Promise<string> {
    if (!apiKey) {
      throw new BobProviderError(
        "BOB_API_KEY is not set. Headless IBM Bob 2.0 runs require it; export it before starting the app.",
      );
    }

    return runBob(
      buildCommand(binary, [
        "run",
        "--format",
        "json",
        "--max-turns",
        String(maxTurns),
        "--disable-mcp",
        "--disable-subagents",
        "--workspace",
        workspace,
        prompt,
      ]),
      binary,
      timeoutMs,
      runImpl,
    );
  }
}

type ExecFile = typeof execFile;

/**
 * Windows note: `bob` is installed as an npm shim (bob.cmd/bob.ps1), which
 * cannot be spawned directly. Pointing BOB_CLI_PATH at the CLI's JavaScript
 * entry (…\bobshell\dist\bob.js) runs it through the current Node binary.
 */
export function buildCommand(binary: string, args: string[]): { file: string; args: string[] } {
  if (/\.(c|m)?js$/i.test(binary)) {
    return { file: process.execPath, args: [binary, ...args] };
  }
  return { file: binary, args };
}

function runBob(
  command: { file: string; args: string[] },
  binary: string,
  timeoutMs: number,
  runImpl: ExecFile,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = runImpl(
      command.file,
      command.args,
      { timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024, windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          const detail = String(stderr || error.message).trim().slice(0, 500);
          reject(new BobProviderError(`IBM Bob 2.0 (${binary}) failed: ${detail}`, error));
          return;
        }
        resolve(String(stdout));
      },
    );
    // `bob run` reads stdin to EOF unless stdin is a TTY, and execFile gives it a pipe it never
    // ends, so the CLI waits forever and the request only ends at the timeout. Closing stdin
    // makes it resolve immediately with an empty string.
    child.stdin?.end();
  });
}
