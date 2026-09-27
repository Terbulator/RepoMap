import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/repository/analyze": [
      "./node_modules/bobshell/**/*",
      "./node_modules/@officecli/officecli/**/*",
      "./node_modules/@lydell/node-pty/**/*",
      "./node_modules/@vscode/ripgrep/**/*",
    ],
    "/api/scope-shield": [
      "./node_modules/bobshell/**/*",
      "./node_modules/@officecli/officecli/**/*",
      "./node_modules/@lydell/node-pty/**/*",
      "./node_modules/@vscode/ripgrep/**/*",
    ],
  },
};

export default nextConfig;