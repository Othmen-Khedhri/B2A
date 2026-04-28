import { Response } from "express";
import * as XLSX from "xlsx";
import { AuthRequest } from "../middleware/authMiddleware";
import AnnualBudget from "../models/AnnualBudget";
import ImportHistory from "../models/ImportHistory";

// ─── POST /api/budget/import ──────────────────────────────────────────────────
// Upload and parse liste des budgets.xlsx, upsert into DB
export const importBudget = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) {
      res.status(400).json({ message: "File is empty or unreadable" });
      return;
    }

    // Return detected columns so the admin can verify the mapping
    const detectedColumns = rows[0] ? Object.keys(rows[0]) : [];
    console.log("[importBudget] columns found:", detectedColumns);
    console.log("[importBudget] first row sample:", rows[0]);

    const ops = rows
      .filter((row) => row["Client"] && row["Annee"])
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

    const result = await AnnualBudget.bulkWrite(ops);

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
      upserted:        result.upsertedCount,
      modified:        result.modifiedCount,
      total:           ops.length,
      detectedColumns,
    });
  } catch (err) {
    console.error("importBudget error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/budget/:year ────────────────────────────────────────────────────
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
