import { Request, Response } from "express";
import Affectation from "../models/Affectation";
import { rebuildAllAffectations } from "../utils/affectationSync";

/** GET /api/affectations
 *  Optional query params: expertId, projectId
 */
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

/** GET /api/affectations/by-expert
 *  Returns each expert with their active projects grouped under them.
 */
export const getAffectationsByExpert = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await Affectation.aggregate([
      {
        $group: {
          _id: "$expertId",
          expertName: { $first: "$expertName" },
          projects: {
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
      { $sort: { expertName: 1 } },
    ]);
    res.json(rows);
  } catch (err) {
    console.error("getAffectationsByExpert error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/** GET /api/affectations/by-project
 *  Returns each active project with the list of assigned staff.
 */
export const getAffectationsByProject = async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await Affectation.aggregate([
      {
        $group: {
          _id: "$projectId",
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

/** POST /api/affectations/rebuild
 *  Admin-only: wipe and rebuild the entire affectations collection
 *  from the current state of active projects.
 */
export const rebuildAffectations = async (_req: Request, res: Response): Promise<void> => {
  try {
    const upserted = await rebuildAllAffectations();
    res.json({ message: "Affectations rebuilt", upserted });
  } catch (err) {
    console.error("rebuildAffectations error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
