// ─── Dashboard routes ──────────────────────────────────────────────────────────
// Mounted at: /api/dashboard
//
// These three endpoints collectively power the main dashboard home page.
// All three require authentication (protect) but no specific role —
// the data they return is visible to every logged-in user.
//
// Endpoint summary:
//
//   GET /stats                — general KPIs:
//                               total experts, active projects, open timesheets,
//                               clients, recent audit log entries.
//                               Handled by dashboardController.getStats().
//
//   GET /notifications        — inbox-style list of actionable items:
//                               overdue timesheets, projects burning budget,
//                               pace alerts, etc.
//                               Handled by dashboardController.getNotifications().
//
//   GET /budget-stats/:year   — budget health overview for a given fiscal year:
//                               per-client consumed vs. budgeted hours, portfolio
//                               traffic-light counts (green / yellow / red), and
//                               the list of collaborators with missing timesheets.
//                               Handled by budgetStatsController.getBudgetStats().
//                               Runs 4 MongoDB queries in parallel (Promise.all) to
//                               keep response latency low.

import { Router } from "express";
import { getStats, getNotifications } from "../controllers/dashboardController";
import { getBudgetStats } from "../controllers/budgetStatsController";
import { protect } from "../middleware/authMiddleware";

const router = Router();

router.get("/stats",              protect, getStats);
router.get("/notifications",      protect, getNotifications);
router.get("/budget-stats/:year", protect, getBudgetStats);

export default router;
