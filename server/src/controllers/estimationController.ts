import { Request, Response } from "express";
import * as XLSX from "xlsx";
import EstimationProject from "../models/EstimationProject";
import EstimationMeta from "../models/EstimationMeta";
import Project from "../models/Project";
import Client from "../models/Client";
import TimeEntry from "../models/TimeEntry";
import Expert from "../models/Expert";
import Affectation from "../models/Affectation";

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

const normalizeSectorForMl = (sector: string): string => {
  if (sector === "Education & Formation") return "Éducation & Formation";
  return sector;
};

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

const deriveComplexity = (hours: number): string => {
  if (hours <= 40) return "Faible";
  if (hours <= 80) return "Moyenne";
  if (hours <= 120) return "Élevée";
  return "Critique";
};

const normalizeRow = (row: Record<string, unknown>) => {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
    }
    return "";
  };

  const overBudgetRaw = get("overBudget", "Over Budget", "Depassement", "Dépassement");
  const overBudget =
    String(overBudgetRaw).toLowerCase().trim() === "true" ||
    String(overBudgetRaw).toLowerCase().trim() === "yes" ||
    String(overBudgetRaw).toLowerCase().trim() === "oui" ||
    Number(overBudgetRaw) > 0;

  return {
    client:          String(get("Nom du Client", "Client", "Client Name", "client")).trim(),
    type:            String(get("Type de Mission", "Type", "Project Type", "type")).trim(),
    budgetHT:        toNum(get("Budget Estimé (TND)", "Budget HT", "Budget", "budgetHT")),
    hBudget:         toNum(get("Heures Estimées", "Budget Hours", "Heures budget", "hBudget")),
    hReal:           toNum(get("Heures Réelles", "Actual Hours", "Heures réelles", "hReal")),
    coutReel:        toNum(get("Budget Réel (TND)", "Coût réel", "Cost", "coutReel")),
    marge:           toNum(get("marge", "Marge", "Margin")),
    rentPct:         toNum(get("rentPct", "Rent %", "Margin %")),
    overBudget,
    sector:          String(get("Secteur d'Activité", "Secteur", "Sector", "sector", "Segment")).trim(),
    complexity:      String(get("complexity", "Complexity", "Complexité")).trim() || "Moyenne",
    collabPrincipal: String(get("Manager Proposé", "Collab Principal", "Responsable", "collabPrincipal")).trim(),
    status:          String(get("Statut", "Status")).trim(),
  };
};

export const getCollaboratorsContext = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectType } = req.query;

    const experts = await Expert.find({ role: { $ne: "admin" } })
      .select("_id name level coutHoraire")
      .sort({ name: 1 })
      .lean();

    // Build a map of expertId -> count of projects of this type they worked on
    const experienceMap = new Map<string, number>();
    if (projectType) {
      const aggs = await Affectation.aggregate([
        { $match: { type: String(projectType) } },
        { $group: { _id: "$expertId", count: { $sum: 1 } } },
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

export const getHistoricalProjects = async (_req: Request, res: Response): Promise<void> => {
  try {
    const data = await EstimationProject.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    console.error("getHistoricalProjects error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const predictEstimationMl = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      projectType,
      sector,
      complexity,
      juniorCount = 0,
      midCount = 0,
      seniorCount = 0,
      hasDeadline = false,
    } = (req.body || {}) as PredictRequestBody;

    if (!projectType || !sector || !complexity) {
      res.status(400).json({ message: "projectType, sector and complexity are required" });
      return;
    }

    const mlPayload = {
      type_mission: projectType,
      secteur: normalizeSectorForMl(sector),
      complexity,
      nb_junior: Number(juniorCount) || 0,
      nb_senior: Number(midCount) || 0,
      nb_manager: Number(seniorCount) || 0,
      strict_deadline: Boolean(hasDeadline),
    };

    console.log("[ML predict] request", mlPayload);

    const mlResponse = await fetch(`${ML_API_URL}/predict`, {
      method: "POST",
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
      hours_min: mlData.hours_min,
      hours_likely: mlData.hours_likely,
      hours_max: mlData.hours_max,
      cost_min: mlData.cost_min,
      cost_max: mlData.cost_max,
      overrun_rate: mlData.overrun_rate,
      avg_margin_pct: mlData.avg_margin_pct,
      confidence: mlData.confidence,
      nb_similar: mlData.nb_similar,
    });

    res.json({
      hoursMin: mlData.hours_min,
      hoursLikely: mlData.hours_likely,
      hoursMax: mlData.hours_max,
      costMin: mlData.cost_min,
      costMax: mlData.cost_max,
      avgMarginPct: mlData.avg_margin_pct,
      overBudgetRate: mlData.overrun_rate,
      confidence: mlData.confidence,
      matchLevel: "ml",
      similarCount: mlData.nb_similar,
      similarProjects: Array.isArray(mlData.similar_projects)
        ? mlData.similar_projects.map((p: Record<string, unknown>) => ({
            name: String(p.client || "N/A"),
            type: String(p.type_mission || "N/A"),
            sector: String(p.secteur || "N/A"),
            actualHours: Number(p.heures_reelles) || 0,
            budgetHours: Number(p.heures_estimees) || 0,
            overBudget: Boolean(p.over_budget),
            rentPct: Number(p.margin_pct) || 0,
          }))
        : [],
    });
  } catch (err) {
    console.error("predictEstimationMl error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const importHistoricalProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ message: "No file uploaded" }); return; }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    let imported = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        const normalized = normalizeRow(row);
        const status = normalized.status?.toLowerCase();
        if (!normalized.client || !normalized.type) {
          continue;
        }
        if (status && status !== "terminé" && status !== "termine" && status !== "completed") {
          continue;
        }

        const { status: _status, ...payload } = normalized;

        await EstimationProject.create({
          ...payload,
          source: "upload",
        });
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

const buildProjectTrainingRecord = async (projectId: string) => {
  const project = await Project.findById(projectId).lean();
  if (!project || project.status !== "completed") return null;

  const client = project.clientId ? await Client.findById(project.clientId).lean() : null;
  const sector = client?.sector || project.segment || "";

  const timeAgg = await TimeEntry.aggregate([
    { $match: { projectId: project._id } },
    { $group: { _id: "$projectId", totalHours: { $sum: "$hours" } } },
  ]);
  const hReal = timeAgg.length > 0 ? Number(timeAgg[0].totalHours) : project.hoursConsumed || 0;

  const hBudget = project.budgetHours || 0;
  const overBudget = hBudget > 0 ? hReal > hBudget : false;

  return {
    projectId: project._id,
    client: project.clientName || project.name,
    type: project.type || "General",
    budgetHT: project.budgetCost || 0,
    hBudget,
    hReal,
    coutReel: project.costConsumed || 0,
    marge: project.grossMargin || 0,
    rentPct: project.marginPercent || 0,
    overBudget,
    sector,
    complexity: deriveComplexity(hBudget || hReal),
    collabPrincipal: project.responsiblePartnerName || "",
    source: "project" as const,
  };
};

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

export const retrainEstimation = async (_req: Request, res: Response): Promise<void> => {
  try {
    const upserts = await syncFromCompletedProjects();
    await EstimationMeta.findOneAndUpdate(
      {},
      { completedSinceRetrain: 0, lastRetrainedAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({ message: "Estimation data refreshed", upserts });
  } catch (err) {
    console.error("retrainEstimation error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const incrementCompletedAndMaybeRetrain = async (projectId: string): Promise<void> => {
  const meta = await EstimationMeta.findOneAndUpdate(
    {},
    { $inc: { completedSinceRetrain: 1 } },
    { upsert: true, new: true }
  );

  if ((meta?.completedSinceRetrain ?? 0) >= 10) {
    await syncFromCompletedProjects();
    await EstimationMeta.findOneAndUpdate(
      {},
      { completedSinceRetrain: 0, lastRetrainedAt: new Date() },
      { upsert: true }
    );
  }
};

export const removeProjectFromEstimation = async (projectId: string): Promise<void> => {
  await EstimationProject.deleteOne({ projectId });
};
