import { Router } from "express";
import { getProjects, getProjectById, createProject, updateProject, deleteProject } from "../controllers/projectController";
import { protect, authorize } from "../middleware/authMiddleware";

const router = Router();
router.get("/", protect, getProjects);
router.get("/:id", protect, getProjectById);
router.post("/", protect, authorize("admin", "manager"), createProject);
router.put("/:id", protect, authorize("admin", "manager"), updateProject);
router.delete("/:id", protect, authorize("admin"), deleteProject);

export default router;
