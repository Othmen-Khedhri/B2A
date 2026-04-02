import { Response } from "express";
import * as XLSX from "xlsx";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/authMiddleware";
import ImportHistory from "../models/ImportHistory";
import TimeEntry from "../models/TimeEntry";
import BillingEntry from "../models/BillingEntry";
import Conge from "../models/Conge";
import Project from "../models/Project";
import Expert from "../models/Expert";
import { FileType } from "../models/ImportHistory";

// ─── helpers ─────────────────────────────────────────────────────────────────

const parseDate = (val: unknown): Date => {
  if (val instanceof Date) return val;
  if (typeof val === "number") return XLSX.SSF.parse_date_code(val) as unknown as Date;
  return new Date(val as string);
};

const toNum = (val: unknown): number => Number(val) || 0;

// ─── parsers per file type ────────────────────────────────────────────────────

const parseTimesheets = async (rows: Record<string, unknown>[], importId: mongoose.Types.ObjectId) => {
  const errors: string[] = [];
  let count = 0;

  for (const row of rows) {
    try {
      const expertName =
        (row["Employee Name"] || row["Name"] || row["Collaborateur"] || row["nom"] || "") as string;
      const projectName =
        (row["Project"] || row["Project Name"] || row["Mission"] || row["projet"] || "") as string;
      const dateRaw = row["Date"] || row["date"] || row["Jour"];
      const hours = toNum(row["Hours"] || row["Heures"] || row["Durée"] || row["hours"]);

      if (!expertName || !projectName || !dateRaw) {
        errors.push(`Row skipped: missing required fields — ${JSON.stringify(row)}`);
        continue;
      }

      const expert = await Expert.findOne({ name: { $regex: expertName.trim(), $options: "i" } });
      const project = await Project.findOne({ name: { $regex: projectName.trim(), $options: "i" } });

      if (!expert) { errors.push(`Expert not found: ${expertName}`); continue; }
      if (!project) { errors.push(`Project not found: ${projectName}`); continue; }

      await TimeEntry.create({
        expertId: expert._id,
        expertName: expert.name,
        projectId: project._id,
        projectName: project.name,
        date: parseDate(dateRaw),
        hours,
        importId,
      });

      // Update project hours consumed
      await Project.findByIdAndUpdate(project._id, { $inc: { hoursConsumed: hours } });
      // Update expert load
      await Expert.findByIdAndUpdate(expert._id, { $inc: { currentLoad: hours, totalHours: hours } });

      count++;
    } catch (e) {
      errors.push(`Row error: ${(e as Error).message}`);
    }
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
      const type = (row["Type"] || row["Leave Type"] || "Annual") as string;
      const days = toNum(row["Days"] || row["Jours"] || 1);

      if (!expertName || !dateStart || !dateEnd) { errors.push("Row skipped: missing fields"); continue; }

      const expert = await Expert.findOne({ name: { $regex: expertName.trim(), $options: "i" } });
      if (!expert) { errors.push(`Expert not found: ${expertName}`); continue; }

      await Conge.create({
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

const parseBudgets = async (rows: Record<string, unknown>[], importId: mongoose.Types.ObjectId) => {
  const errors: string[] = [];
  let count = 0;

  for (const row of rows) {
    try {
      const name = (row["Project"] || row["Mission"] || row["Projet"] || row["Name"] || "") as string;
      const clientName = (row["Client"] || "") as string;
      const budgetHours = toNum(row["Budget Hours"] || row["Heures budget"] || 0);
      const budgetCost = toNum(row["Budget Cost"] || row["Budget coût"] || row["Budget"] || 0);
      const startDate = row["Start Date"] || row["Date début"] || new Date();
      const endDate = row["End Date"] || row["Date fin"] || new Date();
      const partnerName = (row["Partner"] || row["Responsable"] || "") as string;
      const type = (row["Type"] || "General") as string;

      if (!name) { errors.push("Row skipped: missing project name"); continue; }

      await Project.findOneAndUpdate(
        { name: { $regex: name.trim(), $options: "i" } },
        {
          name: name.trim(),
          clientName,
          budgetHours,
          budgetCost,
          startDate: parseDate(startDate),
          endDate: parseDate(endDate),
          responsiblePartnerName: partnerName,
          type,
        },
        { upsert: true, new: true }
      );
      count++;
    } catch (e) {
      errors.push(`Row error: ${(e as Error).message}`);
    }
  }
  return { count, errors };
};

// ─── Recalculate Pace Index for all active projects ───────────────────────────

const recalculatePaceIndexes = async () => {
  const projects = await Project.find({ status: "active" });
  const now = new Date();

  for (const p of projects) {
    const totalMs = p.endDate.getTime() - p.startDate.getTime();
    const elapsedMs = now.getTime() - p.startDate.getTime();
    const timeElapsed = Math.min(Math.max(elapsedMs / totalMs, 0.01), 1);

    const paceIndexHours =
      p.budgetHours > 0
        ? (p.hoursConsumed / p.budgetHours) / timeElapsed
        : 0;

    const paceIndexCost =
      p.budgetCost > 0
        ? (p.costConsumed / p.budgetCost) / timeElapsed
        : 0;

    const grossMargin = p.invoicedAmount - p.costConsumed;
    const marginPercent = p.invoicedAmount > 0 ? (grossMargin / p.invoicedAmount) * 100 : 0;
    const effectiveCostPerHour = p.hoursConsumed > 0 ? p.costConsumed / p.hoursConsumed : 0;

    await Project.findByIdAndUpdate(p._id, {
      paceIndexHours,
      paceIndexCost,
      grossMargin,
      marginPercent,
      effectiveCostPerHour,
    });
  }
};

// ─── Controller ───────────────────────────────────────────────────────────────

export const importFile = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ message: "No file uploaded" });
    return;
  }

  const fileType = req.body.fileType as FileType;
  if (!["timesheets", "billing", "leave", "budgets"].includes(fileType)) {
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
    if (fileType === "budgets") result = await parseBudgets(rows, importRecord._id as mongoose.Types.ObjectId);

    // Recalculate pace indexes after any import
    await recalculatePaceIndexes();

    const status = result.errors.length === 0 ? "success" : result.count > 0 ? "partial" : "failed";
    await ImportHistory.findByIdAndUpdate(importRecord._id, {
      recordCount: result.count,
      errors: result.errors,
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
    const history = await ImportHistory.find().sort({ date: -1 }).limit(50);
    res.json(history);
  } catch (err) {
    console.error("getImportHistory error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
