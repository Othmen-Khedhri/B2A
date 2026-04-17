import Project, { ProjectStatus } from "../models/Project";
import TimeEntry from "../models/TimeEntry";
import { incrementCompletedAndMaybeRetrain, removeProjectFromEstimation } from "../controllers/estimationController";
import { syncProjectAffectations } from "./affectationSync";

interface SyncProjectConsistencyInput {
  projectId: string;
  projectName: string;
  status: ProjectStatus;
  previousStatus?: ProjectStatus;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const computeDerivedMetrics = (project: {
  budgetHours: number;
  budgetCost: number;
  hoursConsumed: number;
  costConsumed: number;
  invoicedAmount: number;
  startDate: Date;
  endDate: Date;
}) => {
  const now = Date.now();
  const totalMs = project.endDate.getTime() - project.startDate.getTime();

  // Use 5% minimum elapsed to avoid extreme pace values on projects that just started
  const elapsedRatio = totalMs > 0
    ? clamp((now - project.startDate.getTime()) / totalMs, 0.05, 1)
    : 1;

  const paceIndexHours = project.budgetHours > 0
    ? Math.min((project.hoursConsumed / project.budgetHours) / elapsedRatio, 5)
    : 0;

  const paceIndexCost = project.budgetCost > 0
    ? Math.min((project.costConsumed / project.budgetCost) / elapsedRatio, 5)
    : 0;

  // When no billing data exists, fall back to budget-based margin
  const grossMargin = project.invoicedAmount > 0
    ? project.invoicedAmount - project.costConsumed
    : project.budgetCost - project.costConsumed;
  const marginPercent = project.invoicedAmount > 0
    ? (grossMargin / project.invoicedAmount) * 100
    : (project.costConsumed > 0 && project.budgetCost > 0)
      ? (grossMargin / project.budgetCost) * 100
      : 0;
  const effectiveCostPerHour = project.hoursConsumed > 0 ? project.costConsumed / project.hoursConsumed : 0;

  return {
    paceIndexHours,
    paceIndexCost,
    grossMargin,
    marginPercent,
    effectiveCostPerHour,
  };
};

const refreshProjectDerivedMetrics = async (projectId: string): Promise<void> => {
  const project = await Project.findById(projectId)
    .select("budgetHours budgetCost hoursConsumed costConsumed invoicedAmount startDate endDate")
    .lean();

  if (!project) return;

  const metrics = computeDerivedMetrics({
    budgetHours: Number(project.budgetHours) || 0,
    budgetCost: Number(project.budgetCost) || 0,
    hoursConsumed: Number(project.hoursConsumed) || 0,
    costConsumed: Number(project.costConsumed) || 0,
    invoicedAmount: Number(project.invoicedAmount) || 0,
    startDate: new Date(project.startDate),
    endDate: new Date(project.endDate),
  });

  await Project.findByIdAndUpdate(projectId, { $set: metrics });
};

export const syncProjectConsistency = async ({
  projectId,
  projectName,
  status,
  previousStatus,
}: SyncProjectConsistencyInput): Promise<void> => {
  await Promise.all([
    refreshProjectDerivedMetrics(projectId),
    TimeEntry.updateMany({ projectId }, { $set: { projectName } }),
    syncProjectAffectations(projectId),
  ]);

  if (previousStatus !== "completed" && status === "completed") {
    await incrementCompletedAndMaybeRetrain(projectId);
  }

  if (previousStatus === "completed" && status !== "completed") {
    await removeProjectFromEstimation(projectId);
  }
};
