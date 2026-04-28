import { Response } from "express";
import * as XLSX from "xlsx";
import { AuthRequest } from "../middleware/authMiddleware";
import Timesheet, { ITimesheetEntry } from "../models/Timesheet";
import Expert from "../models/Expert";
import mongoose from "mongoose";
import { recalcExpertLoads } from "../utils/loadRecalculator";
import ImportHistory from "../models/ImportHistory";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Sentinel used when Client/Affaire is just "-" (internal work, no client billed)
const INTERNAL_CLIENT = "__internal__";

// Parse client name: everything before the first "-".
// If the raw value is only "-" (no client), returns the internal sentinel.
const parseClientName = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed === "-") return INTERNAL_CLIENT;
  const idx = trimmed.indexOf("-");
  if (idx === -1) return trimmed;
  const before = trimmed.substring(0, idx).trim();
  return before === "" ? INTERNAL_CLIENT : before;
};

// Parse mission: everything after the first "-".
// Returns empty string for internal entries (raw is just "-").
const parseMission = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed === "-") return "";
  const idx = trimmed.indexOf("-");
  return idx !== -1 ? trimmed.substring(idx + 1).trim() : "";
};

// ─── POST /api/timesheets/upload ──────────────────────────────────────────────
// Body: collabId (form field), file: timesheet Excel
export const uploadTimesheet = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const { collabId } = req.body;
    if (!collabId || !mongoose.Types.ObjectId.isValid(collabId)) {
      res.status(400).json({ message: "Valid collabId is required" });
      return;
    }

    const expert = await Expert.findById(collabId).select("name").lean();
    if (!expert) {
      res.status(404).json({ message: "Collaborator not found" });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

    if (!rows.length) {
      res.status(400).json({ message: "File is empty or unreadable" });
      return;
    }

    // Group entries by month/year
    const byPeriod = new Map<string, { month: number; year: number; entries: ITimesheetEntry[] }>();

    for (const row of rows) {
      const clientAffaire = row["Client/Affaire"];
      const dateVal       = row["Date"];
      const hoursVal      = row["Consommé"];
      const detail        = row["Détail"] ? String(row["Détail"]).trim() : "";
      const prestation    = row["Prestation"] ? String(row["Prestation"]).trim() : "";

      // Skip rows without the required fields
      if (!clientAffaire || !dateVal || hoursVal === null || hoursVal === undefined) continue;

      const hours = parseFloat(String(hoursVal));
      if (isNaN(hours) || hours <= 0) continue;

      let date: Date;
      if (dateVal instanceof Date) {
        date = dateVal;
      } else {
        date = new Date(String(dateVal));
      }
      if (isNaN(date.getTime())) continue;

      const month = date.getMonth() + 1;
      const year  = date.getFullYear();
      const key   = `${year}-${month}`;

      if (!byPeriod.has(key)) {
        byPeriod.set(key, { month, year, entries: [] });
      }

      byPeriod.get(key)!.entries.push({
        clientName: parseClientName(String(clientAffaire)),
        mission:    parseMission(String(clientAffaire)),
        prestation,
        date,
        hours,
        detail,
      });
    }

    if (byPeriod.size === 0) {
      res.status(400).json({ message: "No valid entries found in the file" });
      return;
    }

    // Upsert one timesheet document per period
    const results = [];
    for (const [, { month, year, entries }] of byPeriod) {
      const doc = await Timesheet.findOneAndUpdate(
        { collabId, month, year },
        {
          $set: {
            collabName: expert.name,
            entries,
            uploadedAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );
      results.push({ month, year, entries: doc.entries.length });
    }

    // Recalculate loads in the background — don't block the response
    recalcExpertLoads().catch((e) => console.error("recalcExpertLoads error:", e));

    const totalEntries = results.reduce((s, r) => s + r.entries, 0);
    ImportHistory.create({
      userId:       req.user?.id ?? collabId,
      userName:     req.user?.email ?? expert.name,
      fileName:     req.file.originalname,
      fileType:     "timesheet",
      recordCount:  totalEntries,
      importErrors: [],
      status:       "success",
    }).catch(() => {});

    res.json({
      message:  "Timesheet uploaded successfully",
      collab:   expert.name,
      periods:  results,
    });
  } catch (err) {
    console.error("uploadTimesheet error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/timesheets/:year/:month ─────────────────────────────────────────
export const getTimesheetsByPeriod = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const year  = Number(req.params.year);
    const month = Number(req.params.month);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      res.status(400).json({ message: "Invalid year or month" });
      return;
    }
    const sheets = await Timesheet.find({ year, month }).lean();
    res.json(sheets);
  } catch (err) {
    console.error("getTimesheetsByPeriod error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/timesheets/:year/:month/:collabId ───────────────────────────────
export const getCollabTimesheet = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { year, month, collabId } = req.params;
    const y = Number(year);
    const m = Number(month);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      res.status(400).json({ message: "Invalid year or month" });
      return;
    }
    const sheet = await Timesheet.findOne({
      collabId,
      year:  y,
      month: m,
    }).lean();
    if (!sheet) {
      res.status(404).json({ message: "Timesheet not found" });
      return;
    }
    res.json(sheet);
  } catch (err) {
    console.error("getCollabTimesheet error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/timesheets/client/:clientName/:year ─────────────────────────────
// Returns per-month consumed hours for a client across all collabs
export const getClientTimesheetSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const year       = Number(req.params.year);
    const clientName = decodeURIComponent(req.params.clientName);

    const sheets = await Timesheet.find({ year }).lean();

    // Aggregate per month
    const perMonth: Record<number, { consumed: number; entries: ITimesheetEntry[]; collabs: Set<string> }> = {};

    for (const sheet of sheets) {
      for (const entry of sheet.entries) {
        if (entry.clientName === INTERNAL_CLIENT) continue;
        if (entry.clientName.toLowerCase() !== clientName.toLowerCase()) continue;
        const m = new Date(entry.date).getMonth() + 1;
        if (!perMonth[m]) {
          perMonth[m] = { consumed: 0, entries: [], collabs: new Set() };
        }
        perMonth[m].consumed += entry.hours;
        perMonth[m].entries.push({
          ...entry,
          collabName: sheet.collabName,
          collabId:   String(sheet.collabId),
        } as ITimesheetEntry & { collabName: string; collabId: string });
        perMonth[m].collabs.add(sheet.collabName);
      }
    }

    // Convert to array sorted by month
    const result = Object.entries(perMonth)
      .map(([month, data]) => ({
        month:    Number(month),
        consumed: data.consumed,
        collabs:  Array.from(data.collabs),
        entries:  data.entries,
      }))
      .sort((a, b) => a.month - b.month);

    res.json(result);
  } catch (err) {
    console.error("getClientTimesheetSummary error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/timesheets/status/:year/:month ──────────────────────────────────
// Returns which collabs have/haven't submitted timesheets for a given month
export const getTimesheetStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const year  = Number(req.params.year);
    const month = Number(req.params.month);

    const [allCollabs, submitted] = await Promise.all([
      Expert.find({ role: { $in: ["collaborator", "worker"] } }).select("_id name").lean(),
      Timesheet.find({ year, month }).select("collabId collabName uploadedAt").lean(),
    ]);

    const submittedIds = new Set(submitted.map((s) => String(s.collabId)));

    const status = allCollabs.map((c) => ({
      collabId:    String(c._id),
      collabName:  c.name,
      submitted:   submittedIds.has(String(c._id)),
      uploadedAt:  submitted.find((s) => String(s.collabId) === String(c._id))?.uploadedAt ?? null,
    }));

    res.json({ year, month, status });
  } catch (err) {
    console.error("getTimesheetStatus error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── DELETE /api/timesheets/:id ───────────────────────────────────────────────
export const deleteTimesheet = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await Timesheet.findByIdAndDelete(id);
    recalcExpertLoads().catch((e) => console.error("recalcExpertLoads error:", e));
    res.json({ message: "Timesheet deleted" });
  } catch (err) {
    console.error("deleteTimesheet error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
