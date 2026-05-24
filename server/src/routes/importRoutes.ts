// ─── Generic import routes ────────────────────────────────────────────────────
// Mounted at: /api/import
//
// This is the general-purpose import dispatcher. A single POST endpoint accepts
// any supported Excel file and a "type" field in the request body to determine
// what kind of data to import.
//
// Supported import types (set via req.body.type):
//   "timesheets" — parse timesheet hours by collab × client × month
//   "billing"    — parse billing entries (invoiced amount, real cost) per project
//   "leave"      — parse collaborator leave records (Annuel, Maladie, Exceptionnel)
//
// Endpoint summary:
//
//   POST /         — import an Excel file (admin only)
//                    importFile() dispatches to the appropriate parser based on type.
//                    On success, creates an ImportHistory record (fire-and-forget).
//                    On re-import, only the delta is applied (existing rows are upserted).
//
//   GET  /history  — list past imports (all authenticated users)
//                    Returns ImportHistory documents sorted newest-first, including
//                    filename, type, status (success/partial/failed), and row counts.
//
// Authorization:
//   Importing is restricted to admins because it overwrites live financial and HR data.
//   Reading history is open to all authenticated users for transparency.
//
// File upload:
//   multer.memoryStorage() — the Excel buffer is processed in-memory by ExcelJS.
//   The file is never written to disk, keeping the server stateless.

import { Router } from "express";
import multer from "multer";
import { importFile, getImportHistory } from "../controllers/importController";
import { protect, authorize } from "../middleware/authMiddleware";

// In-memory storage — file buffer consumed immediately by the parser.
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// Admin-only import — modifies financial and HR data
router.post("/",       protect, authorize("admin"), upload.single("file"), importFile);

// All authenticated users can review import history
router.get("/history", protect, getImportHistory);

export default router;
