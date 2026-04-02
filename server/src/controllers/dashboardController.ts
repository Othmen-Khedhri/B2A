import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import Project from "../models/Project";
import Expert from "../models/Expert";
import TimeEntry from "../models/TimeEntry";

export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalProjects,
      activeProjects,
      overBudgetProjects,
      atRiskProjects,
      totalStaff,
      burnoutRiskCount,
      projectsByStatus,
      topByPaceIndex,
      recentTimeEntries,
    ] = await Promise.all([
      Project.countDocuments(),
      Project.countDocuments({ status: "active" }),
      Project.countDocuments({ paceIndexHours: { $gt: 1.2 } }),
      Project.countDocuments({ paceIndexHours: { $gte: 1.0, $lte: 1.2 } }),
      Expert.countDocuments(),
      Expert.countDocuments({ "burnoutFlags.flagged": true }),
      Project.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $project: { status: "$_id", count: 1, _id: 0 } },
      ]),
      Project.find({ status: "active" })
        .sort({ paceIndexHours: -1 })
        .limit(5)
        .select("name clientName paceIndexHours paceIndexCost status budgetHours hoursConsumed"),
      TimeEntry.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
            totalHours: { $sum: "$hours" },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 6 },
      ]),
    ]);

    res.json({
      totalProjects,
      activeProjects,
      overBudgetProjects,
      atRiskProjects,
      totalStaff,
      burnoutRiskCount,
      projectsByStatus,
      topByPaceIndex,
      hoursPerMonth: recentTimeEntries.reverse(),
    });
  } catch (err) {
    console.error("getStats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
