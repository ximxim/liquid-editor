import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { test as base } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const LOG_FILE = resolve(here, "../../../logs/browser-console.log");

/**
 * Test fixture that pipes every page's console output, uncaught page errors,
 * and failed network requests into logs/browser-console.log. This makes an e2e
 * failure diagnosable from a file — no need to re-run interactively or ask a
 * human what the browser showed.
 */
export const test = base.extend<{ captureConsole: void }>({
  captureConsole: [
    async ({ page }, use, testInfo) => {
      mkdirSync(dirname(LOG_FILE), { recursive: true });
      const tag = `[${testInfo.title}]`;
      const write = (line: string) => appendFileSync(LOG_FILE, `${tag} ${line}\n`);

      page.on("console", (msg) => write(`console.${msg.type()}: ${msg.text()}`));
      page.on("pageerror", (err) => write(`pageerror: ${err.message}\n${err.stack ?? ""}`));
      page.on("requestfailed", (req) =>
        write(`requestfailed: ${req.method()} ${req.url()} — ${req.failure()?.errorText ?? "unknown"}`),
      );

      await use();
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
