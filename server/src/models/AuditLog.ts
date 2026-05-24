// ─── AuditLog model ───────────────────────────────────────────────────────────
// Immutable event log for all user-initiated actions in the system.
// Created by logAudit() in auditLogger.ts — never modified after creation.
//
// Key design decisions:
//   - updatedAt is disabled (createdAt only) — audit logs must not be mutable
//   - A 365-day TTL index auto-expires old records — MongoDB's TTL mechanism
//     periodically scans and deletes documents where createdAt < (now - TTL)
//   - changes field uses Mixed type to allow arbitrary { field: {old, new} } diffs
//   - metadata field is a catch-all for additional structured context
//
// The changes field is produced by diffChanges() in auditLogger.ts:
//   changes: { name: { old: "Dupont", new: "Dupont-Martin" } }

import mongoose, { Document, Schema } from "mongoose";

export type AuditAction =
  | "CREATE" | "UPDATE" | "DELETE"
  | "LOGIN" | "LOGIN_FAILED" | "LOGOUT"
  | "IMPORT" | "EXPORT"
  | "EMAIL_SENT" | "PASSWORD_RESET" | "PASSWORD_FORGOT";

export type AuditResource =
  | "project" | "client" | "expert" | "leave"
  | "timeEntry" | "auth" | "import" | "paceAlert";

// Per-field change record: maps field name → { old value, new value }
export interface IChanges {
  [field: string]: { old: unknown; new: unknown };
}

export interface IAuditLog extends Document {
  userId:       mongoose.Types.ObjectId | null;
  userName:     string;     // email or "system" for background processes
  userRole:     string;
  action:       AuditAction;
  resource:     AuditResource;
  resourceId:   string | null;  // MongoDB ID of the affected document
  resourceName: string;         // human-readable name for display in the audit table
  description:  string;         // free-text summary (e.g. 'Updated project "Cabinet Dupont"')
  changes:      IChanges;       // field-level diff from diffChanges()
  ipAddress:    string;         // from x-forwarded-for or req.ip
  userAgent:    string;         // browser/client identifier
  metadata:     Record<string, unknown>; // extra context (import stats, alert details, etc.)
  createdAt:    Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId:       { type: Schema.Types.ObjectId, ref: "Expert", default: null },
    userName:     { type: String, default: "system" },
    userRole:     { type: String, default: "system" },
    action:       { type: String, required: true },
    resource:     { type: String, required: true },
    resourceId:   { type: String, default: null },
    resourceName: { type: String, default: "" },
    description:  { type: String, default: "" },
    changes:      { type: Schema.Types.Mixed, default: {} },
    ipAddress:    { type: String, default: "" },
    userAgent:    { type: String, default: "" },
    metadata:     { type: Schema.Types.Mixed, default: {} },
  },
  {
    // Only add createdAt — no updatedAt because audit logs are immutable
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
// TTL: MongoDB automatically deletes documents after 365 days.
// This keeps the collection bounded and compliant with data retention policies.
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Query indexes for the audit log filter panel
auditLogSchema.index({ action:    1 });   // filter by action type
auditLogSchema.index({ resource:  1 });   // filter by resource type
auditLogSchema.index({ userId:    1 });   // filter by user
auditLogSchema.index({ createdAt: -1 });  // default sort (newest first)
auditLogSchema.index({ userName:  1 });   // free-text search by user name

export default mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
