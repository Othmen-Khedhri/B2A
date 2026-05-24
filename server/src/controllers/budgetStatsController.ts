// ─── Budget stats controller ──────────────────────────────────────────────────
// Provides the Overview page's budget health summary panel.
//
//   GET /api/dashboard/budget-stats/:year
//
// What it returns:
//   - Total internal budget vs client budget (annual hours) across all clients
//   - Year-to-date consumed hours and client gain (billed - consumed)
//   - Health breakdown (green/yellow/red client counts)
//   - Current-month stats: total hours logged, timesheet submission status

import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import AnnualBudget from "../models/AnnualBudget";
import Timesheet from "../models/Timesheet";
import Expert from "../models/Expert";

// ─── GET /api/dashboard/budget-stats/:year ────────────────────────────────────
// Aggregates budget health data for the given year from AnnualBudget + Timesheet.
//
// Health thresholds (same as paceIndexController):
//   avgPace > 1.00  → red    (over-consuming)
//   avgPace > 0.85  → yellow (at risk)
//   otherwise        → green  (on track)
//
// The four parallel queries minimise latency:
//   - budgets      : all client budgets for the year
//   - sheets       : all timesheets for the year (to compute consumed hours)
//   - allCollabs   : all collaborators + workers (for submission tracking)
//   - submittedThisMonth: timesheets already submitted for the CURRENT month
export const getBudgetStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const year         = Number(req.params.year);
    const now          = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear  = now.getFullYear();

    const [budgets, sheets, allCollabs, submittedThisMonth] = await Promise.all([
      AnnualBudget.find({ year }).lean(),
      Timesheet.find({ year }).lean(),
      // "collaborator" and "worker" roles must submit timesheets; admins do not
      Expert.find({ role: { $in: ["collaborator", "worker"] } }).select("_id name").lean(),
      // Check submissions for the CURRENT month specifically (may differ from :year)
      Timesheet.find({ year: currentYear, month: currentMonth }).select("collabId").lean(),
    ]);

    // Build a nested map: clientName(lowercase) → month → totalConsumedHours
    // This lets us look up "how many hours were consumed for client X in month M?"
    // in O(1) rather than filtering sheets on every iteration.
    const consumedMap: Record<string, Record<number, number>> = {};
    for (const sheet of sheets) {
      for (const entry of sheet.entries) {
        const cn = entry.clientName.toLowerCase();
        const m  = new Date(entry.date).getMonth() + 1;
        if (!consumedMap[cn]) consumedMap[cn] = {};
        consumedMap[cn][m] = (consumedMap[cn][m] || 0) + entry.hours;
      }
    }

    // Portfolio-level accumulators
    let totalInternalBudget = 0; // sum of internalHours × 12 across all clients
    let totalClientBudget   = 0; // sum of clientHours × 12 across all clients
    let totalConsumedYTD    = 0; // sum of actual hours consumed year-to-date
    let totalClientGainYTD  = 0; // billed hours - consumed hours YTD (positive = profitable)
    let greenCount  = 0;
    let yellowCount = 0;
    let redCount    = 0;

    for (const b of budgets) {
      const cn = b.clientName.toLowerCase();
      let consumed = 0;
      let paceSum  = 0;
      let months   = 0; // number of elapsed months for this client

      for (let m = 1; m <= 12; m++) {
        const isElapsed = year < currentYear || (year === currentYear && m <= currentMonth);
        if (!isElapsed) break; // stop once we reach a future month
        consumed += consumedMap[cn]?.[m] || 0;
        if (b.internalHours > 0) paceSum += (consumedMap[cn]?.[m] || 0) / b.internalHours;
        months++;
      }

      const avgPace  = months > 0 ? paceSum / months : 0;
      // ytdBilled = how many hours the client was billed for over elapsed months
      const ytdBilled = b.clientHours * months;

      // Accumulate portfolio totals (annual figures, not YTD)
      totalInternalBudget += b.internalHours * 12;
      totalClientBudget   += b.clientHours   * 12;
      totalConsumedYTD    += consumed;
      totalClientGainYTD  += ytdBilled - consumed; // positive = consumed less than billed

      // Classify client health
      if (avgPace > 1)         redCount++;
      else if (avgPace > 0.85) yellowCount++;
      else                     greenCount++;
    }

    // Current-month timesheet submission status
    // Shows admins who still hasn't submitted so they can send a reminder
    const submittedIds      = new Set(submittedThisMonth.map((s) => String(s.collabId)));
    const pendingTimesheets = allCollabs
      .filter((c) => !submittedIds.has(String(c._id)))
      .map((c) => c.name);

    // Sum all hours logged this month across all submitted timesheets
    const sheetsThisMonth     = sheets.filter((s) => s.month === currentMonth && s.year === currentYear);
    const totalHoursThisMonth = sheetsThisMonth.reduce(
      (s, sh) => s + sh.entries.reduce((a, e) => a + e.hours, 0), 0
    );

    res.json({
      year,
      totalClients:        budgets.length,
      totalInternalBudget,
      totalClientBudget,
      totalConsumedYTD:    Math.round(totalConsumedYTD * 10) / 10,
      totalClientGainYTD:  Math.round(totalClientGainYTD * 10) / 10,
      healthSummary:       { green: greenCount, yellow: yellowCount, red: redCount },
      currentMonth: {
        month:            currentMonth,
        year:             currentYear,
        totalHours:       Math.round(totalHoursThisMonth * 10) / 10,
        submittedCount:   submittedThisMonth.length,
        totalCollabs:     allCollabs.length,
        pendingTimesheets, // list of names who haven't submitted yet
      },
    });
  } catch (err) {
    console.error("getBudgetStats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
