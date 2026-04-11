import Expert from "../models/Expert";
import TimeEntry from "../models/TimeEntry";
import Project from "../models/Project";

export const recalcExpertLoads = async (): Promise<void> => {
  const projectCount = await Project.countDocuments();
  if (projectCount === 0) {
    await Expert.updateMany({}, { $set: { currentLoad: 0 } });
    return;
  }

  const totals = await TimeEntry.aggregate([
    { $lookup: { from: "projects", localField: "projectId", foreignField: "_id", as: "project" } },
    { $match: { project: { $ne: [] } } },
    { $group: { _id: "$expertId", totalHours: { $sum: "$hours" } } },
  ]);

  const bulk = [] as Parameters<typeof Expert.bulkWrite>[0];

  // Reset all loads to avoid stale values for experts with no entries.
  bulk.push({
    updateMany: {
      filter: {},
      update: { $set: { currentLoad: 0 } },
    },
  });

  for (const t of totals) {
    bulk.push({
      updateOne: {
        filter: { _id: t._id },
        update: { $set: { currentLoad: Number(t.totalHours) || 0 } },
      },
    });
  }

  if (bulk.length > 0) {
    await Expert.bulkWrite(bulk);
  }
};
