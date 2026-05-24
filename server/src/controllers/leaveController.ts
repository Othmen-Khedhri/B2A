// ─── Leave controller ─────────────────────────────────────────────────────────
// CRUD for the Leave collection (approved leave records per expert).
// Leave types: "Annuel" (annual), "Maladie" (sick), "Exceptionnel" (special)
//
//   GET    /api/leaves           — list leaves (filterable by month and/or expertId)
//   POST   /api/leaves           — create a leave record
//   PUT    /api/leaves/:id       — update a leave record
//   DELETE /api/leaves/:id       — delete a leave record

import { Response } from "express";
import Leave from "../models/Leave";
import { AuthRequest } from "../middleware/authMiddleware";
import { logAudit, diffChanges } from "../utils/auditLogger";

// ─── GET /api/leaves ──────────────────────────────────────────────────────────
// Returns leave records sorted by start date (ascending).
// Optional filters:
//   month    — "YYYY-MM" string; returns all leaves that overlap that calendar month
//              (a leave spanning Nov 28 – Dec 3 appears in both November and December)
//   expertId — show only one expert's leaves
export const getLeaves = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { month, expertId } = req.query as { month?: string; expertId?: string };

    const filter: Record<string, unknown> = {};

    if (month) {
      const [y, m] = month.split("-").map(Number);
      // "month end" is the last second of the last day; new Date(y, m, 0) = last day of month m-1
      const monthStart = new Date(y, m - 1, 1);
      const monthEnd   = new Date(y, m, 0, 23, 59, 59);
      // Overlap condition: leave starts before month ends AND leave ends after month starts
      filter.dateStart = { $lte: monthEnd };
      filter.dateEnd   = { $gte: monthStart };
    }

    if (expertId) filter.expertId = expertId;

    const leaves = await Leave.find(filter).sort({ dateStart: 1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};

// ─── POST /api/leaves ─────────────────────────────────────────────────────────
// Creates a leave record. All fields are validated by the Leave Mongoose schema.
export const createLeave = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const leave = await Leave.create(req.body);
    logAudit(req, {
      action: "CREATE", resource: "leave",
      resourceId:   leave._id.toString(),
      resourceName: leave.expertName,
      description:  `Created leave for "${leave.expertName}" (${leave.type})`,
    });
    res.status(201).json(leave);
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

// ─── PUT /api/leaves/:id ──────────────────────────────────────────────────────
export const updateLeave = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const before = await Leave.findById(req.params.id).lean();
    const leave  = await Leave.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!leave) { res.status(404).json({ message: "Leave not found" }); return; }
    logAudit(req, {
      action: "UPDATE", resource: "leave",
      resourceId:   leave._id.toString(),
      resourceName: leave.expertName,
      description:  `Updated leave for "${leave.expertName}"`,
      changes:      before ? diffChanges(before as unknown as Record<string, unknown>, req.body) : {},
    });
    res.json(leave);
  } catch (err) {
    res.status(400).json({ message: (err as Error).message });
  }
};

// ─── DELETE /api/leaves/:id ───────────────────────────────────────────────────
export const deleteLeave = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const leave = await Leave.findByIdAndDelete(req.params.id);
    if (!leave) { res.status(404).json({ message: "Leave not found" }); return; }
    logAudit(req, {
      action: "DELETE", resource: "leave",
      resourceId:   leave._id.toString(),
      resourceName: leave.expertName,
      description:  `Deleted leave for "${leave.expertName}"`,
    });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: (err as Error).message });
  }
};
