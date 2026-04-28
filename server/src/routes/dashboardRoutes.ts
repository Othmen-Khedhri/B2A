import { Router } from "express";
import { getStats, getNotifications } from "../controllers/dashboardController";
import { getBudgetStats } from "../controllers/budgetStatsController";
import { protect } from "../middleware/authMiddleware";

const router = Router();
router.get("/stats", protect, getStats);
router.get("/notifications", protect, getNotifications);
router.get("/budget-stats/:year", protect, getBudgetStats);

export default router;
