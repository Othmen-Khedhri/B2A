import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import { getPaceIndex, getPaceOverview } from "../controllers/paceIndexController";

const router = Router();

router.get("/overview/:year",    protect, getPaceOverview);
router.get("/:year/:clientName", protect, getPaceIndex);

export default router;
