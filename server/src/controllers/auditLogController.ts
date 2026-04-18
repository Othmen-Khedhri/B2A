import { Response } from "express";
import mongoose from "mongoose";
import AuditLog from "../models/AuditLog";
import { AuthRequest } from "../middleware/authMiddleware";

/**
 * GET /api/audit-logs
 * Query: page, limit, action, resource, userId, search, dateFrom, dateTo
 */
/** Sanitize a string query param — reject MongoDB operators and trim whitespace. */
function sanitizeStr(val: unknown): string | null {
  if (!val) return null;
  const s = String(val).trim();
  if (s.includes("$") || s.includes(".")) return null; // reject MongoDB operators
  return s || null;
}

export const getAuditLogs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page    = Math.max(1, parseInt(String(req.query.page  ?? 1)));
    const limit   = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 20))));
    const skip    = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    const actionVal   = sanitizeStr(req.query.action);
    const resourceVal = sanitizeStr(req.query.resource);
    if (actionVal)   filter.action   = actionVal;
    if (resourceVal) filter.resource = resourceVal;
    if (req.query.userId) {
      try {
        filter.userId = new mongoose.Types.ObjectId(String(req.query.userId));
      } catch {
        res.status(400).json({ message: "Invalid userId format" });
        return;
      }
    }

    if (req.query.dateFrom || req.query.dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (req.query.dateFrom) dateFilter.$gte = new Date(String(req.query.dateFrom));
      if (req.query.dateTo)   dateFilter.$lte = new Date(String(req.query.dateTo));
      filter.createdAt = dateFilter;
    }

    if (req.query.search) {
      const rx = { $regex: String(req.query.search), $options: "i" };
      filter.$or = [
        { userName: rx },
        { description: rx },
        { resourceName: rx },
      ];
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(filter),
    ]);

    res.json({
      logs,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("getAuditLogs error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/audit-logs/stats
 * Returns action counts, resource counts, activity over last 30 days.
 */
export const getAuditStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [actionCounts, resourceCounts, daily, total] = await Promise.all([
      AuditLog.aggregate([
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.aggregate([
        { $group: { _id: "$resource", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.aggregate([
        { $match: { createdAt: { $gte: since30d } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      AuditLog.countDocuments(),
    ]);

    res.json({ total, actionCounts, resourceCounts, daily });
  } catch (err) {
    console.error("getAuditStats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
