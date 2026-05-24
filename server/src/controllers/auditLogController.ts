// ─── Audit log controller ─────────────────────────────────────────────────────
// Exposes two read-only endpoints for the admin audit trail:
//
//   GET /api/audit-logs
//       Paginated, filterable list of audit events.
//       Supports: page, limit, action, resource, userId, search (free text),
//                 dateFrom, dateTo.
//
//   GET /api/audit-logs/stats
//       Aggregate counts by action type, resource type, and daily activity
//       over the last 30 days. Used to render the Audit Log statistics charts.
//
// SECURITY NOTE: sanitizeStr() strips any value containing "$" or "."
// before it is used in a MongoDB query filter. This prevents NoSQL injection
// attacks where an attacker sends {"action": {"$ne": null}} as a query param.

import { Response } from "express";
import mongoose from "mongoose";
import AuditLog from "../models/AuditLog";
import { AuthRequest } from "../middleware/authMiddleware";

// ─── sanitizeStr ──────────────────────────────────────────────────────────────
// Validates string query parameters before using them in MongoDB filters.
// Returns null if the value is empty, contains "$" (MongoDB operator prefix),
// or contains "." (dot-notation path traversal).
// Returning null means the filter key is simply not added — not an error.
function sanitizeStr(val: unknown): string | null {
  if (!val) return null;
  const s = String(val).trim();
  // "$" prefix is how MongoDB operators work (e.g. $ne, $regex, $gt)
  // "." allows dot-notation to traverse nested fields — both are injection vectors
  if (s.includes("$") || s.includes(".")) return null;
  return s || null;
}

// ─── GET /api/audit-logs ──────────────────────────────────────────────────────
// Returns a paginated list of audit log entries, newest first.
// Query parameters:
//   page     — page number (default 1)
//   limit    — records per page, clamped to [1, 100] (default 20)
//   action   — exact match (e.g. "CREATE", "DELETE", "LOGIN")
//   resource — exact match (e.g. "project", "expert")
//   userId   — must be a valid MongoDB ObjectId string
//   search   — free-text search across userName, description, and resourceName
//   dateFrom — ISO date string, inclusive lower bound on createdAt
//   dateTo   — ISO date string, inclusive upper bound on createdAt
export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Parse and clamp pagination params to prevent abuse (e.g. limit=999999)
    const page    = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit   = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 20))));
    const skip    = (page - 1) * limit;

    // Build the MongoDB filter object incrementally — only add a key if a value was provided
    const filter: Record<string, unknown> = {};

    // Sanitize and add action/resource filters (exact match)
    const actionVal   = sanitizeStr(req.query.action);
    const resourceVal = sanitizeStr(req.query.resource);
    if (actionVal)   filter.action   = actionVal;
    if (resourceVal) filter.resource = resourceVal;

    // userId must be a valid ObjectId — reject bad formats early
    if (req.query.userId) {
      try {
        filter.userId = new mongoose.Types.ObjectId(String(req.query.userId));
      } catch {
        res.status(400).json({ message: "Invalid userId format" });
        return;
      }
    }

    // Date range filter on the createdAt field
    if (req.query.dateFrom || req.query.dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (req.query.dateFrom) dateFilter.$gte = new Date(String(req.query.dateFrom));
      if (req.query.dateTo)   dateFilter.$lte = new Date(String(req.query.dateTo));
      filter.createdAt = dateFilter;
    }

    // Free-text search: $or matches any of three string fields using case-insensitive regex
    if (req.query.search) {
      const rx = { $regex: String(req.query.search), $options: "i" };
      filter.$or = [
        { userName:     rx },
        { description:  rx },
        { resourceName: rx },
      ];
    }

    // Run the data query and the count query in parallel to avoid serial round-trips
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      logs,
      total,
      page,
      pages: Math.ceil(total / limit), // total pages for frontend pagination UI
    });
  } catch (err) {
    console.error("getAuditLogs error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/audit-logs/stats ────────────────────────────────────────────────
// Returns summary statistics for the audit log charts panel.
// Runs four aggregation pipelines in parallel:
//   actionCounts  — { _id: "CREATE", count: 42 } sorted by count desc
//   resourceCounts— { _id: "project", count: 15 } sorted by count desc
//   daily         — activity per day for the last 30 days (for the activity chart)
//   total         — total number of audit events ever recorded
export const getAuditStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Calculate the cutoff date for the 30-day activity window
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [actionCounts, resourceCounts, daily, total] = await Promise.all([
      // How many events of each action type (CREATE, UPDATE, DELETE, LOGIN, etc.)
      AuditLog.aggregate([
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // How many events per resource type (project, expert, budget, etc.)
      AuditLog.aggregate([
        { $group: { _id: "$resource", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      // Daily activity count over last 30 days — used for the activity bar chart
      // $dateToString formats the date as "YYYY-MM-DD" for grouping
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: since30d } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } }, // ascending so the chart renders left-to-right chronologically
      ]),
      AuditLog.countDocuments(),
    ]);

    res.json({ total, actionCounts, resourceCounts, daily });
  } catch (err) {
    console.error("getAuditStats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
