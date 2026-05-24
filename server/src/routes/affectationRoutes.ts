// ─── Affectation routes ───────────────────────────────────────────────────────
// Mounted at: /api/affectations
//
// "Affectations" are a derived, read-only mirror of which experts are assigned
// to which active projects. The Affectation collection is kept in sync with
// Project.assignedStaff — it is NEVER edited directly through the API (no PUT
// or DELETE endpoints here). Changes always flow through the project update path.
//
// Why a separate Affectation collection instead of always querying Project?
//   Fast "who is assigned where?" lookups without expensive cross-collection joins.
//   The collection is rebuilt from scratch whenever the data becomes inconsistent.
//
// Endpoint summary:
//
//   GET  /            — flat list of all affectation records
//                       (every expert × project assignment pair for active projects)
//                       Readable by any authenticated user.
//
//   GET  /by-expert   — same data grouped by expert:
//                       returns an array of { expert, projects: [...] }
//                       Used by the staff workload view.
//
//   GET  /by-project  — same data grouped by project:
//                       returns an array of { project, experts: [...] }
//                       Used by the project team view.
//
//   POST /rebuild     — admin-only: wipes the entire Affectation collection and
//                       rebuilds it from scratch by reading all active Project documents.
//                       Use this if affectations get out of sync with reality.
//                       Handled by affectationController.rebuildAffectations().
//
// IMPORTANT: Named routes (/by-expert, /by-project, /rebuild) must be declared
// before any /:id-style routes. There are no /:id routes here, but the ordering
// matters to prevent Express from treating "by-expert" as a param value.

import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware";
import {
  getAffectations,
  getAffectationsByExpert,
  getAffectationsByProject,
  rebuildAffectations,
} from "../controllers/affectationController";

const router = Router();

// ── Read (any authenticated user) ────────────────────────────────────────────
router.get("/",           protect, getAffectations);
router.get("/by-expert",  protect, getAffectationsByExpert);
router.get("/by-project", protect, getAffectationsByProject);

// ── Admin repair utility ──────────────────────────────────────────────────────
router.post("/rebuild",   protect, authorize("admin"), rebuildAffectations);

export default router;
