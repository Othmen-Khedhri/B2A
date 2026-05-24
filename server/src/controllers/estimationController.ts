// ─── Estimation controller ────────────────────────────────────────────────────
// Powers the ML-based project budget estimation feature.
// The flow works like this:
//   1. Completed projects are stored in EstimationProject (the training dataset)
//   2. The FastAPI ML microservice reads that dataset and trains a model
//   3. The frontend sends project parameters → this controller proxies to /predict
//   4. The ML service returns estimated hours/cost with confidence interval
//
// Endpoints:
//   GET  /api/estimation/collaborators  — list experts with experience counts (for staff picker)
//   GET  /api/estimation/projects       — list historical estimation projects
//   POST /api/estimation/predict        — proxy prediction request to ML microservice
//   POST /api/estimation/import         — bulk-import historical completed projects from Excel
//   POST /api/estimation/retrain        — sync all completed projects and reset retrain counter
//
// Internal helpers (exported for use by projectController):
//   incrementCompletedAndMaybeRetrain(projectId) — called on project completion
//   removeProjectFromEstimation(projectId)        — called on project deletion

import { Request, Response } from "express";
import * as XLSX from "xlsx";
import EstimationProject from "../models/EstimationProject";
import EstimationMeta from "../models/EstimationMeta";
import Project from "../models/Project";
import Client from "../models/Client";
import TimeEntry from "../models/TimeEntry";
import Expert from "../models/Expert";

// Base URL for the FastAPI ML microservice (spawned as a subprocess in index.ts)
const ML_API_URL = process.env.ML_API_URL || "http://127.0.0.1:8000";

interface PredictRequestBody {
  projectType?: string;
  sector?: string;
  complexity?: string;
  juniorCount?: number;
  midCount?: number;
  seniorCount?: number;
  hasDeadline?: boolean;
}

// ─── normalizeSectorForMl ─────────────────────────────────────────────────────
// The ML training data uses "Éducation & Formation" with an accent.
// The frontend sends "Education & Formation" (no accent) — normalise before proxying.
const normalizeSectorForMl = (sector: string): string => {
  if (sector === "Education & Formation") return "Éducation & Formation";
  return sector;
};

// ─── toNum ────────────────────────────────────────────────────────────────────
// Strips currency symbols, whitespace, and unit suffixes from cell values
// before converting to a number. Handles TND (Tunisian Dinar) and "h" for hours.
const toNum = (val: unknown): number => {
  if (typeof val === "number") return val;
  if (!val) return 0;
  const cleaned = String(val)
    .replace(/\s+/g, "")
    .replace(/TND/i, "")
    .replace(/h/i, "")
    .replace(/,/g, "")
    .trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
};

// ─── deriveComplexity ─────────────────────────────────────────────────────────
// Infers a complexity label from the number of budgeted hours.
// Used when importing historical projects that don't have an explicit complexity field.
const deriveComplexity = (hours: number): string => {
  if (hours <= 40)  return "Faible";   // Low
  if (hours <= 80)  return "Moyenne";  // Medium
  if (hours <= 120) return "Élevée";   // High
  return "Critique";                   // Critical
};

// ─── normalizeRow ─────────────────────────────────────────────────────────────
// Maps a raw Excel row (from historical project import) to a canonical structure.
// Handles multiple column name variants so imports work from different spreadsheet formats.
const normalizeRow = (row: Record<string, unknown>) => {
  // Helper: try multiple key aliases and return the first non-empty value
  const get = (...keys: string[]) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
    }
    return "";
  };

  // overBudget may be stored as boolean string ("true"/"false"), yes/no, or a positive number
  const overBudgetRaw = get("overBudget", "Over Budget", "Depassement", "Dépassement");
  const overBudget =
    String(overBudgetRaw).toLowerCase().trim() === "true" ||
    String(overBudgetRaw).toLowerCase().trim() === "yes"  ||
    String(overBudgetRaw).toLowerCase().trim() === "oui"  ||
    Number(overBudgetRaw) > 0;

  return {
    client:          String(get("Nom du Client", "Client", "Client Name", "client")).trim(),
    type:            String(get("Type de Mission", "Type", "Project Type", "type")).trim(),
    budgetHT:        toNum(get("Budget Estimé (TND)", "Budget HT", "Budget", "budgetHT")),
    hBudget:         toNum(get("Heures Estimées",     "Budget Hours", "Heures budget", "hBudget")),
    hReal:           toNum(get("Heures Réelles",      "Actual Hours", "Heures réelles", "hReal")),
    coutReel:        toNum(get("Budget Réel (TND)",   "Coût réel", "Cost", "coutReel")),
    marge:           toNum(get("marge", "Marge", "Margin")),
    rentPct:         toNum(get("rentPct", "Rent %", "Margin %")),
    overBudget,
    sector:          String(get("Secteur d'Activité", "Secteur", "Sector", "sector", "Segment")).trim(),
    complexity:      String(get("complexity", "Complexity", "Complexité")).trim() || "Moyenne",
    collabPrincipal: String(get("Manager Proposé", "Collab Principal", "Responsable", "collabPrincipal")).trim(),
    status:          String(get("Statut", "Status")).trim(),
  };
};

// ─── GET /api/estimation/collaborators ───────────────────────────────────────
// Returns all non-admin experts with an extra field:
//   experienceCount — how many distinct projects of the requested type they worked on
// Used by the estimation form's "Assign Staff" step to show relevant experience.
// We use TimeEntry → Project (not Affectation) because affectations are deleted when
// a project completes — using them would erase all historical experience context.
export const getCollaboratorsContext = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectType } = req.query;

    const experts = await Expert.find({ role: { $ne: "admin" } })
      .select("_id name level coutHoraire")
      .sort({ name: 1 })
      .lean();

    const experienceMap = new Map<string, number>();
    if (projectType) {
      // Aggregate: for each expert, count distinct projects of this type they logged time on
      const aggs = await TimeEntry.aggregate([
        {
          $lookup: {
            from:         "projects",    // join with the projects collection
            localField:   "projectId",
            foreignField: "_id",
            as:           "project",
          },
        },
        { $unwind: "$project" },
        {
          $match: {
            // Exact case-insensitive match on project type
            "project.type": {
              $regex: new RegExp(
                `^${String(projectType).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                "i"
              ),
            },
          },
        },
        {
          $group: {
            _id:        "$expertId",
            projectIds: { $addToSet: "$projectId" }, // distinct project IDs
          },
        },
        {
          $project: { _id: 1, count: { $size: "$projectIds" } },
        },
      ]);
      for (const a of aggs) {
        experienceMap.set(String(a._id), a.count as number);
      }
    }

    const result = experts.map((e) => ({
      _id:             e._id,
      name:            e.name,
      level:           e.level,
      coutHoraire:     e.coutHoraire || 0,
      hasExperience:   experienceMap.has(String(e._id)),
      experienceCount: experienceMap.get(String(e._id)) || 0,
    }));

    res.json(result);
  } catch (err) {
    console.error("getCollaboratorsContext error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/estimation/projects ────────────────────────────────────────────
// Returns all historical estimation project records (sorted newest first).
// Used by the estimation page to show the dataset and let admins review/add to it.
export const getHistoricalProjects = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await EstimationProject.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    console.error("getHistoricalProjects error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST /api/estimation/predict ─────────────────────────────────────────────
// Proxies a prediction request to the FastAPI ML microservice.
// The frontend sends project parameters in camelCase; this controller translates
// them to the snake_case format expected by the ML API.
// If the ML service is down or returns an error, responds with 502 Bad Gateway.
export const predictEstimationMl = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      projectType,
      sector,
      complexity,
      juniorCount  = 0,
      midCount     = 0,
      seniorCount  = 0,
      hasDeadline  = false,
    } = (req.body || {}) as PredictRequestBody;

    if (!projectType || !sector || !complexity) {
      res.status(400).json({ message: "projectType, sector and complexity are required" });
      return;
    }

    // Translate frontend field names → ML API field names (snake_case)
    const mlPayload = {
      type_mission:    projectType,
      secteur:         normalizeSectorForMl(sector),
      complexity,
      nb_junior:       Number(juniorCount) || 0,
      nb_senior:       Number(midCount)    || 0,  // "mid" maps to "senior" in the ML feature set
      nb_manager:      Number(seniorCount) || 0,  // "senior" maps to "manager" in ML
      strict_deadline: Boolean(hasDeadline),
    };

    console.log("[ML predict] request", mlPayload);

    // Call the ML microservice with optional shared secret for authentication
    const mlResponse = await fetch(`${ML_API_URL}/predict`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.ML_SECRET ? { "X-ML-Secret": process.env.ML_SECRET } : {}),
      },
      body: JSON.stringify(mlPayload),
    });

    if (!mlResponse.ok) {
      const detail = await mlResponse.text();
      res.status(502).json({ message: "ML prediction failed", detail });
      return;
    }

    const mlData = await mlResponse.json();

    console.log("[ML predict] raw response", {
      hours_min:      mlData.hours_min,
      hours_likely:   mlData.hours_likely,
      hours_max:      mlData.hours_max,
      cost_min:       mlData.cost_min,
      cost_max:       mlData.cost_max,
      overrun_rate:   mlData.overrun_rate,
      avg_margin_pct: mlData.avg_margin_pct,
      confidence:     mlData.confidence,
      nb_similar:     mlData.nb_similar,
    });

    // Translate ML response back to camelCase for the frontend
    res.json({
      hoursMin:        mlData.hours_min,
      hoursLikely:     mlData.hours_likely,
      hoursMax:        mlData.hours_max,
      costMin:         mlData.cost_min,
      costMax:         mlData.cost_max,
      avgMarginPct:    mlData.avg_margin_pct,
      overBudgetRate:  mlData.overrun_rate,
      confidence:      mlData.confidence,
      matchLevel:      "ml",
      similarCount:    mlData.nb_similar,
      // Map similar project records to a clean frontend structure
      similarProjects: Array.isArray(mlData.similar_projects)
        ? mlData.similar_projects.map((p: Record<string, unknown>) => ({
            name:        String(p.client       || "N/A"),
            type:        String(p.type_mission || "N/A"),
            sector:      String(p.secteur      || "N/A"),
            actualHours: Number(p.heures_reelles)  || 0,
            budgetHours: Number(p.heures_estimees) || 0,
            overBudget:  Boolean(p.over_budget),
            rentPct:     Number(p.margin_pct)      || 0,
          }))
        : [],
    });
  } catch (err) {
    console.error("predictEstimationMl error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST /api/estimation/import ─────────────────────────────────────────────
// Imports historical completed projects from an Excel file into the EstimationProject
// training dataset. Only rows with status "terminé" / "completed" are imported —
// in-progress or cancelled projects should not influence the training data.
export const importHistoricalProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ message: "No file uploaded" }); return; }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    let imported = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        const normalized = normalizeRow(row);
        const status = normalized.status?.toLowerCase();

        // Skip rows without a client or type — they can't be used for training
        if (!normalized.client || !normalized.type) continue;

        // Skip any project that isn't completed (we only want finished data)
        if (status && status !== "terminé" && status !== "termine" && status !== "completed") continue;

        const { status: _status, ...payload } = normalized;
        await EstimationProject.create({ ...payload, source: "upload" });
        imported++;
      } catch (rowErr) {
        errors.push((rowErr as Error).message);
      }
    }

    res.json({ imported, errors });
  } catch (err) {
    console.error("importHistoricalProjects error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── buildProjectTrainingRecord ───────────────────────────────────────────────
// Constructs an EstimationProject training record from a completed Project document.
// Fetches real hours from TimeEntry (more accurate than hoursConsumed on the project).
// Returns null if the project doesn't exist or isn't completed.
const buildProjectTrainingRecord = async (projectId: string) => {
  const project = await Project.findById(projectId).lean();
  if (!project || project.status !== "completed") return null;

  // Use the client's sector if available; fall back to the project's segment field
  const client = project.clientId ? await Client.findById(project.clientId).lean() : null;
  const sector = client?.sector || project.segment || "";

  // Aggregate actual hours from TimeEntry — more reliable than the hoursConsumed field
  // which might have been manually adjusted
  const timeAgg = await TimeEntry.aggregate([
    { $match: { projectId: project._id } },
    { $group: { _id: "$projectId", totalHours: { $sum: "$hours" } } },
  ]);
  const hReal = timeAgg.length > 0 ? Number(timeAgg[0].totalHours) : project.hoursConsumed || 0;

  const hBudget    = project.budgetHours || 0;
  const overBudget = hBudget > 0 ? hReal > hBudget : false;

  return {
    projectId:       project._id,
    client:          project.clientName || project.name,
    type:            project.type       || "General",
    budgetHT:        project.budgetCost || 0,
    hBudget,
    hReal,
    coutReel:        project.costConsumed  || 0,
    marge:           project.grossMargin   || 0,
    rentPct:         project.marginPercent || 0,
    overBudget,
    sector,
    complexity:      deriveComplexity(hBudget || hReal),
    collabPrincipal: project.responsiblePartnerName || "",
    source:          "project" as const,
  };
};

// ─── syncFromCompletedProjects ────────────────────────────────────────────────
// Iterates over all completed projects and upserts their training records.
// "Upsert" = insert if no record exists for that projectId, update if it does.
// Returns the total number of records upserted.
const syncFromCompletedProjects = async (): Promise<number> => {
  const projects = await Project.find({ status: "completed" }).select("_id").lean();
  let upserts = 0;

  for (const p of projects) {
    const record = await buildProjectTrainingRecord(String(p._id));
    if (!record) continue;

    await EstimationProject.findOneAndUpdate(
      { projectId: record.projectId },
      record,
      { upsert: true, new: true }
    );
    upserts++;
  }

  return upserts;
};

// ─── POST /api/estimation/add ─────────────────────────────────────────────────
// Add a single manual training record to the EstimationProject collection.
// Used by admins to enter individual completed-project data from the UI.
export const addSingleTrainingRecord = async (req: Request, res: Response): Promise<void> => {
  try {
    const { client, type, sector, complexity, hBudget, hReal, rentPct } = req.body;
    if (!client || !type) {
      res.status(400).json({ message: "client and type are required" });
      return;
    }
    const hB = Number(hBudget) || 0;
    const hR = Number(hReal) || 0;
    const record = await EstimationProject.create({
      client:     String(client).trim(),
      type:       String(type).trim(),
      sector:     String(sector || "").trim(),
      complexity: String(complexity || "Moyenne").trim(),
      hBudget:    hB,
      hReal:      hR,
      budgetHT:   0,
      coutReel:   0,
      marge:      0,
      rentPct:    Number(rentPct) || 0,
      overBudget: hB > 0 ? hR > hB : false,
      source:     "upload",
    });
    res.status(201).json(record);
  } catch (err) {
    console.error("addSingleTrainingRecord error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST /api/estimation/retrain ─────────────────────────────────────────────
// Admin-triggered full retrain: syncs all completed projects into EstimationProject,
// resets the counter, then calls the FastAPI /retrain-db endpoint to rebuild the
// ML model files (.pkl) from the updated dataset.
export const retrainEstimation = async (_req: Request, res: Response): Promise<void> => {
  try {
    const upserts = await syncFromCompletedProjects();

    const meta = await EstimationMeta.findOneAndUpdate(
      {},
      { completedSinceRetrain: 0, lastRetrainedAt: new Date() },
      { upsert: true, new: true }
    );

    // Trigger actual ML model retraining on the FastAPI microservice
    try {
      const mlRes = await fetch(`${ML_API_URL}/retrain-db`, {
        method:  "POST",
        headers: process.env.ML_SECRET ? { "X-ML-Secret": process.env.ML_SECRET } : {},
      });
      if (!mlRes.ok) {
        console.warn("[ML retrain-db] failed:", await mlRes.text());
      } else {
        console.log("[ML retrain-db] success");
      }
    } catch (mlErr) {
      console.warn("[ML retrain-db] unreachable:", mlErr);
    }

    res.json({ message: "Estimation data refreshed", upserts, lastRetrainedAt: meta?.lastRetrainedAt });
  } catch (err) {
    console.error("retrainEstimation error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── incrementCompletedAndMaybeRetrain ───────────────────────────────────────
// Called automatically by projectConsistency.ts when a project transitions to "completed".
// Increments the completedSinceRetrain counter and triggers a full sync if the
// counter reaches the auto-retrain threshold (10 completions).
// The threshold avoids retraining on every single project — batching is more efficient
// and avoids thrashing the ML service with frequent model rebuilds.
export const incrementCompletedAndMaybeRetrain = async (projectId: string): Promise<void> => {
  const meta = await EstimationMeta.findOneAndUpdate(
    {},
    { $inc: { completedSinceRetrain: 1 } },
    { upsert: true, new: true }
  );

  // Auto-retrain threshold: 10 completions since the last retrain
  if ((meta?.completedSinceRetrain ?? 0) >= 10) {
    await syncFromCompletedProjects();
    await EstimationMeta.findOneAndUpdate(
      {},
      { completedSinceRetrain: 0, lastRetrainedAt: new Date() },
      { upsert: true }
    );
  }
};

// ─── removeProjectFromEstimation ─────────────────────────────────────────────
// Called by projectController when a project is deleted.
// Removes its training record so deleted/invalid projects don't skew the ML model.
export const removeProjectFromEstimation = async (projectId: string): Promise<void> => {
  await EstimationProject.deleteOne({ projectId });
};
