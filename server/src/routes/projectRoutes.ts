// ─── Project routes ───────────────────────────────────────────────────────────
// Mounted at: /api/projects
//
// IMPORTANT: Named routes (/pace, /import, /repair-data) MUST be declared
// before the /:id parameter route. Express matches routes in order — if /:id
// comes first, "pace", "import", and "repair-data" would be interpreted as
// project IDs and the correct handler would never be called.
//
//   GET  /pace                 — pace report for all active projects (any authenticated user)
//   POST /pace/notify          — send pace alert emails (admin, manager)
//   POST /import               — bulk import projects from Excel (admin, manager)
//   POST /repair-data          — admin repair: re-aggregate hours from TimeEntry (admin only)
//   GET  /                     — list all projects (filterable)
//   GET  /:id                  — one project + time entries + charts
//   POST /                     — create a project (admin, manager)
//   PUT  /:id                  — update a project (admin, manager)
//   DELETE /:id                — delete a project + cascade (admin only)

import { Router } from "express";
import multer from "multer";
import { getProjects, getProjectById, createProject, updateProject, deleteProject, repairProjectsData } from "../controllers/projectController";
import { getPaceReport, sendPaceAlerts } from "../controllers/paceController";
import { importProjects } from "../controllers/projectImportController";
import { protect, authorize } from "../middleware/authMiddleware";

// Memory storage — Excel file is parsed immediately from buffer, never written to disk
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// ── Named routes — must be before /:id ────────────────────────────────────────
router.get("/pace",         protect, getPaceReport);
router.post("/pace/notify", protect, authorize("admin", "manager"), sendPaceAlerts);
router.post("/import",      protect, authorize("admin", "manager"), upload.single("file"), importProjects);
router.post("/repair-data", protect, authorize("admin"), repairProjectsData);

// ── Standard CRUD ─────────────────────────────────────────────────────────────
router.get("/",     protect, getProjects);
router.get("/:id",  protect, getProjectById);
router.post("/",    protect, authorize("admin", "manager"), createProject);
router.put("/:id",  protect, authorize("admin", "manager"), updateProject);
router.delete("/:id", protect, authorize("admin"), deleteProject);

export default router;
