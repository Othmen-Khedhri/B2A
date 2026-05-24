// ─── Affectation controller ───────────────────────────────────────────────────
// Read-only API for the Affectation collection, plus one admin repair endpoint.
// Affectations are a derived/cached collection — the source of truth is
// Project.assignedStaff. They exist purely for fast "who is assigned where?" queries
// without needing to join the projects collection.
//
//   GET  /api/affectations             — flat list (filterable by expertId or projectId)
//   GET  /api/affectations/by-expert   — each expert with their active projects grouped
//   GET  /api/affectations/by-project  — each active project with its assigned staff
//   POST /api/affectations/rebuild     — admin: wipe and rebuild from current Project state

import { Request, Response } from "express";
import Affectation from "../models/Affectation";
import { rebuildAllAffectations } from "../utils/affectationSync";

// ─── GET /api/affectations ────────────────────────────────────────────────────
// Returns affectation records sorted by expert name then project name.
// Optional query filters:
//   expertId  — show only this expert's assignments
//   projectId — show only this project's assigned staff
export const getAffectations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { expertId, projectId } = req.query;
    const filter: Record<string, unknown> = {};
    if (expertId)  filter.expertId  = expertId;
    if (projectId) filter.projectId = projectId;

    const affectations = await Affectation.find(filter)
      .sort({ expertName: 1, projectName: 1 });
    res.json(affectations);
  } catch (err) {
    console.error("getAffectations error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/affectations/by-expert ─────────────────────────────────────────
// Returns each expert as a top-level object, with their active project assignments
// nested under a "projects" array.
// Used by the Staff page to show "this person is assigned to X, Y, Z projects".
// The $group aggregation is more efficient than fetching flat records and grouping
// on the frontend.
export const getAffectationsByExpert = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await Affectation.aggregate([
      {
        $group: {
          _id:        "$expertId",
          expertName: { $first: "$expertName" },
          projects:   {
            $push: {
              projectId:   "$projectId",
              projectName: "$projectName",
              clientName:  "$clientName",
              externalId:  "$externalId",
              type:        "$type",
              assignedAt:  "$assignedAt",
            },
          },
        },
      },
      { $sort: { expertName: 1 } }, // alphabetical for consistent rendering
    ]);
    res.json(rows);
  } catch (err) {
    console.error("getAffectationsByExpert error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/affectations/by-project ────────────────────────────────────────
// Returns each active project with the list of assigned staff nested under it.
// Used by the Projects page to show "this project has X, Y, Z people assigned".
export const getAffectationsByProject = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await Affectation.aggregate([
      {
        $group: {
          _id:         "$projectId",
          projectName: { $first: "$projectName" },
          clientName:  { $first: "$clientName" },
          externalId:  { $first: "$externalId" },
          type:        { $first: "$type" },
          staff: {
            $push: {
              expertId:   "$expertId",
              expertName: "$expertName",
              assignedAt: "$assignedAt",
            },
          },
        },
      },
      { $sort: { projectName: 1 } },
    ]);
    res.json(rows);
  } catch (err) {
    console.error("getAffectationsByProject error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST /api/affectations/rebuild ──────────────────────────────────────────
// Admin-only repair: wipes the entire affectations collection and rebuilds it
// from the current Project.assignedStaff values.
// Should only be needed after manual DB edits or import operations that bypass
// the normal project update flow (which calls syncProjectAffectations automatically).
export const rebuildAffectations = async (_req: Request, res: Response): Promise<void> => {
  try {
    const upserted = await rebuildAllAffectations();
    res.json({ message: "Affectations rebuilt", upserted });
  } catch (err) {
    console.error("rebuildAffectations error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
