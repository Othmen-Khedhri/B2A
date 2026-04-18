import Expert from "../models/Expert";
import TimeEntry from "../models/TimeEntry";
import Project from "../models/Project";

const BURNOUT_LOAD_THRESHOLD = 160;

export const recalcExpertLoads = async (): Promise<void> => {
  const projectCount = await Project.countDocuments();
  if (projectCount === 0) {
    await Expert.updateMany({}, { $set: { currentLoad: 0 } });
    return;
  }

  // Only count hours for the current calendar month
  const now = new Date();
  const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth    = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const totals = await TimeEntry.aggregate([
    { $match: { date: { $gte: startOfCurrentMonth } } },
    { $lookup: { from: "projects", localField: "projectId", foreignField: "_id", as: "project" } },
    { $match: { project: { $ne: [] } } },
    { $group: { _id: "$expertId", totalHours: { $sum: "$hours" } } },
  ]);

  // Build a map for quick lookup: expertId → currentMonthHours
  const hoursMap = new Map<string, number>();
  for (const t of totals) {
    hoursMap.set(String(t._id), Number(t.totalHours) || 0);
  }

  // Fetch all experts to apply burnout logic
  const experts = await Expert.find({}).select("_id currentLoad burnoutFlags updatedAt");

  const bulk = [] as Parameters<typeof Expert.bulkWrite>[0];

  // Reset all loads first
  bulk.push({
    updateMany: {
      filter: {},
      update: { $set: { currentLoad: 0 } },
    },
  });

  for (const expert of experts) {
    const id    = expert._id.toString();
    const hours = hoursMap.get(id) ?? 0;
    const overThreshold = hours > BURNOUT_LOAD_THRESHOLD;

    // Determine if the expert was already flagged last month
    const alreadyFlagged = expert.burnoutFlags?.flagged === true;
    const flaggedAt      = expert.burnoutFlags?.flaggedAt;
    const flaggedLastMonth =
      alreadyFlagged &&
      flaggedAt != null &&
      flaggedAt >= startOfLastMonth &&
      flaggedAt < startOfCurrentMonth;

    let burnoutUpdate: Record<string, unknown>;

    if (overThreshold) {
      const reasons: string[] = ["overload"];
      if (flaggedLastMonth) reasons.push("consecutive overload");
      burnoutUpdate = {
        currentLoad: hours,
        "burnoutFlags.flagged":   true,
        "burnoutFlags.reasons":   reasons,
        "burnoutFlags.flaggedAt": flaggedLastMonth ? expert.burnoutFlags.flaggedAt : now,
      };
    } else {
      burnoutUpdate = {
        currentLoad: hours,
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

  if (bulk.length > 0) {
    await Expert.bulkWrite(bulk);
  }
};
