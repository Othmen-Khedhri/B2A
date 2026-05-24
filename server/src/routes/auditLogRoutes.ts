// ─── Audit log routes ─────────────────────────────────────────────────────────
// Mounted at: /api/audit-logs
//
// The audit log records every significant write action in the system:
// creating/updating/deleting staff, projects, clients, imports, etc.
// Each AuditLog document captures who did what, on which resource, when,
// and what changed (before/after diff for updates).
//
// Both endpoints are ADMIN-ONLY because the audit trail contains potentially
// sensitive data (HR actions, financial changes). Regular users and managers
// cannot access this data.
//
// IMPORTANT: The named /stats route must be declared before the plain / route
// to prevent Express from routing "stats" as a query string to the list handler.
// (Though both are GET on different paths, ordering is still best practice here.)
//
// Endpoint summary:
//
//   GET /stats   — aggregate dashboard for the audit page:
//                  action counts (create/update/delete), top-10 resources by
//                  activity, daily activity chart for the last 30 days, total count.
//                  Runs 4 parallel MongoDB aggregations.
//                  Handled by auditLogController.getAuditStats().
//
//   GET /        — paginated list of audit log entries, filterable by:
//                  action, resourceType, actorId, resourceId, date range, text search.
//                  Inputs are sanitized with sanitizeStr() to prevent NoSQL injection.
//                  Handled by auditLogController.getAuditLogs().

import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware";
import { getAuditLogs, getAuditStats } from "../controllers/auditLogController";

const router = Router();

// Both routes are admin-only — audit data is sensitive.
// /stats must come before / (root) so Express routes it correctly.
router.get("/stats", protect, authorize("admin"), getAuditStats);
router.get("/",      protect, authorize("admin"), getAuditLogs);

export default router;
