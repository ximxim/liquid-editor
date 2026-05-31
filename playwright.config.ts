import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the harness. Boots the playground dev server, captures
 * traces/screenshots/video on failure into test-results/, and (via the fixture
 * in apps/playground/e2e/fixtures.ts) appends browser console output to
 * logs/browser-console.log so failures are diagnosable from files alone.
 */
export default defineConfig({
  testDir: "./apps/playground/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  outputDir: "test-results",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "pnpm --filter @liquid-ai/playground dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
