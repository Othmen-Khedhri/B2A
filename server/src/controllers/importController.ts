import { Response } from "express";
import * as XLSX from "xlsx";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware";
import ImportHistory from "../models/ImportHistory";
import TimeEntry from "../models/TimeEntry";
import BillingEntry from "../models/BillingEntry";
import Leave from "../models/Leave";
import Project from "../models/Project";
import Expert from "../models/Expert";
import { FileType } from "../models/ImportHistory";
import { recalcExpertLoads } from "../utils/loadRecalculator";

// ─── helpers ─────────────────────────────────────────────────────────────────

const parseDate = (val: unknown): Date => {
  if (val instanceof Date) return val;
  if (typeof val === "number") return XLSX.SSF.parse_date_code(val) as unknown as Date;
  return new Date(val as string);
};

const toNum = (val: unknown): number => Number(val) || 0;

// ─── parsers per file type ────────────────────────────────────────────────────

// Resolve the value of a column from a row, trying multiple key aliases.
const col = (row: Record<string, unknown>, ...keys: string[]): unknown => {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
  }
  // Case-insensitive fallback
  const lower = keys.map((k) => k.toLowerCase());
  for (const [k, v] of Object.entries(row)) {
    if (v !== undefined && v !== null && v !== "" && lower.includes(k.toLowerCase())) return v;
  }
  return undefined;
};

const parseTimesheets = async (rows: Record<string, unknown>[], importId: mongoose.Types.ObjectId) => {
  const errors: string[] = [];
  let count = 0;

  // Default period: first day of current month (used when the file has no Date column)
  const defaultDate = new Date();
  defaultDate.setDate(1);
  defaultDate.setHours(0, 0, 0, 0);

  // Track which projects were touched so we can recompute their metrics at the end
  const touchedProjectIds = new Set<string>();

  for (const row of rows) {
    try {
      const expertName = String(
        col(row,
          "Collaborator Name", "Collaborateur", "Nom du Collaborateur", "Nom Collaborateur",
          "Employee Name", "Employee", "Name", "Nom", "nom",
        ) || ""
      ).trim();

      const projectName = String(
        col(row,
          "Project Name", "Nom du Projet", "Nom Projet", "Projet",
          "Project", "Mission", "projet",
        ) || ""
      ).trim();

      const clientName = String(col(row, "Client", "client", "Nom du Client") || "").trim();

      const hours = toNum(
        col(row, "Hour", "Hours", "Heures", "Heures Consommées", "Durée", "hours", "heures")
      );

      if (!expertName || !projectName) {
        errors.push(`Row skipped: missing Collaborator Name or Project Name — ${JSON.stringify(row)}`);
        continue;
      }

      if (hours <= 0) {
        errors.push(`Row skipped: hours must be > 0 for ${expertName} / ${projectName}`);
        continue;
      }

      const expert = await Expert.findOne({ name: { $regex: expertName, $options: "i" } });

      // Match project by name; if ambiguous and a client is provided, narrow by clientName
      let project = await Project.findOne({ name: { $regex: projectName, $options: "i" } });
      if (!project && clientName) {
        project = await Project.findOne({
          clientName: { $regex: clientName, $options: "i" },
          name:       { $regex: projectName, $options: "i" },
        });
      }

      if (!expert)  { errors.push(`Collaborator not found: "${expertName}"`); continue; }
      if (!project) { errors.push(`Project not found: "${projectName}"${clientName ? ` (client: ${clientName})` : ""}`); continue; }

      // Use the file's date if provided, otherwise default to first day of current month
      const dateRaw = col(row, "Date", "date", "Jour", "Période", "Periode", "Period", "Mois");
      const date = dateRaw ? parseDate(dateRaw) : defaultDate;

      // Upsert: if this (expert, project, importId) already exists, update hours instead of duplicating
      const existing = await TimeEntry.findOne({
        expertId:  expert._id,
        projectId: project._id,
        importId,
      });

      if (existing) {
        const delta = hours - existing.hours;
        await existing.updateOne({ $set: { hours } });
        // Adjust the project's hoursConsumed by the delta
        await Project.findByIdAndUpdate(project._id, { $inc: { hoursConsumed: delta } });
        await Expert.findByIdAndUpdate(expert._id,   { $inc: { totalHours:    delta } });
      } else {
        await TimeEntry.create({
          expertId:    expert._id,
          expertName:  expert.name,
          projectId:   project._id,
          projectName: project.name,
          date,
          hours,
          validationStatus: "validated",
          importId,
        });

        // costConsumed for this entry = hours × expert's hourly rate
        const entryCost = hours * (Number(expert.coutHoraire) || 0);

        await Project.findByIdAndUpdate(project._id, {
          $inc: { hoursConsumed: hours, costConsumed: entryCost },
        });
        await Expert.findByIdAndUpdate(expert._id, { $inc: { totalHours: hours } });
      }

      touchedProjectIds.add((project._id as mongoose.Types.ObjectId).toString());
      count++;
    } catch (e) {
      errors.push(`Row error: ${(e as Error).message}`);
    }
  }

  // Recompute pace index and margin for every project that received new hours
  if (touchedProjectIds.size > 0) {
    await recalculatePaceIndexes(Array.from(touchedProjectIds));
  }

  return { count, errors };
};

const parseBilling = async (rows: Record<string, unknown>[], importId: mongoose.Types.ObjectId) => {
  const errors: string[] = [];
  let count = 0;

  for (const row of rows) {
    try {
      const projectName =
        (row["Project"] || row["Mission"] || row["Projet"] || "") as string;
      const invoicedAmount = toNum(row["Invoiced"] || row["Facturé"] || row["Montant facturé"] || row["invoice"]);
      const realCost = toNum(row["Cost"] || row["Coût"] || row["Coût réel"] || row["cost"]);
      const periodRaw = row["Period"] || row["Période"] || row["Month"] || row["Mois"] || new Date();

      if (!projectName) { errors.push(`Row skipped: missing project name`); continue; }

      const project = await Project.findOne({ name: { $regex: projectName.trim(), $options: "i" } });
      if (!project) { errors.push(`Project not found: ${projectName}`); continue; }

      await BillingEntry.create({
        projectId: project._id,
        projectName: project.name,
        invoicedAmount,
        realCost,
        period: parseDate(periodRaw),
        importId,
      });

      // Update project billing
      await Project.findByIdAndUpdate(project._id, {
        $inc: { invoicedAmount, costConsumed: realCost },
      });

      count++;
    } catch (e) {
      errors.push(`Row error: ${(e as Error).message}`);
    }
  }
  return { count, errors };
};

const parseLeave = async (rows: Record<string, unknown>[], importId: mongoose.Types.ObjectId) => {
  const errors: string[] = [];
  let count = 0;

  for (const row of rows) {
    try {
      const expertName = (row["Employee"] || row["Name"] || row["Employé"] || row["Collaborateur"] || "") as string;
      const dateStart = row["Start Date"] || row["Date début"] || row["Début"];
      const dateEnd = row["End Date"] || row["Date fin"] || row["Fin"];
      const rawType = (row["Type"] || row["Leave Type"] || "") as string;
      const typeMap: Record<string, "Annuel" | "Maladie" | "Exceptionnel"> = {
        annual: "Annuel", annuel: "Annuel", vacation: "Annuel", congé: "Annuel", conge: "Annuel",
        sick: "Maladie", maladie: "Maladie", illness: "Maladie",
        exceptional: "Exceptionnel", exceptionnel: "Exceptionnel", special: "Exceptionnel",
      };
      const type = typeMap[rawType.toLowerCase().trim()] ?? "Annuel";
      const days = toNum(row["Days"] || row["Jours"] || 1);

      if (!expertName || !dateStart || !dateEnd) { errors.push("Row skipped: missing fields"); continue; }

      const expert = await Expert.findOne({ name: { $regex: expertName.trim(), $options: "i" } });
      if (!expert) { errors.push(`Expert not found: ${expertName}`); continue; }

      await Leave.create({
        expertId: expert._id,
        expertName: expert.name,
        dateStart: parseDate(dateStart),
        dateEnd: parseDate(dateEnd),
        type,
        days,
        approved: true,
        importId,
      });
      count++;
    } catch (e) {
      errors.push(`Row error: ${(e as Error).message}`);
    }
  }
  return { count, errors };
};


// ─── Recompute pace index and margin for a set of projects (or all if none given) ─

const recalculatePaceIndexes = async (projectIds?: string[]) => {
  const filter = projectIds && projectIds.length > 0
    ? { _id: { $in: projectIds } }
    : {};

  const projects = await Project.find(filter);
  const now      = Date.now();

  const ops = projects.map((p) => {
    const totalMs    = p.endDate.getTime() - p.startDate.getTime();
    const elapsedRatio = totalMs > 0
      ? Math.min(Math.max((now - p.startDate.getTime()) / totalMs, 0.01), 1)
      : 1;

    const paceIndexHours     = p.budgetHours > 0 ? (p.hoursConsumed / p.budgetHours) / elapsedRatio : 0;
    const paceIndexCost      = p.budgetCost  > 0 ? (p.costConsumed  / p.budgetCost)  / elapsedRatio : 0;
    const grossMargin        = p.budgetCost - p.costConsumed;
    const marginPercent      = p.budgetCost > 0 ? (grossMargin / p.budgetCost) * 100 : 0;
    const effectiveCostPerHour = p.hoursConsumed > 0 ? p.costConsumed / p.hoursConsumed : 0;

    return {
      updateOne: {
        filter: { _id: p._id },
        update: { $set: { paceIndexHours, paceIndexCost, grossMargin, marginPercent, effectiveCostPerHour } },
      },
    };
  });

  if (ops.length > 0) await Project.bulkWrite(ops);
};

// ─── Controller ───────────────────────────────────────────────────────────────

export const importFile = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ message: "No file uploaded" });
    return;
  }

  const fileType = req.body.fileType as FileType;
  if (!["timesheets", "billing", "leave"].includes(fileType)) {
    res.status(400).json({ message: "Invalid fileType" });
    return;
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

    if (rows.length === 0) {
      res.status(400).json({ message: "Excel file is empty or has no readable rows" });
      return;
    }

    // Create import record
    const importRecord = await ImportHistory.create({
      userId: req.user!.id,
      userName: req.user!.email,
      fileName: req.file.originalname,
      fileType,
      status: "success",
    });

    let result = { count: 0, errors: [] as string[] };

    if (fileType === "timesheets") result = await parseTimesheets(rows, importRecord._id as mongoose.Types.ObjectId);
    if (fileType === "billing") result = await parseBilling(rows, importRecord._id as mongoose.Types.ObjectId);
    if (fileType === "leave") result = await parseLeave(rows, importRecord._id as mongoose.Types.ObjectId);

    if (fileType === "timesheets") {
      await recalcExpertLoads();
    } else {
      await recalculatePaceIndexes();
    }

    const status = result.errors.length === 0 ? "success" : result.count > 0 ? "partial" : "failed";
    await ImportHistory.findByIdAndUpdate(importRecord._id, {
      recordCount: result.count,
      importErrors: result.errors,
      status,
    });

    res.json({
      message: `Import complete: ${result.count} records imported`,
      recordCount: result.count,
      errors: result.errors,
      status,
    });
  } catch (err) {
    console.error("importFile error:", err);
    res.status(500).json({ message: "Import failed: " + (err as Error).message });
  }
};

export const getImportHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const history = await ImportHistory.find().sort({ date: -1 }).limit(200);
    res.json(history);
  } catch (err) {
    console.error("getImportHistory error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
