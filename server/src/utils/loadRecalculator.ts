// ─── Expert load recalculator ─────────────────────────────────────────────────
// Recomputes two fields on every Expert document:
//   currentLoad  — total hours worked THIS calendar month (from Timesheet entries)
//   totalHours   — lifetime hours across ALL months
//
// Also evaluates burnout risk: if currentLoad > 160h/month, the expert is flagged.
//
// Called automatically:
//   - on server startup (to recover from any crash mid-operation)
//   - after every timesheet upload or deletion
//   - after a generic file import that includes timesheet rows

import Expert from "../models/Expert";
import Timesheet from "../models/Timesheet";

// Burnout is triggered when an expert logs more than this many hours in a single month
const BURNOUT_LOAD_THRESHOLD = 160;

export const recalcExpertLoads = async (): Promise<void> => {
  const now          = new Date();
  const currentMonth = now.getMonth() + 1; // getMonth() is 0-indexed
  const currentYear  = now.getFullYear();

  // ── Step 1: Build a map of collabId → hours this month ────────────────────
  const sheets = await Timesheet.find({ year: currentYear, month: currentMonth })
    .select("collabId entries")
    .lean(); // .lean() returns plain JS objects, which is faster than Mongoose documents

  const hoursMap = new Map<string, number>();
  for (const sheet of sheets) {
    // Sum all entry hours within this month's timesheet
    const total = sheet.entries.reduce((s, e) => s + e.hours, 0);
    hoursMap.set(String(sheet.collabId), total);
  }

  // ── Step 2: Build a map of collabId → lifetime total hours ────────────────
  const allSheets = await Timesheet.find().select("collabId entries").lean();
  const totalMap  = new Map<string, number>();
  for (const sheet of allSheets) {
    const id    = String(sheet.collabId);
    const total = sheet.entries.reduce((s, e) => s + e.hours, 0);
    // Accumulate across all months for this collab
    totalMap.set(id, (totalMap.get(id) || 0) + total);
  }

  // ── Step 3: Fetch all experts to read their current burnout state ──────────
  const experts = await Expert.find({}).select("_id burnoutFlags").lean();

  // Used to check if an expert was already flagged last month (consecutive overload)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Build a bulkWrite array to update all experts in a single DB round-trip
  const bulk: Parameters<typeof Expert.bulkWrite>[0] = [];

  for (const expert of experts) {
    const id    = expert._id.toString();
    const hours = hoursMap.get(id) ?? 0;  // defaults to 0 if no timesheet this month
    const total = totalMap.get(id) ?? 0;

    const overThreshold = hours > BURNOUT_LOAD_THRESHOLD;

    const alreadyFlagged  = expert.burnoutFlags?.flagged === true;
    const flaggedAt       = expert.burnoutFlags?.flaggedAt;

    // "flagged last month" = was flagged and the flaggedAt date falls in the previous month
    const flaggedLastMonth =
      alreadyFlagged &&
      flaggedAt != null &&
      new Date(flaggedAt) >= startOfLastMonth &&
      new Date(flaggedAt) < startOfThisMonth;

    let burnoutUpdate: Record<string, unknown>;

    if (overThreshold) {
      const reasons = ["overload"]; // base reason
      if (flaggedLastMonth) reasons.push("consecutive overload"); // escalated if 2nd month in a row
      burnoutUpdate = {
        currentLoad:              hours,
        totalHours:               total,
        "burnoutFlags.flagged":   true,
        "burnoutFlags.reasons":   reasons,
        // If flagged last month, preserve the original flaggedAt date to track streak
        "burnoutFlags.flaggedAt": flaggedLastMonth ? flaggedAt : now,
      };
    } else {
      // Expert is within normal load — clear any previous burnout flags
      burnoutUpdate = {
        currentLoad:            hours,
        totalHours:             total,
        "burnoutFlags.flagged": false,
        "burnoutFlags.reasons": [],
        // Note: flaggedAt is intentionally not cleared; it serves as a historical record
      };
    }

    bulk.push({
      updateOne: {
        filter: { _id: expert._id },
        update: { $set: burnoutUpdate },
      },
    });
  }

  // One DB round-trip for all updates
  if (bulk.length > 0) await Expert.bulkWrite(bulk);
};
