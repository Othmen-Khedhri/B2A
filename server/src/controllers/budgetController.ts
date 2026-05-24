// ─── Budget controller ────────────────────────────────────────────────────────
// Manages annual client budgets (the AnnualBudget collection).
// Each document stores the financial plan for one client for one year:
//   clientName, year, primaryCollab, secondaryCollab,
//   financialBudget (€), internalHours (h), clientHours (h)
//
// Endpoints:
//   POST   /api/budget/import              — upload an Excel file to bulk-upsert budgets
//   GET    /api/budget/:year               — all budgets for a given year
//   GET    /api/budget/:year/:clientName   — one client's budget for a year
//   DELETE /api/budget/:year               — delete all budget records for a year

import { Response } from "express";
import * as XLSX from "xlsx";
import { AuthRequest } from "../middleware/authMiddleware";
import AnnualBudget from "../models/AnnualBudget";
import ImportHistory from "../models/ImportHistory";

// ─── POST /api/budget/import ──────────────────────────────────────────────────
// Parses "liste des budgets.xlsx" (or any compatible Excel file) and upserts
// all rows into the AnnualBudget collection.
//
// Expected columns in the Excel sheet:
//   Annee                   — the fiscal year (number)
//   Client                  — client name (string)
//   Collaborateur           — primary responsible collab name
//   CollaborateursSecondaires — secondary collab name (optional)
//   Budget                  — total financial budget in euros
//   Budgethoraireestime     — estimated internal hours
//   Budgetenvaleur          — client-facing hours budget
//
// Rows missing "Client" or "Annee" are skipped — they can't form a valid key.
// All other rows are upserted: existing budget is overwritten, new ones are created.
export const importBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    // Parse the Excel file from the Multer in-memory buffer (no temp file needed)
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]]; // always the first sheet
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) {
      res.status(400).json({ message: "File is empty or unreadable" });
      return;
    }

    // Capture the column names as detected — returned to the frontend for debugging
    const detectedColumns = rows[0] ? Object.keys(rows[0]) : [];

    // Build one bulkWrite operation per valid row.
    // updateOne + upsert:true = "insert if not found, replace fields if found".
    // The unique key is (year, clientName) — re-importing a year replaces all values.
    const ops = rows
      .filter((row) => row["Client"] && row["Annee"]) // skip incomplete rows
      .map((row) => ({
        updateOne: {
          filter: {
            year:       Number(row["Annee"]),
            clientName: String(row["Client"]).trim(),
          },
          update: {
            $set: {
              year:            Number(row["Annee"]),
              clientName:      String(row["Client"]).trim(),
              primaryCollab:   row["Collaborateur"]             ? String(row["Collaborateur"]).trim()             : "",
              secondaryCollab: row["CollaborateursSecondaires"] ? String(row["CollaborateursSecondaires"]).trim() : "",
              financialBudget: Number(row["Budget"])               || 0,
              internalHours:   Number(row["Budgethoraireestime"]) || 0,
              clientHours:     Number(row["Budgetenvaleur"])       || 0,
            },
          },
          upsert: true,
        },
      }));

    // Execute all upserts in one MongoDB round-trip
    const result = await AnnualBudget.bulkWrite(ops);

    // Record the import in history — fire-and-forget, failure doesn't break the response
    await ImportHistory.create({
      userId:       req.user!.id,
      userName:     req.user!.email,
      fileName:     req.file.originalname,
      fileType:     "budget",
      recordCount:  ops.length,
      importErrors: [],
      status:       "success",
    }).catch(() => {});

    res.json({
      message:         "Budget imported successfully",
      upserted:        result.upsertedCount,  // rows that were newly created
      modified:        result.modifiedCount,  // rows that already existed and were updated
      total:           ops.length,
      detectedColumns,                        // helps the frontend warn if columns look wrong
    });
  } catch (err) {
    console.error("importBudget error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/budget/:year ────────────────────────────────────────────────────
// Returns all budget records for a given year, sorted alphabetically by client name.
// Used by the Budget page to display the full client list.
export const getBudgetByYear = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const year = Number(req.params.year);
    const budgets = await AnnualBudget.find({ year }).sort({ clientName: 1 }).lean();
    res.json(budgets);
  } catch (err) {
    console.error("getBudgetByYear error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/budget/:year/:clientName ───────────────────────────────────────
// Returns a single client's budget for a given year.
// clientName is URL-encoded on the frontend (e.g. "Cabinet%20Dupont").
// Used by the ProjectDetail page to display the allocated budget alongside consumed hours.
export const getBudgetClient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const year       = Number(req.params.year);
    const clientName = decodeURIComponent(req.params.clientName);
    const budget = await AnnualBudget.findOne({ year, clientName }).lean();
    if (!budget) {
      res.status(404).json({ message: "Client not found in budget" });
      return;
    }
    res.json(budget);
  } catch (err) {
    console.error("getBudgetClient error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── DELETE /api/budget/:year ─────────────────────────────────────────────────
// Deletes ALL budget records for a given year.
// Used when re-importing a corrected Excel file — the admin first wipes the year,
// then re-imports the corrected file to start clean.
export const deleteBudgetYear = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const year = Number(req.params.year);
    const result = await AnnualBudget.deleteMany({ year });
    res.json({ message: `Deleted ${result.deletedCount} entries for year ${year}` });
  } catch (err) {
    console.error("deleteBudgetYear error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── DELETE /api/budget/:year/:clientName ─────────────────────────────────────
// Deletes a single client's budget entry for the given year.
export const deleteBudgetClient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const year       = Number(req.params.year);
    const clientName = decodeURIComponent(req.params.clientName);
    const result = await AnnualBudget.deleteOne({ year, clientName });
    if (result.deletedCount === 0) {
      res.status(404).json({ message: "Budget entry not found" });
      return;
    }
    res.json({ message: `Deleted budget for ${clientName} in ${year}` });
  } catch (err) {
    console.error("deleteBudgetClient error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
