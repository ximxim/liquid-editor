import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Plugin } from "vite";

/**
 * Dev-only Vite plugin that forwards browser runtime output to a log file an
 * agent can read. Without this, async errors (WebGPU/WebLLM init, unhandled
 * rejections) only surface in the browser console — invisible to a coding
 * agent unless a human reports them. With it, `pnpm dev` writes every
 * console.*, window.onerror, and unhandledrejection to logs/browser-runtime.log.
 *
 * Never runs in library/production builds (`apply: "serve"`).
 */
export interface LogForwarderOptions {
  /** Absolute path to the log file. */
  logFile: string;
  /** Endpoint the client posts to. Default: "/__log". */
  endpoint?: string;
}

interface ClientLogEntry {
  level: string;
  message: string;
  stack?: string;
  url?: string;
}

const isClientLogEntry = (value: unknown): value is ClientLogEntry => {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return typeof entry.level === "string" && typeof entry.message === "string";
};

const formatEntry = (entry: ClientLogEntry): string => {
  const parts = [
    `level=${entry.level}`,
    entry.url ? `url=${entry.url}` : null,
    `msg=${entry.message}`,
    entry.stack ? `\n${entry.stack}` : null,
  ].filter(Boolean);
  return `[browser-runtime] ${parts.join(" ")}\n`;
};

const buildClientSnippet = (endpoint: string): string => `
(() => {
  const ENDPOINT = ${JSON.stringify(endpoint)};
  const send = (level, message, stack) => {
    try {
      navigator.sendBeacon
        ? navigator.sendBeacon(ENDPOINT, JSON.stringify({ level, message, stack, url: location.href }))
        : fetch(ENDPOINT, { method: "POST", body: JSON.stringify({ level, message, stack, url: location.href }), keepalive: true });
    } catch (_) { /* never let logging break the app */ }
  };
  const serialize = (args) => args.map((a) => {
    if (a instanceof Error) return a.message;
    if (typeof a === "object") { try { return JSON.stringify(a); } catch { return String(a); } }
    return String(a);
  }).join(" ");
  for (const level of ["error", "warn", "log", "info"]) {
    const original = console[level].bind(console);
    console[level] = (...args) => { send(level, serialize(args)); original(...args); };
  }
  window.addEventListener("error", (e) => send("error", e.message, e.error && e.error.stack));
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    send("error", "unhandledrejection: " + (reason && reason.message ? reason.message : String(reason)), reason && reason.stack);
  });
})();
`;

export function logForwarder(options: LogForwarderOptions): Plugin {
  const endpoint = options.endpoint ?? "/__log";
  const logFile = resolve(options.logFile);

  return {
    name: "liquid-ai:log-forwarder",
    apply: "serve",
    configureServer(server) {
      mkdirSync(dirname(logFile), { recursive: true });
      server.middlewares.use(endpoint, (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => {
          try {
            const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
            if (isClientLogEntry(parsed)) {
              appendFileSync(logFile, formatEntry(parsed));
            }
          } catch {
            // Malformed payload — drop it; logging must never throw.
          }
          res.statusCode = 204;
          res.end();
        });
      });
    },
    transformIndexHtml() {
      return [
        {
          tag: "script",
          children: buildClientSnippet(endpoint),
          injectTo: "head-prepend",
        },
      ];
    },
  };
}
