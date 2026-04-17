import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware";
import {
  getAffectations,
  getAffectationsByExpert,
  getAffectationsByProject,
  rebuildAffectations,
} from "../controllers/affectationController";

const router = Router();

router.get("/",            protect, getAffectations);
router.get("/by-expert",   protect, getAffectationsByExpert);
router.get("/by-project",  protect, getAffectationsByProject);
router.post("/rebuild",    protect, authorize("admin"), rebuildAffectations);

export default router;
