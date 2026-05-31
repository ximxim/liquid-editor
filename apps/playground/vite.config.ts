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
  server: {
    port: 5173,
    strictPort: true,
  },
});
