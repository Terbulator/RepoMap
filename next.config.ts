import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/**/*": [
      "./node_modules/bobshell/**/*",
      "./node_modules/@lydell/node-pty/**/*",
      "./node_modules/@officecli/officecli/**/*",
      "./node_modules/@vscode/ripgrep/**/*",
    ],
  },
};

export default nextConfig;