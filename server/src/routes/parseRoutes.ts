// ─── Parse routes ─────────────────────────────────────────────────────────────
// Mounted at: /api/parse
//
// The "parse" feature pre-processes raw timesheet Excel files exported from the
// firm's external time-tracking tool before they can be imported into the system.
// The raw exports often have merged rows (continuation rows with an empty first
// cell), which need to be reassembled into clean single rows.
//
// This is a port of the original Python `merge.py` script into Node.js.
// The core logic lives in parseController.processSheet(), which:
//   1. Finds the header row by scanning for "client" in the first cell.
//   2. Merges continuation rows (empty first cell) into their parent row
//      using a " | " separator for multi-value cells.
//   3. Returns the cleaned data as a new Excel workbook.
//
// Authentication: Both endpoints require authentication AND admin/manager role.
// Instead of repeating the middleware on every route, router.use() applies them
// to the entire router — every route below is automatically protected.
// This is equivalent to:  router.post("/preview", protect, authorize("admin","manager"), ...)
// but avoids duplication.
//
// Endpoint summary:
//
//   POST /preview  — accepts an Excel file and returns a JSON preview of what the
//                    cleaned output would look like (sheet names, row counts, sample rows).
//                    Used by the frontend to let the user confirm before committing.
//                    Handled by parseController.previewSheets().
//
//   POST /run      — accepts the same Excel file and returns a ZIP archive containing
//                    one cleaned .xlsx file per sheet. The user downloads the ZIP and
//                    then re-imports the cleaned sheets via the standard import flow.
//                    Handled by parseController.parseTimesheetFile().
//                    Uses the `archiver` library to build the ZIP in-memory.
//
// File upload:
//   The `upload` middleware is exported directly from parseController.ts (not defined
//   here) because the controller also defines the multer configuration (memory storage,
//   allowed MIME types). This keeps the upload config co-located with the parser.

import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware";
import { upload, parseTimesheetFile, previewSheets } from "../controllers/parseController";

const router = Router();

// Apply auth to every route in this file — no need to repeat on each route.
router.use(protect);
router.use(authorize("admin", "manager"));

// ── Parse endpoints ───────────────────────────────────────────────────────────
router.post("/preview", upload.single("file"), previewSheets);      // JSON preview
router.post("/run",     upload.single("file"), parseTimesheetFile);  // ZIP download

export default router;
