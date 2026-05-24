// ─── Project controller ───────────────────────────────────────────────────────
// CRUD operations for the Project collection plus one admin repair endpoint.
//
//   GET    /api/projects              — list all projects (filterable)
//   GET    /api/projects/:id          — one project + related time entries and charts
//   POST   /api/projects              — create a project
//   PUT    /api/projects/:id          — update a project
//   DELETE /api/projects/:id          — delete a project + cascade-delete related data
//   POST   /api/projects/repair-data  — admin repair: re-aggregate hours from TimeEntry
//
// After every create/update, syncProjectConsistency() refreshes derived metrics
// (pace index, margin), propagates the project name to TimeEntry documents,
// and syncs the Affectation collection with the current assignedStaff list.

import { Request, Response } from "express";
import mongoose from "mongoose";
import Project from "../models/Project";
import TimeEntry from "../models/TimeEntry";
import BillingEntry from "../models/BillingEntry";
import { logAudit, diffChanges } from "../utils/auditLogger";
import { recalcExpertLoads } from "../utils/loadRecalculator";
import { removeProjectFromEstimation } from "./estimationController";
import { removeProjectAffectations } from "../utils/affectationSync";
import { syncProjectConsistency } from "../utils/projectConsistency";
import { repairProjectData } from "../utils/projectDataRepair";

// Module-level flag to prevent concurrent repair runs.
// If the DB experiences a flap (brief disconnection) during repair, Express might
// receive multiple concurrent POST /repair-data requests while the first is still
// running — the flag ensures only one repair executes at a time.
let repairInProgress = false;

// ─── GET /api/projects ────────────────────────────────────────────────────────
// Returns all projects sorted by paceIndexHours descending (most-at-risk first).
// Supports three optional query filters:
//   status  — exact match (e.g. "active", "completed", "on-hold")
//   partner — case-insensitive regex on responsiblePartnerName
//   search  — case-insensitive regex across name, clientName, and externalId
export const getProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, partner, search } = req.query;
    const filter: Record<string, unknown> = {};
    if (status)  filter.status = status;
    if (partner) filter.responsiblePartnerName = { $regex: partner, $options: "i" };
    if (search)  filter.$or = [
      { name:       { $regex: search, $options: "i" } },
      { clientName: { $regex: search, $options: "i" } },
      { externalId: { $regex: search, $options: "i" } },
    ];

    // Sort by pace so the dashboard table shows the most-at-risk projects first
    const projects = await Project.find(filter).sort({ paceIndexHours: -1 });
    res.json(projects);
  } catch (err) {
    console.error("getProjects error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/projects/:id ────────────────────────────────────────────────────
// Returns a project document plus three additional data sets used by the
// ProjectDetail page:
//   timeEntries  — the 50 most recent time entries (for the activity table)
//   staffHours   — aggregated total hours per expert (for the staff breakdown chart)
//   monthlyHours — total hours per YYYY-MM (for the timeline chart)
export const getProjectById = async (req: Request, res: Response): Promise<void> => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    // Most recent 50 entries only — the frontend shows a paginated table
    const timeEntries = await TimeEntry.find({ projectId: project._id })
      .sort({ date: -1 })
      .limit(50);

    // Aggregate total hours per expert for the staff breakdown doughnut chart
    const staffHours = await TimeEntry.aggregate([
      { $match: { projectId: project._id } },
      {
        $group: {
          _id:        "$expertId",
          expertName: { $first: "$expertName" },
          totalHours: { $sum: "$hours" },
        },
      },
      { $sort: { totalHours: -1 } }, // most-contributing expert first
    ]);

    // Monthly hours breakdown for the burn-down / timeline chart
    // $dateToString with format "%Y-%m" groups all entries in the same month together
    const monthlyHours = await TimeEntry.aggregate([
      { $match: { projectId: project._id } },
      {
        $group: {
          _id:   { $dateToString: { format: "%Y-%m", date: "$date" } },
          hours: { $sum: "$hours" },
        },
      },
      { $sort: { _id: 1 } }, // ascending so the chart renders chronologically
    ]);

    res.json({ project, timeEntries, staffHours, monthlyHours });
  } catch (err) {
    console.error("getProjectById error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST /api/projects ───────────────────────────────────────────────────────
// Creates a new project document, then immediately syncs derived fields
// (pace index, margin) and creates Affectation records for assignedStaff.
export const createProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const project = await Project.create(req.body);

    // Sync after create — no previousStatus because the project is brand new
    await syncProjectConsistency({
      projectId:   project._id.toString(),
      projectName: project.name,
      status:      project.status,
    });

    // Fire-and-forget audit trail — doesn't affect the HTTP response
    logAudit(req, {
      action: "CREATE", resource: "project",
      resourceId:   project._id.toString(),
      resourceName: project.name,
      description:  `Created project "${project.name}"`,
    });
    res.status(201).json(project);
  } catch (err) {
    console.error("createProject error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── PUT /api/projects/:id ────────────────────────────────────────────────────
// Updates a project and re-syncs all derived data.
// We read the "before" state first so diffChanges() can produce a meaningful
// change log entry in the audit trail (shows exactly which fields changed).
export const updateProject = async (req: Request, res: Response): Promise<void> => {
  try {
    // Snapshot the current state before applying changes (for audit diff)
    const before  = await Project.findById(req.params.id).lean();
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new:            true,  // return the updated document
      runValidators:  true,  // run Mongoose schema validators on update
    });
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    // Pass the previous status so syncProjectConsistency knows if we just
    // completed a project (triggers ML training) or un-completed it (removes from training)
    await syncProjectConsistency({
      projectId:      project._id.toString(),
      projectName:    project.name,
      status:         project.status,
      previousStatus: before?.status,
    });

    logAudit(req, {
      action: "UPDATE", resource: "project",
      resourceId:   project._id.toString(),
      resourceName: project.name,
      description:  `Updated project "${project.name}"`,
      changes:      before ? diffChanges(before as unknown as Record<string, unknown>, req.body) : {},
    });
    res.json(project);
  } catch (err) {
    console.error("updateProject error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── DELETE /api/projects/:id ─────────────────────────────────────────────────
// Deletes a project and cascades the deletion to all related records:
//   - Removes the project from the ML estimation training dataset
//   - Removes all Affectation records
//   - Deletes all TimeEntry records (hours worked on this project)
//   - Deletes all BillingEntry records (invoices raised for this project)
//   - Recalculates expert loads since some entries are now gone
export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    // Clean up the ML estimation dataset first
    await removeProjectFromEstimation(project._id.toString());
    // Clean up the Affectation mirror collection
    await removeProjectAffectations(project._id.toString());

    // Cascade-delete all time and billing records tied to this project
    await TimeEntry.deleteMany({ projectId: project._id });
    await BillingEntry.deleteMany({ projectId: project._id });

    // Recalculate expert currentLoad since some timesheet-linked entries are gone
    await recalcExpertLoads();

    logAudit(req, {
      action: "DELETE", resource: "project",
      resourceId:   project._id.toString(),
      resourceName: project.name,
      description:  `Deleted project "${project.name}"`,
    });
    res.json({ message: "Project deleted" });
  } catch (err) {
    console.error("deleteProject error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST /api/projects/repair-data ──────────────────────────────────────────
// Admin-only data repair endpoint.
// Delegates to repairProjectData() which runs a 4-step repair:
//   1. Build expert name → hourly rate map
//   2. Identify the canonical project per name (deduplication)
//   3. Re-aggregate hoursConsumed from TimeEntry records
//   4. Recompute costConsumed and all derived metrics (pace, margin, etc.)
//
// Guards against concurrent execution: if another repair is already running,
// returns 409 Conflict immediately instead of letting two repairs race.
// Also rejects if MongoDB is not connected (readyState !== 1).
export const repairProjectsData = async (req: Request, res: Response): Promise<void> => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ message: "Database not connected" });
    return;
  }
  if (repairInProgress) {
    res.status(409).json({ message: "Repair already in progress" });
    return;
  }

  repairInProgress = true;
  try {
    const repairStats = await repairProjectData();

    logAudit(req, {
      action:      "UPDATE",
      resource:    "project",
      description: "Repaired project data links and rebuilt totals from source entries",
      metadata:    repairStats, // stats include projectsScanned, projectsRebuilt, movedTimeEntries
    });

    res.json({ message: "Project data repaired", ...repairStats });
  } catch (err) {
    console.error("repairProjectsData error:", err);
    res.status(500).json({ message: "Server error" });
  } finally {
    // Always clear the flag — even if the repair threw an error — so future requests aren't blocked
    repairInProgress = false;
  }
};
