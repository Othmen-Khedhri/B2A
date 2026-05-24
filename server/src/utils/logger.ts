// ─── Structured JSON logger ───────────────────────────────────────────────────
// Outputs log lines as JSON objects so they can be ingested by log aggregators
// (e.g. Datadog, Papertrail) without additional parsing.
//
// Each line includes: level, msg, timestamp, and any extra metadata passed in.
//
// Usage:
//   import { logger } from "../utils/logger";
//   logger.info("Server started", { port: 5000 });
//   logger.error("DB failed", { err: error.message });

export const logger = {
  // Informational messages — normal operation
  info: (msg: string, meta?: object) =>
    console.log(JSON.stringify({ level: "info",  msg, ...meta, ts: new Date() })),

  // Error messages — something went wrong that needs attention
  error: (msg: string, meta?: object) =>
    console.error(JSON.stringify({ level: "error", msg, ...meta, ts: new Date() })),

  // Warnings — degraded state but not yet broken
  warn: (msg: string, meta?: object) =>
    console.warn(JSON.stringify({ level: "warn",  msg, ...meta, ts: new Date() })),
};
