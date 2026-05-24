// ─── Annual budget routes ──────────────────────────────────────────────────────
// Mounted at: /api/budgets
//
// "Annual budgets" (AnnualBudget documents) store the firm's planned hours
// and financial targets for each client for a given calendar year, broken down
// month by month. They are the backbone of the Pace Index feature.
//
// Endpoint summary:
//
//   POST /import               — bulk import budgets from an Excel file (admin, manager)
//                                Uses bulkWrite with upsert:true keyed on (year, clientName)
//                                so re-importing the same file is idempotent.
//   GET  /:year                — fetch all client budgets for a given year
//   GET  /:year/:clientName    — fetch the budget for one specific client in a year
//   DELETE /:year              — delete all budget entries for a given year (admin only)
//                                Used when re-importing a corrected annual budget file.
//
// IMPORTANT: The named /import route must be declared before /:year so Express
// does not treat the string "import" as a year value.
//
// File upload notes:
//   - multer.memoryStorage() — the Excel buffer stays in RAM, never written to disk.
//   - importBudget() reads column names in French (Annee, Client, Budgethoraireestime…)
//     and maps them to AnnualBudget fields internally.

import { Router } from "express";
import multer from "multer";
import { protect } from "../middleware/authMiddleware";
import {
  importBudget,
  getBudgetByYear,
  getBudgetClient,
  deleteBudgetYear,
  deleteBudgetClient,
} from "../controllers/budgetController";

const router = Router();

// In-memory buffer — Excel file is parsed immediately without touching disk.
const upload = multer({ storage: multer.memoryStorage() });

// ── Named route first (before /:year) ─────────────────────────────────────────
router.post("/import",           protect, upload.single("file"), importBudget);

// ── Read routes ───────────────────────────────────────────────────────────────
router.get("/:year",             protect, getBudgetByYear);
router.get("/:year/:clientName", protect, getBudgetClient);

// ── Delete routes ─────────────────────────────────────────────────────────────
router.delete("/:year/:clientName", protect, deleteBudgetClient);
router.delete("/:year",             protect, deleteBudgetYear);

export default router;
