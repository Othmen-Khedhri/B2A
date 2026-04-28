import Expert from "../models/Expert";
import Timesheet from "../models/Timesheet";

const BURNOUT_LOAD_THRESHOLD = 160;

export const recalcExpertLoads = async (): Promise<void> => {
  const now          = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear  = now.getFullYear();

  // Sum hours per collab from this month's timesheets
  const sheets = await Timesheet.find({ year: currentYear, month: currentMonth })
    .select("collabId entries")
    .lean();

  const hoursMap = new Map<string, number>();
  for (const sheet of sheets) {
    const total = sheet.entries.reduce((s, e) => s + e.hours, 0);
    hoursMap.set(String(sheet.collabId), total);
  }

  // Sum all-time hours per collab across all timesheets
  const allSheets = await Timesheet.find().select("collabId entries").lean();
  const totalMap  = new Map<string, number>();
  for (const sheet of allSheets) {
    const id    = String(sheet.collabId);
    const total = sheet.entries.reduce((s, e) => s + e.hours, 0);
    totalMap.set(id, (totalMap.get(id) || 0) + total);
  }

  const experts = await Expert.find({}).select("_id burnoutFlags").lean();

  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const bulk: Parameters<typeof Expert.bulkWrite>[0] = [];

  for (const expert of experts) {
    const id          = expert._id.toString();
    const hours       = hoursMap.get(id) ?? 0;
    const total       = totalMap.get(id) ?? 0;
    const overThreshold = hours > BURNOUT_LOAD_THRESHOLD;

    const alreadyFlagged  = expert.burnoutFlags?.flagged === true;
    const flaggedAt       = expert.burnoutFlags?.flaggedAt;
    const flaggedLastMonth =
      alreadyFlagged &&
      flaggedAt != null &&
      new Date(flaggedAt) >= startOfLastMonth &&
      new Date(flaggedAt) < startOfThisMonth;

    let burnoutUpdate: Record<string, unknown>;

    if (overThreshold) {
      const reasons = ["overload"];
      if (flaggedLastMonth) reasons.push("consecutive overload");
      burnoutUpdate = {
        currentLoad:              hours,
        totalHours:               total,
        "burnoutFlags.flagged":   true,
        "burnoutFlags.reasons":   reasons,
        "burnoutFlags.flaggedAt": flaggedLastMonth ? flaggedAt : now,
      };
    } else {
      burnoutUpdate = {
        currentLoad:             hours,
        totalHours:              total,
        "burnoutFlags.flagged":  false,
        "burnoutFlags.reasons":  [],
      };
    }

    bulk.push({
      updateOne: {
        filter: { _id: expert._id },
        update: { $set: burnoutUpdate },
      },
    });
  }

  if (bulk.length > 0) await Expert.bulkWrite(bulk);
};
