import mongoose from "mongoose";
import Affectation from "../models/Affectation";
import Expert from "../models/Expert";
import Project from "../models/Project";

/**
 * Rebuilds the affectations collection for one project.
 *
 * Rules:
 *  - Only active projects keep affectation records.
 *  - When a project becomes completed / cancelled / on-hold, all its
 *    affectation records are deleted.
 *  - When assignedStaff changes, stale entries are removed and new ones
 *    are upserted.
 */
export const syncProjectAffectations = async (projectId: string): Promise<void> => {
  const project = await Project.findById(projectId)
    .select("name clientName externalId type status assignedStaff")
    .lean();

  // Project deleted or non-active → remove all its affectation records
  if (!project || project.status !== "active") {
    await Affectation.deleteMany({ projectId: new mongoose.Types.ObjectId(projectId) });
    return;
  }

  const assignedIds = (project.assignedStaff ?? []).map((id) => id.toString());

  // Remove records for staff no longer on this project
  if (assignedIds.length > 0) {
    await Affectation.deleteMany({
      projectId: new mongoose.Types.ObjectId(projectId),
      expertId: { $nin: assignedIds.map((id) => new mongoose.Types.ObjectId(id)) },
    });
  } else {
    // Nobody assigned → clear all
    await Affectation.deleteMany({ projectId: new mongoose.Types.ObjectId(projectId) });
    return;
  }

  // Upsert one record per assigned staff member
  for (const expertId of assignedIds) {
    const expert = await Expert.findById(expertId).select("name").lean();
    if (!expert) continue;

    await Affectation.findOneAndUpdate(
      {
        expertId:  new mongoose.Types.ObjectId(expertId),
        projectId: new mongoose.Types.ObjectId(projectId),
      },
      {
        expertId:    new mongoose.Types.ObjectId(expertId),
        expertName:  expert.name,
        projectId:   new mongoose.Types.ObjectId(projectId),
        projectName: project.name,
        clientName:  project.clientName ?? "",
        externalId:  project.externalId ?? "",
        type:        project.type ?? "",
        status:      project.status,
      },
      { upsert: true, new: true }
    );
  }
};

/**
 * Remove every affectation record that references this project.
 * Call this when a project is deleted.
 */
export const removeProjectAffectations = async (projectId: string): Promise<void> => {
  await Affectation.deleteMany({ projectId: new mongoose.Types.ObjectId(projectId) });
};

/**
 * Rebuild affectations for ALL active projects.
 * Useful as a one-time repair endpoint.
 */
export const rebuildAllAffectations = async (): Promise<number> => {
  // Wipe everything, then rebuild from scratch
  await Affectation.deleteMany({});

  const activeProjects = await Project.find({ status: "active" })
    .select("_id name clientName externalId type status assignedStaff")
    .lean();

  let upserted = 0;
  for (const project of activeProjects) {
    const assignedIds = (project.assignedStaff ?? []).map((id) => id.toString());
    for (const expertId of assignedIds) {
      const expert = await Expert.findById(expertId).select("name").lean();
      if (!expert) continue;

      await Affectation.findOneAndUpdate(
        {
          expertId:  new mongoose.Types.ObjectId(expertId),
          projectId: project._id,
        },
        {
          expertId:    new mongoose.Types.ObjectId(expertId),
          expertName:  expert.name,
          projectId:   project._id,
          projectName: project.name,
          clientName:  project.clientName ?? "",
          externalId:  project.externalId ?? "",
          type:        project.type ?? "",
          status:      project.status,
        },
        { upsert: true, new: true }
      );
      upserted++;
    }
  }
  return upserted;
};
