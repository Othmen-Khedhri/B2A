// ─── Timesheet routes ─────────────────────────────────────────────────────────
// Mounted at: /api/timesheets
//
// A "timesheet" in this system is one Timesheet document per collaborator per
// calendar month. It stores that person's declared worked hours across all
// clients for that period, plus a submission status (draft / submitted).
//
// Endpoint summary:
//
//   POST /upload                       — parse & import an Excel timesheet file
//                                        (any authenticated user can upload their own)
//   GET  /status/:year/:month          — get submission status for every collab
//                                        in the given period (who has/hasn't submitted)
//   GET  /client/:clientName/:year     — all timesheets for one client across the year
//                                        (used by the client detail billing view)
//   GET  /:year/:month                 — all timesheets for a given month
//   GET  /:year/:month/:collabId       — one collaborator's timesheet for a month
//   DELETE /:id                        — delete a timesheet document
//
// IMPORTANT: Named routes (/upload, /status/:…, /client/:…) must appear before
// the generic /:year/:month pattern to avoid Express treating "upload", "status",
// or "client" as a year value. Express matches routes in declaration order.
//
// File upload notes:
//   - Excel files are parsed entirely from memory — no disk write occurs.
//   - multer.memoryStorage() places the file in req.file.buffer, which
//     ExcelJS reads directly. This keeps the server stateless and avoids
//     leftover temp files.

import { Router } from "express";
import multer from "multer";
import { protect } from "../middleware/authMiddleware";
import {
  uploadTimesheet,
  getTimesheetsByPeriod,
  getCollabTimesheet,
  getClientTimesheetSummary,
  getTimesheetStatus,
  deleteTimesheet,
} from "../controllers/timesheetController";

const router = Router();

// In-memory storage — the Excel buffer is consumed immediately by the parser;
// nothing is ever written to disk.
const upload = multer({ storage: multer.memoryStorage() });

// ── Named routes — must come before /:year/:month to avoid param mis-matching ─
router.post("/upload",                  protect, upload.single("file"), uploadTimesheet);
router.get("/status/:year/:month",      protect, getTimesheetStatus);
router.get("/client/:clientName/:year", protect, getClientTimesheetSummary);

// ── Period + collab lookup routes ─────────────────────────────────────────────
router.get("/:year/:month",             protect, getTimesheetsByPeriod);
router.get("/:year/:month/:collabId",   protect, getCollabTimesheet);

// ── Delete ────────────────────────────────────────────────────────────────────
router.delete("/:id",                   protect, deleteTimesheet);

export default router;
