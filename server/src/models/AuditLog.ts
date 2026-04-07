import mongoose, { Document, Schema } from "mongoose";

export type AuditAction =
  | "CREATE" | "UPDATE" | "DELETE"
  | "LOGIN" | "LOGIN_FAILED" | "LOGOUT"
  | "IMPORT" | "EXPORT"
  | "EMAIL_SENT" | "PASSWORD_RESET" | "PASSWORD_FORGOT";

export type AuditResource =
  | "project" | "client" | "expert" | "leave"
  | "timeEntry" | "auth" | "import" | "paceAlert";

export interface IChanges {
  [field: string]: { old: unknown; new: unknown };
}

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId | null;
  userName: string;
  userRole: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId: string | null;
  resourceName: string;
  description: string;
  changes: IChanges;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
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
  { timestamps: { createdAt: true, updatedAt: false } }
);

// 365-day TTL — MongoDB auto-deletes documents after 1 year
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

// Query indexes
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ resource: 1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ createdAt: -1 });

export default mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
