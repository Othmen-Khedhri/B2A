// ─── Affectation sync utilities ───────────────────────────────────────────────
// The Affectation collection mirrors which experts are currently assigned to
// which active projects. It is a derived / cached collection — the source of
// truth is Project.assignedStaff.
//
// Three exported functions:
//   syncProjectAffectations  — sync affectations for ONE project (called on save)
//   removeProjectAffectations — delete all records for a deleted project
//   rebuildAllAffectations   — full wipe-and-rebuild for the admin repair endpoint

import mongoose from "mongoose";
import Affectation from "../models/Affectation";
import Expert from "../models/Expert";
import Project from "../models/Project";

// ─── syncProjectAffectations ─────────────────────────────────────────────────
// Keeps the Affectation collection in sync with a single project's assignedStaff.
// Rules:
//   - Non-active projects (completed / cancelled / on-hold) have no affectations
//   - Staff removed from the project have their record deleted
//   - New staff members get an upserted record
export const syncProjectAffectations = async (projectId: string): Promise<void> => {
  const project = await Project.findById(projectId)
    .select("name clientName externalId type status assignedStaff")
    .lean();

  // If the project was deleted or is no longer active, remove all its records
  if (!project || project.status !== "active") {
    await Affectation.deleteMany({ projectId: new mongoose.Types.ObjectId(projectId) });
    return;
  }

  const assignedIds = (project.assignedStaff ?? []).map((id) => id.toString());

  if (assignedIds.length > 0) {
    // Delete records for experts that are no longer in the assignedStaff array
    await Affectation.deleteMany({
      projectId: new mongoose.Types.ObjectId(projectId),
      expertId:  { $nin: assignedIds.map((id) => new mongoose.Types.ObjectId(id)) },
    });
  } else {
    // Nobody assigned to this project — clear everything
    await Affectation.deleteMany({ projectId: new mongoose.Types.ObjectId(projectId) });
    return;
  }

  // Upsert one Affectation record per currently-assigned expert
  for (const expertId of assignedIds) {
    const expert = await Expert.findById(expertId).select("name").lean();
    if (!expert) continue; // skip if the expert was deleted

    // findOneAndUpdate with upsert:true creates if not exists, updates if it does
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

// ─── removeProjectAffectations ───────────────────────────────────────────────
// Called when a project is permanently deleted to clean up its affectation records.
export const removeProjectAffectations = async (projectId: string): Promise<void> => {
  await Affectation.deleteMany({ projectId: new mongoose.Types.ObjectId(projectId) });
};

// ─── rebuildAllAffectations ───────────────────────────────────────────────────
// Admin-only repair: wipes the entire affectations collection and rebuilds it
// from scratch based on current Project.assignedStaff values.
// Returns the count of records upserted.
export const rebuildAllAffectations = async (): Promise<number> => {
  await Affectation.deleteMany({}); // full wipe

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
