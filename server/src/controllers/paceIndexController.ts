// ─── Pace index controller ────────────────────────────────────────────────────
// Computes per-client budget pace metrics from timesheet data.
// "Pace" here is specifically about annual client retainer budgets (AnnualBudget),
// not individual projects — this is a different view from paceController.ts.
//
//   GET /api/pace-index/:year/:clientName   — detailed pace for one client
//   GET /api/pace-index/overview/:year      — pace health summary for ALL clients
//
// Key concept:
//   Each client has a monthly hour budget: internalHours (what the firm targets)
//   and clientHours (what the client pays for).
//   paceRatio = consumed / internalHours (per month)
//   avgPace   = average paceRatio over all elapsed months
//   health:   green (≤85%), yellow (85–100%), red (>100%)

import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import AnnualBudget from "../models/AnnualBudget";
import Timesheet from "../models/Timesheet";
import Expert from "../models/Expert";

// Sentinel stored in timesheets for internal (non-client) work — skip these entries
const INTERNAL_CLIENT = "__internal__";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type MonthStatus = "good" | "warning" | "over";

interface MonthData {
  month:              number;
  monthName:          string;
  internalHours:      number;
  clientHours:        number;
  consumed:           number;
  internalGain:       number;       // internalHours - consumed (positive = under budget)
  clientGain:         number;       // clientHours - consumed (positive = profitable)
  paceRatio:          number;       // consumed / internalHours
  cumulativeConsumed: number | null; // null for future months (not yet known)
  cumulativeBilled:   number | null;
  cumulativeSurplus:  number | null;
  status:             MonthStatus;
  isPast:             boolean;
  isCurrent:          boolean;
  isFuture:           boolean;
}

// ─── GET /api/pace-index/:year/:clientName ────────────────────────────────────
// Full per-month pace breakdown for a single client.
// Used by the ClientDetail page (PaceIndex tab) to render the timeline chart.
//
// Algorithm:
//   1. Load the client's AnnualBudget (internalHours and clientHours per month)
//   2. Load all timesheets for the year and filter entries by clientName
//   3. Accumulate consumed hours per month and per collab (for the breakdown table)
//   4. Build per-month metrics: status, cumulative totals, surplus
//   5. Compute year-end projection: avgPace × internalHours × remainingMonths
//   6. Compute profit prediction: clientHours×12 - projectedYearEnd
export const getPaceIndex = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const year       = Number(req.params.year);
    const clientName = decodeURIComponent(req.params.clientName as string);

    const budget = await AnnualBudget.findOne({ year, clientName }).lean();
    if (!budget) {
      res.status(404).json({ message: "Client not found in annual budget" });
      return;
    }

    const { internalHours, clientHours } = budget;

    // Load all timesheets for the year (across all collabs)
    const sheets = await Timesheet.find({ year }).lean();

    // Build a rate map so we can compute cost per collab for the cost breakdown table
    const collabIds = [...new Set(sheets.map((s) => String(s.collabId)))];
    const experts   = await Expert.find({ _id: { $in: collabIds } }).select("_id name coutHoraire").lean();
    const rateMap   = new Map<string, number>();
    for (const e of experts) rateMap.set(String(e._id), Number(e.coutHoraire) || 0);

    // Aggregate consumed hours per month and collab costs for this specific client
    const consumedPerMonth: Record<number, number> = {};
    const collabHoursMap: Record<string, { name: string; hours: number; cost: number }> = {};

    for (const sheet of sheets) {
      const rate = rateMap.get(String(sheet.collabId)) || 0;
      for (const entry of sheet.entries) {
        if (entry.clientName === INTERNAL_CLIENT) continue; // skip internal work
        if (entry.clientName.toLowerCase() !== clientName.toLowerCase()) continue;

        const m = new Date(entry.date).getMonth() + 1;
        consumedPerMonth[m] = (consumedPerMonth[m] || 0) + entry.hours;

        // Accumulate hours and cost per collab (for the breakdown table)
        const key = String(sheet.collabId);
        if (!collabHoursMap[key]) collabHoursMap[key] = { name: sheet.collabName, hours: 0, cost: 0 };
        collabHoursMap[key].hours += entry.hours;
        collabHoursMap[key].cost  += entry.hours * rate;
      }
    }

    const collabCosts      = Object.values(collabHoursMap).sort((a, b) => b.hours - a.hours);
    const totalCostConsumed = Math.round(collabCosts.reduce((s, c) => s + c.cost, 0));

    const now          = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear  = now.getFullYear();

    // Build the 12-month timeline with cumulative running totals
    const months: MonthData[] = [];
    let runningInternalGain = 0;
    let runningClientGain   = 0;
    let cumulativeConsumed  = 0;
    let cumulativeBilled    = 0;

    // Collect monthly pace ratios for past/current months to compute avgPace
    const pastPaceValues: number[] = [];

    for (let m = 1; m <= 12; m++) {
      const consumed     = consumedPerMonth[m] || 0;
      const internalGain = internalHours - consumed;
      const clientGain   = clientHours   - consumed;

      const isPast    = year < currentYear || (year === currentYear && m < currentMonth);
      const isCurrent = year === currentYear && m === currentMonth;
      const isFuture  = year > currentYear  || (year === currentYear && m > currentMonth);

      // Month status: over = above client billing threshold, warning = between internal and client
      let status: MonthStatus = "good";
      if (consumed > clientHours)   status = "over";
      else if (consumed > internalHours) status = "warning";

      // Only accumulate running totals for elapsed and current months
      if (isPast || isCurrent) {
        runningInternalGain += internalGain;
        runningClientGain   += clientGain;
        cumulativeConsumed  += consumed;
        cumulativeBilled    += clientHours;
        // Only count in pace average if budget is set and month is past (or current with some consumption)
        if (internalHours > 0 && (isPast || consumed > 0)) {
          pastPaceValues.push(consumed / internalHours);
        }
      }

      months.push({
        month:      m,
        monthName:  MONTH_NAMES[m - 1],
        internalHours,
        clientHours,
        consumed,
        internalGain,
        clientGain,
        paceRatio:          internalHours > 0 ? consumed / internalHours : 0,
        // Null for future months — no actuals yet
        cumulativeConsumed: isPast || isCurrent ? cumulativeConsumed : null,
        cumulativeBilled:   isPast || isCurrent ? cumulativeBilled   : null,
        cumulativeSurplus:  isPast || isCurrent ? cumulativeBilled - cumulativeConsumed : null,
        status,
        isPast,
        isCurrent,
        isFuture,
      });
    }

    // Average pace across all elapsed months (1.0 = perfectly on budget)
    const avgPace = pastPaceValues.length
      ? pastPaceValues.reduce((a, b) => a + b, 0) / pastPaceValues.length
      : 0;

    // Only return past and current months (future months have no actuals)
    const projectedMonths = months.filter((m) => !m.isFuture);

    // Health traffic light: green ≤ 85%, yellow 85–100%, red > 100%
    let health: "green" | "yellow" | "red" = "green";
    if (avgPace > 1)    health = "red";
    else if (avgPace > 0.85) health = "yellow";

    // Year-end projection: extrapolate from average pace over remaining months
    const elapsedMonths    = Math.max(pastPaceValues.length, 1);
    const remainingMonths  = 12 - elapsedMonths;
    const ytdConsumed      = Object.values(consumedPerMonth).reduce((a, b) => a + b, 0);
    const projectedYearEnd = ytdConsumed + avgPace * internalHours * remainingMonths;
    const totalBudgetHours = internalHours * 12;
    const totalClientHours = clientHours   * 12;

    // Profit prediction:
    // Revenue = what the client pays for (clientHours × 12)
    // Cost    = projected total hours consumed
    // Surplus = Revenue - Cost (positive = more hours billed than consumed = profit)
    const surplusHours = Math.round((totalClientHours - projectedYearEnd) * 10) / 10;
    const surplusPct   = totalClientHours > 0
      ? Math.round((surplusHours / totalClientHours) * 1000) / 10
      : 0;
    // Convert surplus hours to TND using the financial budget rate (€/h)
    const financialRate = budget.financialBudget > 0 && totalClientHours > 0
      ? budget.financialBudget / totalClientHours
      : 0;
    const surplusTND = financialRate > 0
      ? Math.round(surplusHours * financialRate)
      : null;

    res.json({
      clientName,
      year,
      internalHours,
      clientHours,
      avgPace:          Math.round(avgPace * 100) / 100,
      health,
      ytdConsumed,
      ytdInternalGain:  runningInternalGain,
      ytdClientGain:    runningClientGain,
      projectedYearEnd: Math.round(projectedYearEnd * 10) / 10,
      totalBudgetHours,
      totalClientHours,
      totalCostConsumed,
      collabCosts: collabCosts.map((c) => ({
        name:  c.name,
        hours: Math.round(c.hours * 10) / 10,
        cost:  Math.round(c.cost),
      })),
      profitPrediction: {
        projectedYearEnd:  Math.round(projectedYearEnd * 10) / 10,
        totalClientHours,
        surplusHours,
        surplusPct,
        surplusTND,
        isProfitable: surplusHours >= 0,
      },
      months: projectedMonths, // only past + current months
    });
  } catch (err) {
    console.error("getPaceIndex error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/pace-index/overview/:year ───────────────────────────────────────
// Returns a pace health summary for every client in the annual budget for a year.
// Used by the Pace Overview page to show the table and summary stats (green/yellow/red counts).
// Lighter than getPaceIndex — doesn't compute collab breakdowns or profit projections.
export const getPaceOverview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const year = Number(req.params.year);

    const budgets = await AnnualBudget.find({ year }).lean();
    const sheets  = await Timesheet.find({ year }).lean();

    // Build a nested map: clientName (lowercase) → month → totalConsumedHours
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

    // Compute per-client summary
    const clientSummaries = budgets.map((b) => {
      const cn      = b.clientName.toLowerCase();
      const consumed = consumedMap[cn] || {};

      let totalConsumed = 0;
      let elapsedMonths = 0;
      let paceSum       = 0;

      for (let m = 1; m <= 12; m++) {
        const isElapsed = year < currentYear || (year === currentYear && m <= currentMonth);
        if (!isElapsed) break;
        totalConsumed += consumed[m] || 0;
        elapsedMonths++;
        if (b.internalHours > 0) {
          paceSum += (consumed[m] || 0) / b.internalHours;
        }
      }

      const avgPace      = elapsedMonths > 0 ? paceSum / elapsedMonths : 0;
      // ytdClientGain: positive = under budget (hours billed > hours consumed so far)
      const ytdClientGain = elapsedMonths * b.clientHours - totalConsumed;

      let health: "green" | "yellow" | "red" = "green";
      if (avgPace > 1)         health = "red";
      else if (avgPace > 0.85) health = "yellow";

      return {
        clientName:      b.clientName,
        primaryCollab:   b.primaryCollab,
        internalHours:   b.internalHours,
        clientHours:     b.clientHours,
        financialBudget: b.financialBudget,
        totalConsumed,
        ytdClientGain,
        avgPace:         Math.round(avgPace * 100) / 100,
        health,
      };
    });

    // Portfolio-level summary statistics
    const totalClients = clientSummaries.length;
    const greenCount   = clientSummaries.filter((c) => c.health === "green").length;
    const yellowCount  = clientSummaries.filter((c) => c.health === "yellow").length;
    const redCount     = clientSummaries.filter((c) => c.health === "red").length;
    const totalYtdGain = clientSummaries.reduce((s, c) => s + c.ytdClientGain, 0);

    // Sort to find best (most surplus) and worst (most deficit) client
    const bestClient  = clientSummaries.sort((a, b) => b.ytdClientGain - a.ytdClientGain)[0] ?? null;
    const worstClient = [...clientSummaries].sort((a, b) => a.ytdClientGain - b.ytdClientGain)[0] ?? null;

    res.json({
      year,
      totalClients,
      greenCount,
      yellowCount,
      redCount,
      totalYtdGain: Math.round(totalYtdGain * 10) / 10,
      bestClient:   bestClient?.clientName  ?? null,
      worstClient:  worstClient?.clientName ?? null,
      clients:      clientSummaries,
    });
  } catch (err) {
    console.error("getPaceOverview error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
