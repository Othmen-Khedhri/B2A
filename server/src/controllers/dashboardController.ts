import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware";
import Project from "../models/Project";
import Expert from "../models/Expert";
import TimeEntry from "../models/TimeEntry";
import AnnualBudget from "../models/AnnualBudget";
import Timesheet from "../models/Timesheet";

const INTERNAL_CLIENT = "__internal__";

interface ClientSummary {
  clientName: string;
  primaryCollab: string;
  secondaryCollab: string;
  internalHours: number;
  clientHours: number;
  financialBudget: number;
  totalConsumed: number;
  ytdClientGain: number;
  avgPace: number;
  health: "green" | "yellow" | "red";
}

async function computeClientSummaries(year: number): Promise<ClientSummary[]> {
  const [budgets, sheets] = await Promise.all([
    AnnualBudget.find({ year }).lean(),
    Timesheet.find({ year }).lean(),
  ]);

  const consumedMap: Record<string, Record<number, number>> = {};
  for (const sheet of sheets) {
    for (const entry of sheet.entries) {
      if (entry.clientName === INTERNAL_CLIENT) continue;
      const cn = entry.clientName.toLowerCase();
      const m  = new Date(entry.date).getMonth() + 1;
      if (!consumedMap[cn]) consumedMap[cn] = {};
      consumedMap[cn][m] = (consumedMap[cn][m] || 0) + entry.hours;
    }
  }

  const now          = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear  = now.getFullYear();

  return budgets.map((b) => {
    const cn = b.clientName.toLowerCase();
    const consumed = consumedMap[cn] || {};
    let totalConsumed = 0, elapsedMonths = 0, paceSum = 0;

    for (let m = 1; m <= 12; m++) {
      const isElapsed = year < currentYear || (year === currentYear && m <= currentMonth);
      if (!isElapsed) break;
      totalConsumed += consumed[m] || 0;
      elapsedMonths++;
      if (b.internalHours > 0) paceSum += (consumed[m] || 0) / b.internalHours;
    }

    const avgPace       = elapsedMonths > 0 ? paceSum / elapsedMonths : 0;
    const ytdClientGain = elapsedMonths * b.clientHours - totalConsumed;
    const health: "green" | "yellow" | "red" = avgPace > 1 ? "red" : avgPace > 0.85 ? "yellow" : "green";

    return {
      clientName:      b.clientName,
      primaryCollab:   b.primaryCollab  || "",
      secondaryCollab: b.secondaryCollab || "",
      internalHours:   b.internalHours,
      clientHours:     b.clientHours,
      financialBudget: b.financialBudget || 0,
      totalConsumed:   Math.round(totalConsumed * 10) / 10,
      ytdClientGain:   Math.round(ytdClientGain * 10) / 10,
      avgPace:         Math.round(avgPace * 100) / 100,
      health,
    };
  });
}

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
      ,  // top10Rentable — computed below
      ,  // top10Depassement — computed below
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

      // Placeholder — replaced below after single computeClientSummaries call
      Promise.resolve([]),
      Promise.resolve([]),

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

    // Compute client pace summaries once — derive top-10 lists and supervisor stats
    const clientSummaries = await computeClientSummaries(new Date().getFullYear());

    const top10RentableFinal = [...clientSummaries]
      .sort((a, b) => b.ytdClientGain - a.ytdClientGain)
      .slice(0, 10);

    const top10DepassementFinal = [...clientSummaries]
      .filter((c) => c.health === "red" || c.ytdClientGain < 0)
      .sort((a, b) => a.ytdClientGain - b.ytdClientGain)
      .slice(0, 10);

    // Group by primaryCollab to build supervisor portfolio stats
    const supervisorMap = new Map<string, {
      nbClients: number; totalClientHours: number;
      totalConsumed: number; totalYtdGain: number;
      clientsDepassement: number; paceSum: number;
    }>();

    for (const c of clientSummaries) {
      const key = c.primaryCollab || "Non assigné";
      if (!supervisorMap.has(key)) {
        supervisorMap.set(key, { nbClients: 0, totalClientHours: 0, totalConsumed: 0, totalYtdGain: 0, clientsDepassement: 0, paceSum: 0 });
      }
      const s = supervisorMap.get(key)!;
      s.nbClients++;
      s.totalClientHours += c.clientHours;
      s.totalConsumed    += c.totalConsumed;
      s.totalYtdGain     += c.ytdClientGain;
      s.paceSum          += c.avgPace;
      if (c.health === "red") s.clientsDepassement++;
    }

    const supervisorStats = Array.from(supervisorMap.entries())
      .map(([supervisor, s]) => ({
        supervisor,
        nbClients:          s.nbClients,
        totalClientHours:   Math.round(s.totalClientHours * 10) / 10,
        totalConsumed:      Math.round(s.totalConsumed    * 10) / 10,
        totalYtdGain:       Math.round(s.totalYtdGain     * 10) / 10,
        clientsDepassement: s.clientsDepassement,
        avgPace:            Math.round((s.paceSum / s.nbClients) * 100) / 100,
        tauxDep:            Math.round((s.clientsDepassement / s.nbClients) * 100),
      }))
      .sort((a, b) => b.totalYtdGain - a.totalYtdGain);

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
      top10Rentable:    top10RentableFinal,
      top10Depassement: top10DepassementFinal,
      rentByManager:    supervisorStats,
      heuresCollab,
      pendingAlerts,
      anomalies,
    });
  } catch (err) {
    console.error("getStats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * GET /api/dashboard/notifications
 * Returns real-time notification data for the Header bell icon.
 */
export const getNotifications = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [overBudget, burnoutStaff, pendingEntries, atRisk] = await Promise.all([
      // Top 5 projects where paceIndexHours > 1.2 (Burning)
      Project.find({ paceIndexHours: { $gt: 1.2 } })
        .sort({ paceIndexHours: -1 })
        .limit(5)
        .select("_id name clientName paceIndexHours")
        .lean(),

      // All staff currently flagged for burnout
      Expert.find({ "burnoutFlags.flagged": true })
        .select("_id name burnoutFlags")
        .lean(),

      // Pending timesheet count + top 3 experts
      TimeEntry.aggregate([
        { $match: { validationStatus: "pending" } },
        { $group: { _id: "$expertId", expertName: { $first: "$expertName" }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Top 5 at-risk projects (paceIndexHours between 1.0 and 1.2)
      Project.find({ paceIndexHours: { $gt: 1.0, $lte: 1.2 } })
        .sort({ paceIndexHours: -1 })
        .limit(5)
        .select("_id name clientName paceIndexHours")
        .lean(),
    ]);

    const pendingCount  = pendingEntries.reduce((s: number, e: { count: number }) => s + e.count, 0);
    const topExperts    = (pendingEntries as { expertName: string; count: number }[])
      .slice(0, 3)
      .map((e) => ({ name: e.expertName, count: e.count }));

    res.json({
      overBudget,
      pendingTimesheets: { count: pendingCount, topExperts },
      burnoutStaff,
      atRisk,
    });
  } catch (err) {
    console.error("getNotifications error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
