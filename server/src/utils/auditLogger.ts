import { Request } from "express";
import AuditLog, { AuditAction, AuditResource, IChanges } from "../models/AuditLog";
import { AuthRequest } from "../middleware/authMiddleware";

// Fields to never include in change diffs
const SENSITIVE_FIELDS = new Set([
  "password", "resetPasswordToken", "resetPasswordExpires",
  "refreshToken", "accessToken", "__v",
]);

/**
 * Compares old vs new plain objects and returns per-field diffs,
 * excluding sensitive fields and unchanged values.
 */
export function diffChanges(
  oldDoc: Record<string, unknown>,
  newDoc: Record<string, unknown>
): IChanges {
  const changes: IChanges = {};
  const keys = new Set([...Object.keys(oldDoc), ...Object.keys(newDoc)]);

  for (const key of keys) {
    if (SENSITIVE_FIELDS.has(key)) continue;
    const oldVal = oldDoc[key];
    const newVal = newDoc[key];
    // Stringify to handle object/array equality
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = { old: oldVal ?? null, new: newVal ?? null };
    }
  }

  return changes;
}

interface LogAuditOptions {
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string | null;
  resourceName?: string;
  description?: string;
  changes?: IChanges;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget audit log entry. Never throws — all errors are swallowed
 * so a logging failure never breaks the main request flow.
 */
export function logAudit(
  req: Request | AuthRequest,
  opts: LogAuditOptions
): void {
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
    ipAddress:    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
                    ?? req.socket?.remoteAddress
                    ?? "",
    userAgent:    req.headers["user-agent"] ?? "",
    metadata:     opts.metadata ?? {},
  };

  // Fire and forget
  AuditLog.create(entry).catch((err) =>
    console.error("[AuditLog] Failed to write log:", err)
  );
}
