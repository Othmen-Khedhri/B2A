import Project from "../models/Project";
import TimeEntry from "../models/TimeEntry";
import Expert from "../models/Expert";

interface CanonicalProject {
  id: string;
  name: string;
  collaboratorsRaw: string;
}

const normalize = (value: string): string => value.trim().toLowerCase();

// Average hourly rate across the collaborators listed in a project's collaboratorsRaw field.
const avgCollabRate = (collaboratorsRaw: string, rateByName: Map<string, number>): number => {
  const names = (collaboratorsRaw || "")
    .split(/[|,;]+/)
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);
  if (names.length === 0) return 0;
  const rates = names.map((n) => rateByName.get(n) || 0);
  return rates.reduce((a, b) => a + b, 0) / rates.length;
};

const computeDerived = (project: {
  startDate: Date;
  endDate: Date;
  budgetHours: number;
  budgetCost: number;
  hoursConsumed: number;
  costConsumed: number;
  invoicedAmount: number;
}) => {
  const now = Date.now();
  const totalMs = project.endDate.getTime() - project.startDate.getTime();
  // Use 5% minimum elapsed to avoid extreme pace values on projects that just started
  const elapsedRatio =
    totalMs > 0
      ? Math.min(Math.max((now - project.startDate.getTime()) / totalMs, 0.05), 1)
      : 1;

  const paceIndexHours = project.budgetHours > 0
    ? Math.min((project.hoursConsumed / project.budgetHours) / elapsedRatio, 5)
    : 0;
  const paceIndexCost = project.budgetCost > 0
    ? Math.min((project.costConsumed / project.budgetCost) / elapsedRatio, 5)
    : 0;

  const grossMargin = project.invoicedAmount > 0
    ? project.invoicedAmount - project.costConsumed
    : project.budgetCost - project.costConsumed;
  const marginPercent = project.invoicedAmount > 0
    ? (grossMargin / project.invoicedAmount) * 100
    : (project.costConsumed > 0 && project.budgetCost > 0 ? (grossMargin / project.budgetCost) * 100 : 0);
  const effectiveCostPerHour =
    project.hoursConsumed > 0 ? project.costConsumed / project.hoursConsumed : 0;

  return { paceIndexHours, paceIndexCost, grossMargin, marginPercent, effectiveCostPerHour };
};

export const repairProjectData = async () => {
  // ── 1. Build expert name → coutHoraire lookup ──────────────────────────────
  const allExperts = await Expert.find().select("name coutHoraire").lean();
  const rateByName = new Map<string, number>();
  for (const e of allExperts) {
    rateByName.set((e.name || "").trim().toLowerCase(), Number(e.coutHoraire) || 0);
  }

  // ── 2. Build canonical project map (deduplicate by name) ───────────────────
  const projects = await Project.find()
    .select("_id name externalId hoursConsumed collaboratorsRaw updatedAt")
    .lean();

  const byId            = new Map<string, CanonicalProject>();
  const canonicalByName = new Map<string, CanonicalProject>();

  for (const p of projects) {
    const id  = String(p._id);
    const key = normalize(String(p.name || ""));
    const candidate: CanonicalProject = {
      id,
      name: String(p.name || ""),
      collaboratorsRaw: String(p.collaboratorsRaw || ""),
    };
    byId.set(id, candidate);

    if (!key) continue;
    const existing = canonicalByName.get(key);
    if (!existing) {
      canonicalByName.set(key, candidate);
      continue;
    }

    // Prefer the entry with more recorded hours (most data), break ties by updatedAt
    const current      = projects.find((x) => String(x._id) === existing.id);
    const scoreCurrent = Number(current?.hoursConsumed || 0);
    const scoreNext    = Number(p.hoursConsumed || 0);
    if (
      scoreNext > scoreCurrent ||
      (scoreNext === scoreCurrent &&
        new Date(p.updatedAt).getTime() > new Date(current?.updatedAt || 0).getTime())
    ) {
      canonicalByName.set(key, candidate);
    }
  }

  // ── 3. Re-aggregate hoursConsumed from TimeEntry records ───────────────────
  const hoursByProjectId = new Map<string, number>();
  let movedTimeEntries   = 0;

  const timeAgg = await TimeEntry.aggregate([
    {
      $group: {
        _id: { projectId: "$projectId", projectName: "$projectName" },
        totalHours: { $sum: "$hours" },
      },
    },
  ]);

  for (const t of timeAgg) {
    const sourceId = String(t._id.projectId);
    const nameKey  = normalize(String(t._id.projectName || ""));
    const canonical = canonicalByName.get(nameKey) || byId.get(sourceId);
    if (!canonical) continue;

    hoursByProjectId.set(
      canonical.id,
      (hoursByProjectId.get(canonical.id) || 0) + (Number(t.totalHours) || 0),
    );

    if (canonical.id !== sourceId) {
      const res = await TimeEntry.updateMany(
        { projectId: t._id.projectId },
        { $set: { projectId: canonical.id, projectName: canonical.name } },
      );
      movedTimeEntries += res.modifiedCount;
    }
  }

  // Only zero and rebuild hoursConsumed for projects that have TimeEntry records.
  // Projects imported directly (no TimeEntry rows) retain their stored hoursConsumed.
  const projectIdsWithEntries = Array.from(hoursByProjectId.keys());
  if (projectIdsWithEntries.length > 0) {
    await Project.updateMany(
      { _id: { $in: projectIdsWithEntries } },
      { $set: { hoursConsumed: 0 } },
    );

    const hoursOps = projectIdsWithEntries.map((id) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { hoursConsumed: hoursByProjectId.get(id) || 0 } },
      },
    }));
    await Project.bulkWrite(hoursOps);
  }

  // ── 4. Recompute costConsumed + all derived metrics for every project ───────
  const allProjects = await Project.find()
    .select("_id startDate endDate budgetHours budgetCost hoursConsumed costConsumed invoicedAmount collaboratorsRaw")
    .lean();

  const metricOps = allProjects.map((p) => {
    const hoursConsumed  = Number(p.hoursConsumed) || 0;
    const rate           = avgCollabRate(String(p.collaboratorsRaw || ""), rateByName);
    // Preserve existing costConsumed when no expert rates are found — avoids zeroing out
    // manually-set or import-derived cost data when collaborator lookup fails.
    const costConsumed   = rate > 0 ? hoursConsumed * rate : (Number(p.costConsumed) || 0);
    const invoicedAmount = Number(p.invoicedAmount) || 0;

    const metrics = computeDerived({
      startDate:     new Date(p.startDate),
      endDate:       new Date(p.endDate),
      budgetHours:   Number(p.budgetHours) || 0,
      budgetCost:    Number(p.budgetCost)  || 0,
      hoursConsumed,
      costConsumed,
      invoicedAmount,
    });

    return {
      updateOne: {
        filter: { _id: p._id },
        update: { $set: { costConsumed, ...metrics } },
      },
    };
  });

  if (metricOps.length > 0) await Project.bulkWrite(metricOps);

  return {
    projectsScanned: projects.length,
    projectsRebuilt: projectIdsWithEntries.length,
    movedTimeEntries,
  };
};
