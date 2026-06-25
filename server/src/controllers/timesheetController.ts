// ─── Timesheet controller ─────────────────────────────────────────────────────
// Handles per-collaborator monthly timesheet operations:
//
//   POST   /api/timesheets/upload               — parse and store an Excel timesheet
//   GET    /api/timesheets/:year/:month          — all timesheets for a given month
//   GET    /api/timesheets/:year/:month/:collabId — one collab's timesheet
//   GET    /api/timesheets/client/:clientName/:year — per-month hours for a client
//   GET    /api/timesheets/status/:year/:month    — who has/hasn't submitted
//   DELETE /api/timesheets/:id                   — delete a timesheet document

import { Response } from "express";
import * as XLSX from "xlsx";
import { AuthRequest } from "../middleware/authMiddleware";
import Timesheet, { ITimesheetEntry } from "../models/Timesheet";
import Expert from "../models/Expert";
import mongoose from "mongoose";
import { recalcExpertLoads } from "../utils/loadRecalculator";
import ImportHistory from "../models/ImportHistory";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Sentinel stored in clientName when the raw "Client/Affaire" cell is just "-".
// These entries represent internal B2A work — not billed to any client.
const INTERNAL_CLIENT = "__internal__";

// Parses the client name from the "Client/Affaire" column.
// Format: "ClientName - MissionName"
// If the cell is just "-", returns the internal sentinel.
const parseClientName = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed === "-") return INTERNAL_CLIENT;
  const idx = trimmed.indexOf("-");
  if (idx === -1) return trimmed; // no "-" at all — the entire cell is the client name
  const before = trimmed.substring(0, idx).trim();
  return before === "" ? INTERNAL_CLIENT : before;
};

// Parses the mission name from the same "Client/Affaire" column.
// Returns everything after the first "-".
const parseMission = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed === "-") return ""; // internal work has no mission name
  const idx = trimmed.indexOf("-");
  return idx !== -1 ? trimmed.substring(idx + 1).trim() : "";
};

// ─── POST /api/timesheets/upload ──────────────────────────────────────────────
// Multer stores the uploaded file in memory (req.file.buffer).
// Body must include collabId (the Expert's MongoDB _id).
// One timesheet document per collab per month — re-uploading replaces the previous one.
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

    // Verify the collaborator exists before processing the file
    const expert = await Expert.findById(collabId).select("name").lean();
    if (!expert) {
      res.status(404).json({ message: "Collaborator not found" });
      return;
    }

    // Parse the Excel file from the in-memory buffer
    // cellDates:true tells xlsx to parse date cells as JavaScript Date objects
    const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const sheet    = workbook.Sheets[workbook.SheetNames[0]]; // always use the first sheet
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

    if (!rows.length) {
      res.status(400).json({ message: "File is empty or unreadable" });
      return;
    }

    // Group rows by month/year so each period gets its own Timesheet document
    const byPeriod = new Map<string, { month: number; year: number; entries: ITimesheetEntry[] }>();

    for (const row of rows) {
      const clientAffaire = row["Client/Affaire"]; // e.g. "Cabinet Dupont - Fiche de Paie"
      const dateVal       = row["Date"];
      const hoursVal      = row["Consommé"];       // hours worked
      const detail        = row["Détail"]     ? String(row["Détail"]).trim()     : "";
      const prestation    = row["Prestation"] ? String(row["Prestation"]).trim() : ""; // COMPTA, Audit, etc.

      // Skip rows that are missing any required field
      if (!clientAffaire || !dateVal || hoursVal === null || hoursVal === undefined) continue;

      const hours = parseFloat(String(hoursVal));
      if (isNaN(hours) || hours <= 0) continue; // skip zero or negative hours

      // Normalise the date — xlsx may return a JS Date or a string depending on cell format
      let date: Date;
      if (dateVal instanceof Date) {
        date = dateVal;
      } else {
        date = new Date(String(dateVal));
      }
      if (isNaN(date.getTime())) continue; // skip rows with unparseable dates

      const month = date.getUTCMonth() + 1; // 1-indexed; use UTC to avoid timezone shifting xlsx dates
      const year  = date.getUTCFullYear();
      const key   = `${year}-${month}`; // map key groups rows by period

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

    // Upsert one Timesheet document per period
    // findOneAndUpdate with upsert:true creates if not exists, overwrites if it does
    const results = [];
    for (const [, { month, year, entries }] of byPeriod) {
      const doc = await Timesheet.findOneAndUpdate(
        { collabId, month, year },            // find by this collab + period
        {
          $set: {
            collabName: expert.name,
            entries,                           // replace ALL entries with the new file contents
            uploadedAt: new Date(),
          },
        },
        { upsert: true, new: true }           // create if not found; return the new document
      );
      results.push({ month, year, entries: doc.entries.length });
    }

    // Recalculate expert loads in the background — don't block the HTTP response
    recalcExpertLoads().catch((e) => console.error("recalcExpertLoads error:", e));

    const totalEntries = results.reduce((s, r) => s + r.entries, 0);

    // Record this import in the history table
    ImportHistory.create({
      userId:       req.user?.id ?? collabId,
      userName:     req.user?.email ?? expert.name,
      fileName:     req.file.originalname,
      fileType:     "timesheet",
      recordCount:  totalEntries,
      importErrors: [],
      status:       "success",
    }).catch(() => {}); // fire-and-forget; failure should not break the upload response

    res.json({
      message: "Timesheet uploaded successfully",
      collab:  expert.name,
      periods: results,
    });
  } catch (err) {
    console.error("uploadTimesheet error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/timesheets/:year/:month ─────────────────────────────────────────
// Returns all Timesheet documents for the given month.
// Used by the Timesheets page to list all submitted timesheets.
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
// Returns a single collaborator's timesheet for the given month.
export const getCollabTimesheet = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { year, month, collabId } = req.params;
    const y = Number(year);
    const m = Number(month);
    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      res.status(400).json({ message: "Invalid year or month" });
      return;
    }
    const sheet = await Timesheet.findOne({ collabId, year: y, month: m }).lean();
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
// Aggregates per-month consumed hours for a given client across ALL collaborators.
// Used by the ProjectDetail page (Tab 1 — Missions) to build the timeline.
export const getClientTimesheetSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const year       = Number(req.params.year);
    const clientName = decodeURIComponent(req.params.clientName as string);

    // Load all timesheets for the year and filter entries by client name
    const sheets = await Timesheet.find({ year }).lean();

    const perMonth: Record<number, { consumed: number; entries: ITimesheetEntry[]; collabs: Set<string> }> = {};

    for (const sheet of sheets) {
      for (const entry of sheet.entries) {
        if (entry.clientName === INTERNAL_CLIENT) continue;
        if (entry.clientName.toLowerCase() !== clientName.toLowerCase()) continue;
        const m = new Date(entry.date).getUTCMonth() + 1;
        if (!perMonth[m]) {
          perMonth[m] = { consumed: 0, entries: [], collabs: new Set() };
        }
        perMonth[m].consumed += entry.hours;
        // Attach collab info to each entry for the mission breakdown table
        perMonth[m].entries.push({
          ...entry,
          collabName: sheet.collabName,
          collabId:   String(sheet.collabId),
        } as ITimesheetEntry & { collabName: string; collabId: string });
        perMonth[m].collabs.add(sheet.collabName);
      }
    }

    // Convert to a sorted array (month 1 → 12)
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
// Returns which collaborators have and haven't submitted their timesheet.
// Used by the Overview Budget Stats panel and Timesheets page.
export const getTimesheetStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const year  = Number(req.params.year);
    const month = Number(req.params.month);

    const [allCollabs, submitted] = await Promise.all([
      // All active collaborators (not admins, not workers)
      Expert.find({ role: "collaborator" }).select("_id name").lean(),
      // Which ones have submitted for this period
      Timesheet.find({ year, month }).select("collabId collabName uploadedAt").lean(),
    ]);

    const submittedIds = new Set(submitted.map((s) => String(s.collabId)));

    // Build one status record per collaborator
    const status = allCollabs.map((c) => ({
      collabId:   String(c._id),
      collabName: c.name,
      submitted:  submittedIds.has(String(c._id)),
      uploadedAt: submitted.find((s) => String(s.collabId) === String(c._id))?.uploadedAt ?? null,
    }));

    res.json({ year, month, status });
  } catch (err) {
    console.error("getTimesheetStatus error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── DELETE /api/timesheets/:id ───────────────────────────────────────────────
// Deletes a timesheet document and recalculates expert loads to reflect the removal.
export const deleteTimesheet = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await Timesheet.findByIdAndDelete(id);
    // Update the collab's currentLoad now that entries are gone
    recalcExpertLoads().catch((e) => console.error("recalcExpertLoads error:", e));
    res.json({ message: "Timesheet deleted" });
  } catch (err) {
    console.error("deleteTimesheet error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
