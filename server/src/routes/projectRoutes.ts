import { Router } from "express";
import multer from "multer";
import { getProjects, getProjectById, createProject, updateProject, deleteProject, repairProjectsData } from "../controllers/projectController";
import { getPaceReport, sendPaceAlerts } from "../controllers/paceController";
import { importProjects } from "../controllers/projectImportController";
import { protect, authorize } from "../middleware/authMiddleware";

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// ── Named routes — must be before /:id ──
router.get("/pace", protect, getPaceReport);
router.post("/pace/notify", protect, authorize("admin", "manager"), sendPaceAlerts);
router.post("/import", protect, authorize("admin", "manager"), upload.single("file"), importProjects);
router.post("/repair-data", protect, authorize("admin"), repairProjectsData);

// ── Standard CRUD ──
router.get("/", protect, getProjects);
router.get("/:id", protect, getProjectById);
router.post("/", protect, authorize("admin", "manager"), createProject);
router.put("/:id", protect, authorize("admin", "manager"), updateProject);
router.delete("/:id", protect, authorize("admin"), deleteProject);

export default router;
