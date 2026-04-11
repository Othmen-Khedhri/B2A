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
      top10Rentable,
      top10Depassement,
      rentByManager,
      heuresCollab,
      pendingAlerts,
      anomalies,
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
        .select("name clientName paceIndexHours paceIndexCost status budgetHours hoursConsumed")
        .lean(),

      TimeEntry.aggregate([
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, totalHours: { $sum: "$hours" } } },
        { $sort: { _id: -1 } },
        { $limit: 6 },
      ]),

      // Top 10 most profitable projects
      Project.find({ marginPercent: { $gt: 0 } })
        .sort({ marginPercent: -1 })
        .limit(10)
        .select("name clientName type responsiblePartnerName budgetCost costConsumed grossMargin marginPercent")
        .lean(),

      // Top 10 most over-budget projects
      Project.find({ paceIndexHours: { $gt: 1 } })
        .sort({ paceIndexHours: -1 })
        .limit(10)
        .select("name clientName type responsiblePartnerName budgetCost costConsumed budgetHours hoursConsumed paceIndexHours")
        .lean(),

      // Profitability grouped by responsible partner
      Project.aggregate([
        { $match: { responsiblePartnerName: { $ne: "" } } },
        {
          $group: {
            _id: "$responsiblePartnerName",
            nbProjets: { $sum: 1 },
            budgetTotal: { $sum: "$budgetCost" },
            coutTotal: { $sum: "$costConsumed" },
            margeTotal: { $sum: "$grossMargin" },
            projetsDepassement: { $sum: { $cond: [{ $gt: ["$paceIndexHours", 1] }, 1, 0] } },
          },
        },
        {
          $project: {
            manager: "$_id",
            _id: 0,
            nbProjets: 1,
            budgetTotal: 1,
            coutTotal: 1,
            margeTotal: 1,
            projetsDepassement: 1,
            rentMoy: {
              $cond: [
                { $gt: ["$budgetTotal", 0] },
                { $multiply: [{ $divide: ["$margeTotal", "$budgetTotal"] }, 100] },
                0,
              ],
            },
            tauxDep: {
              $cond: [
                { $gt: ["$nbProjets", 0] },
                { $multiply: [{ $divide: ["$projetsDepassement", "$nbProjets"] }, 100] },
                0,
              ],
            },
          },
        },
        { $sort: { rentMoy: -1 } },
      ]),

      // Hours per collaborator (from TimeEntry aggregation)
      TimeEntry.aggregate([
        {
          $group: {
            _id: "$expertId",
            expertName: { $first: "$expertName" },
            totalHours: { $sum: "$hours" },
            validatedHours: { $sum: { $cond: [{ $eq: ["$validationStatus", "validated"] }, "$hours", 0] } },
            pendingCount: { $sum: { $cond: [{ $eq: ["$validationStatus", "pending"] }, 1, 0] } },
            rejectedCount: { $sum: { $cond: [{ $eq: ["$validationStatus", "rejected"] }, 1, 0] } },
          },
        },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "expert" } },
        { $unwind: { path: "$expert", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            expertName: 1,
            level: { $ifNull: ["$expert.level", "—"] },
            department: { $ifNull: ["$expert.department", "—"] },
            totalHours: 1,
            validatedHours: 1,
            pendingCount: 1,
            rejectedCount: 1,
            txValidation: {
              $cond: [
                { $gt: ["$totalHours", 0] },
                { $multiply: [{ $divide: ["$validatedHours", "$totalHours"] }, 100] },
                0,
              ],
            },
          },
        },
        { $sort: { totalHours: -1 } },
      ]),

      // Staff with most pending timesheets — grouped by expert + period
      TimeEntry.aggregate([
        { $match: { validationStatus: "pending" } },
        {
          $group: {
            _id: {
              expertId: "$expertId",
              period: { $dateToString: { format: "%Y-%m", date: "$date" } },
            },
            expertName: { $first: "$expertName" },
            nbEntries: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: "$_id.expertId",
            expertName: { $first: "$expertName" },
            nbPeriods: { $sum: 1 },
            totalPending: { $sum: "$nbEntries" },
            periods: { $push: "$_id.period" },
          },
        },
        { $sort: { totalPending: -1 } },
        { $limit: 30 },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "expert" } },
        { $unwind: { path: "$expert", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            expertName: 1,
            nbPeriods: 1,
            totalPending: 1,
            periods: 1,
            department: { $ifNull: ["$expert.department", "—"] },
          },
        },
      ]),

      // Most recent rejected timesheets (anomalies)
      TimeEntry.find({ validationStatus: "rejected" })
        .sort({ date: -1 })
        .limit(50)
        .select("expertName projectName date hours validationStatus")
        .lean(),
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
      top10Rentable,
      top10Depassement,
      rentByManager,
      heuresCollab,
      pendingAlerts,
      anomalies,
    });
  } catch (err) {
    console.error("getStats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
