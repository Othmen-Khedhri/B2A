// ─── Dashboard controller ─────────────────────────────────────────────────────
// Two endpoints that power the Overview page and the Header bell icon:
//
//   GET /api/dashboard/stats          — full KPI payload for the Overview page
//   GET /api/dashboard/notifications  — alert counts for the bell icon

import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware";
import Project from "../models/Project";
import Expert from "../models/Expert";
import TimeEntry from "../models/TimeEntry";
import AnnualBudget from "../models/AnnualBudget";
import Timesheet from "../models/Timesheet";

// Sentinel value used in timesheet entries for internal (non-client) work
const INTERNAL_CLIENT = "__internal__";

// ─── ClientSummary type ───────────────────────────────────────────────────────
// One record per client per year, computed from AnnualBudget + Timesheet data
interface ClientSummary {
  clientName:      string;
  primaryCollab:   string;
  secondaryCollab: string;
  internalHours:   number;  // B2A's internal estimated hours per month
  clientHours:     number;  // hours billed to the client per month
  financialBudget: number;  // total contract value in TND
  totalConsumed:   number;  // hours consumed YTD
  ytdClientGain:   number;  // YTD billed hours − YTD consumed hours (positive = profitable)
  avgPace:         number;  // average monthly consumption ratio vs internal budget
  health:          "green" | "yellow" | "red"; // traffic light status
}

// ─── computeClientSummaries ───────────────────────────────────────────────────
// Builds a ClientSummary for every client in the annual budget for the given year.
// Reads from AnnualBudget (monthly targets) + Timesheet (actual hours logged).
async function computeClientSummaries(year: number): Promise<ClientSummary[]> {
  // Fetch budget targets and all timesheets for this year in parallel
  const [budgets, sheets] = await Promise.all([
    AnnualBudget.find({ year }).lean(),
    Timesheet.find({ year }).lean(),
  ]);

  // Build: clientName(lower) → month → total consumed hours
  const consumedMap: Record<string, Record<number, number>> = {};
  for (const sheet of sheets) {
    for (const entry of sheet.entries) {
      if (entry.clientName === INTERNAL_CLIENT) continue; // skip internal work
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

    // Only include months that have actually passed (don't count future months)
    for (let m = 1; m <= 12; m++) {
      const isElapsed = year < currentYear || (year === currentYear && m <= currentMonth);
      if (!isElapsed) break;
      totalConsumed += consumed[m] || 0;
      elapsedMonths++;
      if (b.internalHours > 0) paceSum += (consumed[m] || 0) / b.internalHours;
    }

    const avgPace       = elapsedMonths > 0 ? paceSum / elapsedMonths : 0;
    // ytdClientGain = what the client was billed for vs what was actually consumed
    // Positive = we worked fewer hours than billed → profitable
    const ytdClientGain = elapsedMonths * b.clientHours - totalConsumed;

    // Traffic light: red = over 100% pace, yellow = 85–100%, green = below 85%
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

// ─── avgCollabRate ────────────────────────────────────────────────────────────
// Parses a pipe-separated collaborator list and averages their hourly rates.
// Used to estimate costConsumed for each project on the fly.
const avgCollabRate = (collaboratorsRaw: string, rateByName: Map<string, number>): number => {
  const names = (collaboratorsRaw || "")
    .split(/[|,;]+/)
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);
  if (names.length === 0) return 0;
  const rates = names.map((n) => rateByName.get(n) || 0);
  return rates.reduce((a, b) => a + b, 0) / rates.length;
};

// ─── recomputeLiveMetrics ─────────────────────────────────────────────────────
// Recalculates costConsumed, paceIndex, grossMargin, etc. for ALL projects.
// Called before every getStats request so the dashboard always shows fresh data.
// Uses bulkWrite for efficiency (one DB round-trip for all projects).
const recomputeLiveMetrics = async (): Promise<void> => {
  const now = Date.now();

  // Build name → rate lookup once so we don't query Expert for each project
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

    // Clamp elapsed ratio: 5% minimum prevents insane pace values on day 1
    const elapsedRatio = totalMs > 0
      ? Math.min(Math.max((now - new Date(p.startDate).getTime()) / totalMs, 0.05), 1)
      : 1;

    const hoursConsumed  = Number(p.hoursConsumed) || 0;
    const budgetHours    = Number(p.budgetHours)   || 0;
    const budgetCost     = Number(p.budgetCost)    || 0;

    const rate           = avgCollabRate((p as { collaboratorsRaw?: string }).collaboratorsRaw || "", rateByName);
    const costConsumed   = hoursConsumed * rate;
    const invoicedAmount = Number((p as { invoicedAmount?: number }).invoicedAmount) || 0;

    // paceIndex = normalised burn rate; 1.0 = on pace, capped at 5 to avoid chart distortion
    const paceIndexHours = budgetHours > 0 ? Math.min((hoursConsumed / budgetHours) / elapsedRatio, 5) : 0;
    const paceIndexCost  = budgetCost  > 0 ? Math.min((costConsumed  / budgetCost)  / elapsedRatio, 5) : 0;

    // Prefer actual billing for margin; fall back to budget when no invoicing data
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

// ─── GET /api/dashboard/stats ─────────────────────────────────────────────────
// Returns the full analytics payload for the Overview page.
// Runs recomputeLiveMetrics() first so pace values are always fresh.
export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
  // Don't attempt DB queries if the connection is not ready
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ message: "Database not connected" });
    return;
  }
  try {
    // Refresh all project metrics before reading — ensures consistency
    await recomputeLiveMetrics();

    // Run all independent DB queries in parallel for maximum performance
    const [
      totalProjects,
      activeProjects,
      overBudgetProjects,    // paceIndexHours > 1.2 = burning
      atRiskProjects,        // paceIndexHours between 1.0 and 1.2 = at risk
      totalStaff,
      burnoutRiskCount,
      projectsByStatus,      // count grouped by status (active/completed/etc.)
      topByPaceIndex,        // top 5 most over-budget active projects
      recentTimeEntries,     // hours logged per month over the last 6 months
      ,                      // placeholders — replaced by computeClientSummaries below
      ,
      rentByManager,         // profitability grouped by responsible partner
      heuresCollab,          // hours per collaborator with validation rates
      pendingAlerts,         // collaborators with most pending timesheet entries
      anomalies,             // most recent rejected timesheet entries
    ] = await Promise.all([
      Project.countDocuments(),
      Project.countDocuments({ status: "active" }),
      Project.countDocuments({ paceIndexHours: { $gt: 1.2 } }),
      Project.countDocuments({ paceIndexHours: { $gte: 1.0, $lte: 1.2 } }),
      Expert.countDocuments(),
      Expert.countDocuments({ "burnoutFlags.flagged": true }),

      // Group projects by status to build the status distribution pie chart
      Project.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $project: { status: "$_id", count: 1, _id: 0 } },
      ]),

      // Top 5 active projects ordered by pace (highest burn rate first)
      Project.find({ status: "active" })
        .sort({ paceIndexHours: -1 })
        .limit(5)
        .select("name clientName paceIndexHours paceIndexCost status budgetHours hoursConsumed")
        .lean(),

      // Hours logged per month, last 6 months — powers the "Hours Per Month" chart
      TimeEntry.aggregate([
        { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$date" } }, totalHours: { $sum: "$hours" } } },
        { $sort: { _id: -1 } },
        { $limit: 6 },
      ]),

      Promise.resolve([]), // placeholder for top10Rentable
      Promise.resolve([]), // placeholder for top10Depassement

      // Profitability per responsible partner — powers the "Rentabilité par Manager" section
      Project.aggregate([
        { $match: { responsiblePartnerName: { $ne: "" } } },
        {
          $group: {
            _id:                "$responsiblePartnerName",
            nbProjets:          { $sum: 1 },
            budgetTotal:        { $sum: "$budgetCost" },
            coutTotal:          { $sum: "$costConsumed" },
            margeTotal:         { $sum: "$grossMargin" },
            projetsDepassement: { $sum: { $cond: [{ $gt: ["$paceIndexHours", 1] }, 1, 0] } },
          },
        },
        {
          $project: {
            manager: "$_id", _id: 0,
            nbProjets: 1, budgetTotal: 1, coutTotal: 1, margeTotal: 1, projetsDepassement: 1,
            // rentMoy = average margin percentage across the manager's portfolio
            rentMoy: {
              $cond: [{ $gt: ["$budgetTotal", 0] },
                { $multiply: [{ $divide: ["$margeTotal", "$budgetTotal"] }, 100] }, 0],
            },
            // tauxDep = percentage of projects that are over-budget
            tauxDep: {
              $cond: [{ $gt: ["$nbProjets", 0] },
                { $multiply: [{ $divide: ["$projetsDepassement", "$nbProjets"] }, 100] }, 0],
            },
          },
        },
        { $sort: { rentMoy: -1 } },
      ]),

      // Hours per collaborator with breakdown by validation status
      TimeEntry.aggregate([
        {
          $group: {
            _id:            "$expertId",
            expertName:     { $first: "$expertName" },
            totalHours:     { $sum: "$hours" },
            validatedHours: { $sum: { $cond: [{ $eq: ["$validationStatus", "validated"] }, "$hours", 0] } },
            pendingCount:   { $sum: { $cond: [{ $eq: ["$validationStatus", "pending"] }, 1, 0] } },
            rejectedCount:  { $sum: { $cond: [{ $eq: ["$validationStatus", "rejected"] }, 1, 0] } },
          },
        },
        // Join with users collection to get level and department
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "expert" } },
        { $unwind: { path: "$expert", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            expertName: 1,
            level:      { $ifNull: ["$expert.level", "—"] },
            department: { $ifNull: ["$expert.department", "—"] },
            totalHours: 1, validatedHours: 1, pendingCount: 1, rejectedCount: 1,
            // txValidation = validated hours ÷ total hours as percentage
            txValidation: {
              $cond: [{ $gt: ["$totalHours", 0] },
                { $multiply: [{ $divide: ["$validatedHours", "$totalHours"] }, 100] }, 0],
            },
          },
        },
        { $sort: { totalHours: -1 } },
      ]),

      // Pending timesheet alerts — staff with the most unvalidated entries
      TimeEntry.aggregate([
        { $match: { validationStatus: "pending" } },
        {
          // First group by (expertId, period) to count periods and entries
          $group: {
            _id: {
              expertId: "$expertId",
              period:   { $dateToString: { format: "%Y-%m", date: "$date" } },
            },
            expertName: { $first: "$expertName" },
            nbEntries:  { $sum: 1 },
          },
        },
        {
          // Then group by expertId to get the full picture per collaborator
          $group: {
            _id:          "$_id.expertId",
            expertName:   { $first: "$expertName" },
            nbPeriods:    { $sum: 1 },
            totalPending: { $sum: "$nbEntries" },
            periods:      { $push: "$_id.period" }, // list of pending months
          },
        },
        { $sort: { totalPending: -1 } },
        { $limit: 30 },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "expert" } },
        { $unwind: { path: "$expert", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            expertName: 1, nbPeriods: 1, totalPending: 1, periods: 1,
            department: { $ifNull: ["$expert.department", "—"] },
          },
        },
      ]),

      // Most recent rejected entries — shown as anomalies at the bottom of the page
      TimeEntry.find({ validationStatus: "rejected" })
        .sort({ date: -1 })
        .limit(50)
        .select("expertName projectName date hours validationStatus")
        .lean(),
    ]);

    // Compute client pace summaries once and derive the top-10 tables from them
    const clientSummaries = await computeClientSummaries(new Date().getFullYear());

    // Top 10 most profitable clients (highest ytdClientGain)
    const top10RentableFinal = [...clientSummaries]
      .sort((a, b) => b.ytdClientGain - a.ytdClientGain)
      .slice(0, 10);

    // Top 10 worst performing clients (lowest ytdClientGain or red health)
    const top10DepassementFinal = [...clientSummaries]
      .filter((c) => c.health === "red" || c.ytdClientGain < 0)
      .sort((a, b) => a.ytdClientGain - b.ytdClientGain)
      .slice(0, 10);

    // Build supervisor portfolio stats from client summaries
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
      hoursPerMonth:    recentTimeEntries.reverse(), // reverse so months are in chronological order
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

// ─── GET /api/dashboard/notifications ────────────────────────────────────────
// Returns the four alert categories shown in the Header bell icon.
// Polled every 5 minutes by the frontend.
export const getNotifications = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [overBudget, burnoutStaff, pendingEntries, atRisk] = await Promise.all([
      // Projects that are actively burning budget (pace > 1.2)
      Project.find({ paceIndexHours: { $gt: 1.2 } })
        .sort({ paceIndexHours: -1 })
        .limit(5)
        .select("_id name clientName paceIndexHours")
        .lean(),

      // All staff currently flagged for burnout (> 160h/month)
      Expert.find({ "burnoutFlags.flagged": true })
        .select("_id name burnoutFlags")
        .lean(),

      // Pending timesheet entries grouped by expert — gives the count + top 3 names
      TimeEntry.aggregate([
        { $match: { validationStatus: "pending" } },
        { $group: { _id: "$expertId", expertName: { $first: "$expertName" }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Projects in the yellow zone (pace between 1.0 and 1.2 = at risk)
      Project.find({ paceIndexHours: { $gt: 1.0, $lte: 1.2 } })
        .sort({ paceIndexHours: -1 })
        .limit(5)
        .select("_id name clientName paceIndexHours")
        .lean(),
    ]);

    // Total count of pending entries across all experts
    const pendingCount = pendingEntries.reduce((s: number, e: { count: number }) => s + e.count, 0);
    // Top 3 experts with the most pending entries (shown in the bell dropdown)
    const topExperts   = (pendingEntries as { expertName: string; count: number }[])
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
