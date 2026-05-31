import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { logForwarder } from "../../tooling/vite/log-forwarder";

const repoRoot = resolve(__dirname, "../..");

export default defineConfig({
  plugins: [
    react(),
    logForwarder({ logFile: resolve(repoRoot, "logs/browser-runtime.log") }),
  ],
  resolve: {
    // Resolve all workspace packages to source so Vite processes them as a
    // unified build — critical for Web Worker URLs (runtime-webllm/adapter.ts)
    // which Rollup cannot relocate when consumed from pre-built dist files.
    alias: {
      "@liquid-ai/core": resolve(repoRoot, "packages/core/src/index.ts"),
      "@liquid-ai/renderer": resolve(repoRoot, "packages/renderer/src/index.ts"),
      "@liquid-ai/editor": resolve(repoRoot, "packages/editor/src/index.ts"),
      "@liquid-ai/runtime-webllm": resolve(repoRoot, "packages/runtime-webllm/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
