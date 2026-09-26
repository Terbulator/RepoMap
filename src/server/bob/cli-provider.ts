import { execFile } from "node:child_process";
import { env } from "@/lib/env";
import { parseBobOutput } from "./output.ts";
import { buildRepoMapPrompt } from "./prompts.ts";
import { BobProviderError, type BobProvider, type RepositoryAnalysis } from "./provider.ts";

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
 * This is the only integration path verified against the real tool on this
 * machine (bobshell 2.0.5). It is NOT verified end to end, because headless
 * runs require BOB_API_KEY, which is not available in this environment — see
 * README "Bob integration status".
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
      if (!apiKey) {
        throw new BobProviderError(
          "BOB_API_KEY is not set. Headless IBM Bob 2.0 runs require it; export it before starting the app.",
        );
      }

      const stdout = await runBob(
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
          buildRepoMapPrompt(repositoryUrl),
        ]),
        binary,
        timeoutMs,
        runImpl,
      );
      return parseBobOutput(stdout, binary);
    },
  };
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
    runImpl(
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
  });
}
