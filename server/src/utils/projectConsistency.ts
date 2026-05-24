// ─── Project consistency helper ───────────────────────────────────────────────
// Called every time a project is created, updated, or imported.
// Keeps several pieces of derived data in sync:
//   1. Recomputes pace index and margin from current consumed/budget values
//   2. Propagates the project name to all linked TimeEntry documents
//   3. Syncs the Affectation records with the current assignedStaff list
//   4. When a project transitions TO "completed":
//      - triggers ML auto-retrain counter increment
//   5. When a project transitions FROM "completed" back to something else:
//      - removes it from the ML training dataset

import Project, { ProjectStatus } from "../models/Project";
import TimeEntry from "../models/TimeEntry";
import { incrementCompletedAndMaybeRetrain, removeProjectFromEstimation } from "../controllers/estimationController";
import { syncProjectAffectations } from "./affectationSync";

interface SyncProjectConsistencyInput {
  projectId:      string;
  projectName:    string;
  status:         ProjectStatus;
  previousStatus?: ProjectStatus; // undefined on create (no previous status)
}

// Simple numeric clamp helper
const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

// ── computeDerivedMetrics ─────────────────────────────────────────────────────
// Calculates all fields that are derived from the core budget/consumed/date values.
// These are stored in the DB as denormalised fields for fast dashboard queries.
const computeDerivedMetrics = (project: {
  budgetHours:   number;
  budgetCost:    number;
  hoursConsumed: number;
  costConsumed:  number;
  invoicedAmount: number;
  startDate:     Date;
  endDate:       Date;
}) => {
  const now      = Date.now();
  const totalMs  = project.endDate.getTime() - project.startDate.getTime();

  // Clamp elapsed ratio between 5% and 100%.
  // The 5% floor prevents extreme pace values on day 1 of a long project
  // (without it, 2h on a 200h project would show paceIndex of 20×).
  const elapsedRatio = totalMs > 0
    ? clamp((now - project.startDate.getTime()) / totalMs, 0.05, 1)
    : 1;

  // paceIndexHours = how fast we're burning hours relative to elapsed time
  // 1.0 = perfectly on pace, > 1.0 = burning faster than expected
  const paceIndexHours = project.budgetHours > 0
    ? Math.min((project.hoursConsumed / project.budgetHours) / elapsedRatio, 5) // capped at 5×
    : 0;

  // Same formula for cost
  const paceIndexCost = project.budgetCost > 0
    ? Math.min((project.costConsumed / project.budgetCost) / elapsedRatio, 5)
    : 0;

  // Prefer actual invoiced revenue for margin; fall back to budget when no billing data
  const grossMargin = project.invoicedAmount > 0
    ? project.invoicedAmount - project.costConsumed
    : project.budgetCost - project.costConsumed;

  const marginPercent = project.invoicedAmount > 0
    ? (grossMargin / project.invoicedAmount) * 100
    : (project.costConsumed > 0 && project.budgetCost > 0)
      ? (grossMargin / project.budgetCost) * 100
      : 0;

  // Average actual cost per hour billed
  const effectiveCostPerHour = project.hoursConsumed > 0 ? project.costConsumed / project.hoursConsumed : 0;

  return { paceIndexHours, paceIndexCost, grossMargin, marginPercent, effectiveCostPerHour };
};

// ── refreshProjectDerivedMetrics ──────────────────────────────────────────────
// Fetches the project from DB and writes the recomputed derived fields back.
const refreshProjectDerivedMetrics = async (projectId: string): Promise<void> => {
  const project = await Project.findById(projectId)
    .select("budgetHours budgetCost hoursConsumed costConsumed invoicedAmount startDate endDate")
    .lean();

  if (!project) return;

  const metrics = computeDerivedMetrics({
    budgetHours:    Number(project.budgetHours)    || 0,
    budgetCost:     Number(project.budgetCost)     || 0,
    hoursConsumed:  Number(project.hoursConsumed)  || 0,
    costConsumed:   Number(project.costConsumed)   || 0,
    invoicedAmount: Number(project.invoicedAmount) || 0,
    startDate:      new Date(project.startDate),
    endDate:        new Date(project.endDate),
  });

  await Project.findByIdAndUpdate(projectId, { $set: metrics });
};

// ─── syncProjectConsistency ───────────────────────────────────────────────────
// Main entry point called from projectController and projectImportController.
// Runs three operations in parallel, then handles status-change side effects.
export const syncProjectConsistency = async ({
  projectId,
  projectName,
  status,
  previousStatus,
}: SyncProjectConsistencyInput): Promise<void> => {
  // Run the three core sync operations in parallel to minimise latency
  await Promise.all([
    refreshProjectDerivedMetrics(projectId),       // update pace/margin fields
    TimeEntry.updateMany({ projectId }, { $set: { projectName } }), // keep name in sync
    syncProjectAffectations(projectId),            // keep assignment records in sync
  ]);

  // When a project is marked completed for the first time, add it to the ML training pool.
  // incrementCompletedAndMaybeRetrain() increments a counter and triggers auto-retrain
  // once AUTO_RETRAIN_THRESHOLD (10) completions have accumulated.
  if (previousStatus !== "completed" && status === "completed") {
    await incrementCompletedAndMaybeRetrain(projectId);
  }

  // If a project is un-completed (e.g. reopened), remove it from the training dataset
  // because its final metrics are no longer reliable.
  if (previousStatus === "completed" && status !== "completed") {
    await removeProjectFromEstimation(projectId);
  }
};
