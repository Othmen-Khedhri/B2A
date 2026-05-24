// ─── Audit logger utility ─────────────────────────────────────────────────────
// Two exports:
//  diffChanges  — compares two plain objects and returns a field-level diff
//  logAudit     — fire-and-forget write to the AuditLog collection
//
// Design goal: logging must NEVER break the main request flow.
// Every call to logAudit() is non-blocking and swallows all errors.

import { Request } from "express";
import AuditLog, { AuditAction, AuditResource, IChanges } from "../models/AuditLog";
import { AuthRequest } from "../middleware/authMiddleware";

// Fields that must never appear in change diffs (contain secrets or internal noise)
const SENSITIVE_FIELDS = new Set([
  "password",
  "resetPasswordToken",
  "resetPasswordExpires",
  "refreshToken",
  "accessToken",
  "__v", // Mongoose internal version key
]);

// ─── diffChanges ─────────────────────────────────────────────────────────────
// Compares old and new document objects, returning only the fields that changed.
// Uses JSON.stringify for deep equality so nested objects and arrays are handled.
// Sensitive fields are always excluded regardless of whether they changed.
export function diffChanges(
  oldDoc: Record<string, unknown>,
  newDoc: Record<string, unknown>
): IChanges {
  const changes: IChanges = {};

  // Union of all keys from both objects — catches newly added and removed fields
  const keys = new Set([...Object.keys(oldDoc), ...Object.keys(newDoc)]);

  for (const key of keys) {
    if (SENSITIVE_FIELDS.has(key)) continue; // skip sensitive fields unconditionally

    const oldVal = oldDoc[key];
    const newVal = newDoc[key];

    // Deep-compare via JSON to handle objects, arrays, and null correctly
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = { old: oldVal ?? null, new: newVal ?? null };
    }
  }

  return changes;
}

// Options passed to logAudit — only action and resource are required
interface LogAuditOptions {
  action:        AuditAction;
  resource:      AuditResource;
  resourceId?:   string | null;   // MongoDB _id of the affected document
  resourceName?: string;          // human-readable name (project name, user email, etc.)
  description?:  string;          // free-text summary of what happened
  changes?:      IChanges;        // field-level diff from diffChanges()
  metadata?:     Record<string, unknown>; // any extra context (counts, errors, etc.)
}

// ─── logAudit ────────────────────────────────────────────────────────────────
// Creates an AuditLog document in MongoDB.
// Fire-and-forget: the Promise is not awaited, and any write errors are only logged
// to the console — they never propagate to the caller or interrupt the request.
export function logAudit(
  req: Request | AuthRequest,
  opts: LogAuditOptions
): void {
  // req.user is only present on AuthRequest (protected routes); fall back to "system"
  const user = (req as AuthRequest).user;

  const entry = {
    userId:       user?.id ?? null,
    userName:     user?.email ?? "system",
    userRole:     user?.role ?? "system",
    action:       opts.action,
    resource:     opts.resource,
    resourceId:   opts.resourceId ?? null,
    resourceName: opts.resourceName ?? "",
    description:  opts.description ?? "",
    changes:      opts.changes ?? {},
    // x-forwarded-for contains the real client IP when behind a proxy/load balancer;
    // take only the first IP in case of a chain of proxies ("1.2.3.4, 10.0.0.1")
    ipAddress:    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
                    ?? req.socket?.remoteAddress
                    ?? "",
    userAgent:    req.headers["user-agent"] ?? "",
    metadata:     opts.metadata ?? {},
  };

  // Deliberately not awaited — audit failure must never break the request
  AuditLog.create(entry).catch((err) =>
    console.error("[AuditLog] Failed to write log:", err)
  );
}
