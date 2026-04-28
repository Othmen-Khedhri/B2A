import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import AnnualBudget from "../models/AnnualBudget";
import Timesheet from "../models/Timesheet";
import Expert from "../models/Expert";

// ─── GET /api/dashboard/budget-stats/:year ────────────────────────────────────
// Returns overview panel data for the Overview page
export const getBudgetStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const year         = Number(req.params.year);
    const now          = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear  = now.getFullYear();

    const [budgets, sheets, allCollabs, submittedThisMonth] = await Promise.all([
      AnnualBudget.find({ year }).lean(),
      Timesheet.find({ year }).lean(),
      Expert.find({ role: { $in: ["collaborator", "worker"] } }).select("_id name").lean(),
      Timesheet.find({ year: currentYear, month: currentMonth }).select("collabId").lean(),
    ]);

    // Build consumed map: clientName(lower) → month → hours
    const consumedMap: Record<string, Record<number, number>> = {};
    for (const sheet of sheets) {
      for (const entry of sheet.entries) {
        const cn = entry.clientName.toLowerCase();
        const m  = new Date(entry.date).getMonth() + 1;
        if (!consumedMap[cn]) consumedMap[cn] = {};
        consumedMap[cn][m] = (consumedMap[cn][m] || 0) + entry.hours;
      }
    }

    let totalInternalBudget = 0;
    let totalClientBudget   = 0;
    let totalConsumedYTD    = 0;
    let totalClientGainYTD  = 0;
    let greenCount  = 0;
    let yellowCount = 0;
    let redCount    = 0;

    for (const b of budgets) {
      const cn = b.clientName.toLowerCase();
      let consumed = 0;
      let paceSum  = 0;
      let months   = 0;

      for (let m = 1; m <= 12; m++) {
        const isElapsed = year < currentYear || (year === currentYear && m <= currentMonth);
        if (!isElapsed) break;
        consumed += consumedMap[cn]?.[m] || 0;
        if (b.internalHours > 0) paceSum += (consumedMap[cn]?.[m] || 0) / b.internalHours;
        months++;
      }

      const avgPace = months > 0 ? paceSum / months : 0;
      const ytdBilled = b.clientHours * months;

      totalInternalBudget += b.internalHours * 12;
      totalClientBudget   += b.clientHours   * 12;
      totalConsumedYTD    += consumed;
      totalClientGainYTD  += ytdBilled - consumed;

      if (avgPace > 1) redCount++;
      else if (avgPace > 0.85) yellowCount++;
      else greenCount++;
    }

    // Timesheet submission status for current month
    const submittedIds     = new Set(submittedThisMonth.map((s) => String(s.collabId)));
    const pendingTimesheets = allCollabs.filter((c) => !submittedIds.has(String(c._id))).map((c) => c.name);

    // Total hours this month across all collabs
    const sheetsThisMonth   = sheets.filter((s) => s.month === currentMonth && s.year === currentYear);
    const totalHoursThisMonth = sheetsThisMonth.reduce((s, sh) => s + sh.entries.reduce((a, e) => a + e.hours, 0), 0);

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
        pendingTimesheets,
      },
    });
  } catch (err) {
    console.error("getBudgetStats error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
