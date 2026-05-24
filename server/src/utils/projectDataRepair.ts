// ─── Project data repair utility ─────────────────────────────────────────────
// Full data-integrity repair for the projects collection.
// Called from:
//   POST /api/projects/repair-data    (admin-triggered from the Overview page)
//   Overview.tsx on every page load   (non-blocking, fire-and-forget)
//
// What it does in four steps:
//   1. Build an expert name → hourly rate lookup table
//   2. Identify the "canonical" project for each name (deduplicate by hoursConsumed)
//   3. Re-aggregate hoursConsumed from TimeEntry records; redirect stale entries
//      to the canonical project
//   4. Recompute costConsumed, paceIndex, grossMargin, etc. for every project

import Project from "../models/Project";
import TimeEntry from "../models/TimeEntry";
import Expert from "../models/Expert";

interface CanonicalProject {
  id:               string;
  name:             string;
  collaboratorsRaw: string; // pipe-separated list of collab names
}

// Normalise a string for case-insensitive key comparison
const normalize = (value: string): string => value.trim().toLowerCase();

// ── avgCollabRate ──────────────────────────────────────────────────────────────
// Parses the collaboratorsRaw string ("Name1 | Name2") and averages their hourly rates.
// Returns 0 if no names are found in the rate map (expert deleted or not in DB).
const avgCollabRate = (collaboratorsRaw: string, rateByName: Map<string, number>): number => {
  const names = (collaboratorsRaw || "")
    .split(/[|,;]+/)
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);
  if (names.length === 0) return 0;
  const rates = names.map((n) => rateByName.get(n) || 0);
  return rates.reduce((a, b) => a + b, 0) / rates.length;
};

// ── computeDerived ────────────────────────────────────────────────────────────
// Calculates all derived metrics from raw budget/consumed/date values.
// Identical logic to projectConsistency.ts — kept separate to avoid circular imports.
const computeDerived = (project: {
  startDate:      Date;
  endDate:        Date;
  budgetHours:    number;
  budgetCost:     number;
  hoursConsumed:  number;
  costConsumed:   number;
  invoicedAmount: number;
}) => {
  const now      = Date.now();
  const totalMs  = project.endDate.getTime() - project.startDate.getTime();

  // 5% minimum elapsed prevents extreme pace values on brand-new projects
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

// ─── repairProjectData ────────────────────────────────────────────────────────
// Main function. Returns stats about what was repaired.
export const repairProjectData = async () => {
  // ── Step 1: Build expert name → hourly rate map ───────────────────────────
  const allExperts = await Expert.find().select("name coutHoraire").lean();
  const rateByName = new Map<string, number>();
  for (const e of allExperts) {
    rateByName.set((e.name || "").trim().toLowerCase(), Number(e.coutHoraire) || 0);
  }

  // ── Step 2: Build canonical project map ──────────────────────────────────
  // When multiple documents have the same name (e.g. from repeated imports),
  // we pick the one with the highest hoursConsumed as the "canonical" record.
  // All TimeEntry rows referencing duplicates get redirected to the canonical ID.
  const projects = await Project.find()
    .select("_id name externalId hoursConsumed collaboratorsRaw updatedAt")
    .lean();

  const byId            = new Map<string, CanonicalProject>(); // every project by ID
  const canonicalByName = new Map<string, CanonicalProject>(); // best project per name

  for (const p of projects) {
    const id  = String(p._id);
    const key = normalize(String(p.name || ""));
    const candidate: CanonicalProject = {
      id,
      name:             String(p.name || ""),
      collaboratorsRaw: String(p.collaboratorsRaw || ""),
    };
    byId.set(id, candidate);

    if (!key) continue;
    const existing = canonicalByName.get(key);
    if (!existing) {
      canonicalByName.set(key, candidate);
      continue;
    }

    // Prefer the candidate with more hours, breaking ties with the most recently updated
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

  // ── Step 3: Re-aggregate hoursConsumed from TimeEntry records ─────────────
  // Group TimeEntry hours by projectId + projectName so we can detect stale IDs.
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

    // Resolve to canonical: use name-based lookup first, then ID-based fallback
    const canonical = canonicalByName.get(nameKey) || byId.get(sourceId);
    if (!canonical) continue;

    hoursByProjectId.set(
      canonical.id,
      (hoursByProjectId.get(canonical.id) || 0) + (Number(t.totalHours) || 0),
    );

    // If the TimeEntry references a non-canonical project ID, redirect it
    if (canonical.id !== sourceId) {
      const res = await TimeEntry.updateMany(
        { projectId: t._id.projectId },
        { $set: { projectId: canonical.id, projectName: canonical.name } },
      );
      movedTimeEntries += res.modifiedCount;
    }
  }

  // Only reset hoursConsumed for projects that actually have TimeEntry records.
  // Projects that were imported directly (without TimeEntry rows) keep their
  // stored value — we don't want to zero those out.
  const projectIdsWithEntries = Array.from(hoursByProjectId.keys());
  if (projectIdsWithEntries.length > 0) {
    // Reset to 0 first, then set to the correct aggregated value
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

  // ── Step 4: Recompute costConsumed and all derived metrics ────────────────
  const allProjects = await Project.find()
    .select("_id startDate endDate budgetHours budgetCost hoursConsumed costConsumed invoicedAmount collaboratorsRaw")
    .lean();

  const metricOps = allProjects.map((p) => {
    const hoursConsumed  = Number(p.hoursConsumed) || 0;
    const rate           = avgCollabRate(String(p.collaboratorsRaw || ""), rateByName);

    // Preserve existing costConsumed when no expert rates are available.
    // This avoids zeroing out cost data for projects whose collaborators were deleted.
    const costConsumed   = rate > 0 ? hoursConsumed * rate : (Number(p.costConsumed) || 0);
    const invoicedAmount = Number(p.invoicedAmount) || 0;

    const metrics = computeDerived({
      startDate:      new Date(p.startDate),
      endDate:        new Date(p.endDate),
      budgetHours:    Number(p.budgetHours) || 0,
      budgetCost:     Number(p.budgetCost)  || 0,
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
    projectsScanned:  projects.length,
    projectsRebuilt:  projectIdsWithEntries.length, // projects whose hours were reset from TimeEntry
    movedTimeEntries,                               // TimeEntry rows redirected to canonical project
  };
};
