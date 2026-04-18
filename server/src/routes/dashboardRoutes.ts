import { Router } from "express";
import { getStats, getNotifications } from "../controllers/dashboardController";
import { protect } from "../middleware/authMiddleware";

const router = Router();
router.get("/stats", protect, getStats);
router.get("/notifications", protect, getNotifications);

export default router;
