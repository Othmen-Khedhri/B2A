// ─── Pace Index routes ────────────────────────────────────────────────────────
// Mounted at: /api/pace-index
//
// The "Pace Index" feature tracks whether the firm is on track to consume client
// retainer budgets over the course of a year. It is distinct from the project-level
// Pace (projectRoutes /pace) — that one works at the per-Project document level,
// while these routes work at the AnnualBudget × Client level.
//
// How it works:
//   Each client has a planned annual budget in hours (AnnualBudget document).
//   As collaborators log time against that client (TimeEntry), we compare
//   cumulative hours consumed vs. the budget consumed to date.
//   The "Pace Index" = consumedHours / expectedHoursAtThisPoint.
//   Values > 1.0 mean the firm is consuming the budget faster than planned.
//
// Health thresholds:
//   ≤ 85%   → green  (comfortable pace)
//   85–100% → yellow (at risk of overspending)
//   > 100%  → red    (over budget)
//
// Endpoint summary:
//
//   GET /overview/:year          — portfolio overview for all clients in a given year.
//                                  Returns an array of clients with their health status,
//                                  budgeted vs. consumed hours, and pace index value.
//                                  Handled by paceIndexController.getPaceOverview().
//
//   GET /:year/:clientName       — detailed 12-month timeline for one client.
//                                  Returns month-by-month data: planned, consumed,
//                                  cumulative totals, and a year-end projection.
//                                  Also includes a profit prediction based on
//                                  clientHours × 12 − projectedYearEnd.
//                                  Handled by paceIndexController.getPaceIndex().
//
// IMPORTANT: /overview/:year must appear before /:year/:clientName so Express
// does not treat the literal string "overview" as a year value.
// Both routes require authentication (protect) but no specific role.

import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import { getPaceIndex, getPaceOverview } from "../controllers/paceIndexController";

const router = Router();

// Named overview route first — before the 2-segment param route
router.get("/overview/:year",    protect, getPaceOverview);

// Per-client detailed timeline
router.get("/:year/:clientName", protect, getPaceIndex);

export default router;
