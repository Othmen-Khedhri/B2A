import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware";
import Project from "../models/Project";
import Expert from "../models/Expert";
import TimeEntry from "../models/TimeEntry";

// Build name → coutHoraire map from all experts.
// Split collaboratorsRaw ("Name1 | Name2 | ...") and average the rates.
const avgCollabRate = (collaboratorsRaw: string, rateByName: Map<string, number>): number => {
  const names = (collaboratorsRaw || "")
    .split(/[|,;]+/)
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);
  if (names.length === 0) return 0;
  const rates = names.map((n) => rateByName.get(n) || 0);
  return rates.reduce((a, b) => a + b, 0) / rates.length;
};

// Recompute all cost-derived metrics live on every dashboard load.
// costConsumed = hoursConsumed × avg(coutHoraire of project collaborators).
const recomputeLiveMetrics = async (): Promise<void> => {
  const now = Date.now();

  // Build rate lookup once
  const allExperts = await Expert.find().select("name coutHoraire").lean();
  const rateByName = new Map<string, number>();
  for (const e of allExperts) {
    rateByName.set((e.name || "").trim().toLowerCase(), Number(e.coutHoraire) || 0);
  }

  const projects = await Project.find()
    .select("_id startDate endDate budgetHours budgetCost hoursConsumed invoicedAmount collaboratorsRaw")
    .lean();

  if (projects.length === 0) return;

  const ops = projects.map((p) => {
    const totalMs = new Date(p.endDate).getTime() - new Date(p.startDate).getTime();
    // Use 5% minimum elapsed to avoid extreme pace values on projects that just started
    const elapsedRatio = totalMs > 0
      ? Math.min(Math.max((now - new Date(p.startDate).getTime()) / totalMs, 0.05), 1)
      : 1;

    const hoursConsumed = Number(p.hoursConsumed) || 0;
    const budgetHours   = Number(p.budgetHours)   || 0;
    const budgetCost    = Number(p.budgetCost)     || 0;

    const rate         = avgCollabRate((p as { collaboratorsRaw?: string }).collaboratorsRaw || "", rateByName);
    const costConsumed = hoursConsumed * rate;
    const invoicedAmount = Number((p as { invoicedAmount?: number }).invoicedAmount) || 0;

    const paceIndexHours = budgetHours > 0 ? Math.min((hoursConsumed / budgetHours) / elapsedRatio, 5) : 0;
    const paceIndexCost  = budgetCost  > 0 ? Math.min((costConsumed  / budgetCost)  / elapsedRatio, 5) : 0;

    const grossMargin = invoicedAmount > 0
      ? invoicedAmount - costConsumed
      : budgetCost - costConsumed;
    const marginPercent = invoicedAmount > 0
      ? (grossMargin / invoicedAmount) * 100
      : (costConsumed > 0 && budgetCost > 0 ? (grossMargin / budgetCost) * 100 : 0);
    const effectiveCostPerHour = hoursConsumed > 0 ? costConsumed / hoursConsumed : 0;

    return {
      updateOne: {
        filter: { _id: p._id },
        update: { $set: { costConsumed, paceIndexHours, paceIndexCost, grossMargin, marginPercent, effectiveCostPerHour } },
      },
    };
  });

  await Project.bulkWrite(ops);
};

export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ message: "Database not connected" });
    return;
  }
  try {
    // Always recompute time-sensitive fields before reading stats
    await recomputeLiveMetrics();

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

      // Top 10 projects by profitability (show even when margin <= 0 to avoid empty blocks)
      Project.find({})
        .sort({ marginPercent: -1 })
        .limit(10)
        .select("name clientName type responsiblePartnerName budgetCost costConsumed grossMargin marginPercent")
        .lean(),

      // Top 10 projects actually over budget (paceIndexHours > 1.0).
      Project.find({ paceIndexHours: { $gt: 1.0 } })
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
