import { Router } from "express";
import multer from "multer";
import { protect, authorize } from "../middleware/authMiddleware";
import { getHistoricalProjects, importHistoricalProjects, predictEstimationMl, retrainEstimation, getCollaboratorsContext } from "../controllers/estimationController";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.get("/historical", protect, getHistoricalProjects);
router.get("/collaborators-context", protect, getCollaboratorsContext);
router.post("/predict", protect, predictEstimationMl);
router.post("/import", protect, authorize("admin"), upload.single("file"), importHistoricalProjects);
router.post("/retrain", protect, authorize("admin"), retrainEstimation);

export default router;
