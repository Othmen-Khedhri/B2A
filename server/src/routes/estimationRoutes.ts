// ─── Estimation routes ────────────────────────────────────────────────────────
// Mounted at: /api/estimation
//
// Powers the ML budget estimation feature. The Node.js server acts as a proxy
// between the React frontend and a FastAPI ML microservice (ML_API_URL env var).
// It also manages the training dataset (EstimationProject collection) and the
// auto-retrain lifecycle (EstimationMeta collection).
//
// Endpoint summary:
//
//   GET  /historical            — list the ML training dataset (EstimationProject docs)
//                                 Filterable by source ("project" or "upload").
//                                 Any authenticated user can view this.
//
//   GET  /collaborators-context — returns collaborator names + their past project hours
//                                 Used by the prediction form to populate the
//                                 "responsible collaborator" dropdown with realistic context.
//                                 Queries TimeEntry → Project (NOT Affectation, because
//                                 affectations are deleted when projects complete).
//
//   POST /predict               — proxy a prediction request to the FastAPI ML service.
//                                 Body: { type, sector, hBudget, collabPrincipal, … }
//                                 Returns: predicted budget range + similar past projects.
//                                 Any authenticated user can request a prediction.
//
//   POST /import                — import a historical projects Excel file to seed or
//                                 expand the ML training dataset (admin only).
//                                 Each row becomes an EstimationProject with source="upload".
//
//   POST /retrain               — trigger a full dataset sync from completed Project docs
//                                 into EstimationProject (admin only).
//                                 Also called automatically when completedSinceRetrain
//                                 reaches AUTO_RETRAIN_THRESHOLD (10) in estimationController.
//
// IMPORTANT: Named routes (/historical, /collaborators-context) must appear before
// any /:id style routes (there are none here, but this ordering is maintained for
// consistency with other route files in this project).
//
// File upload:
//   multer.memoryStorage() — historical Excel file processed in-memory, not written to disk.

import { Router } from "express";
import multer from "multer";
import { protect, authorize } from "../middleware/authMiddleware";
import {
  getHistoricalProjects,
  importHistoricalProjects,
  predictEstimationMl,
  retrainEstimation,
  addSingleTrainingRecord,
  getCollaboratorsContext,
} from "../controllers/estimationController";

// In-memory upload for the historical projects Excel file.
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// ── Read (any authenticated user) ────────────────────────────────────────────
router.get("/historical",            protect, getHistoricalProjects);
router.get("/collaborators-context", protect, getCollaboratorsContext);

// ── Prediction proxy (any authenticated user) ─────────────────────────────────
router.post("/predict", protect, predictEstimationMl);

// ── Admin-only data management ────────────────────────────────────────────────
router.post("/add",     protect, authorize("admin"), addSingleTrainingRecord);
router.post("/import",  protect, authorize("admin"), upload.single("file"), importHistoricalProjects);
router.post("/retrain", protect, authorize("admin"), retrainEstimation);

export default router;
