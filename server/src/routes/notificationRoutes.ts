// ─── Notification routes ───────────────────────────────────────────────────────
// Mounted at: /api/notifications
//
// These two endpoints trigger outbound email notifications. Both use POST
// because they perform a side-effect (sending email), not just a data read.
// Any authenticated user can call them (no role restriction beyond protect),
// but in practice they are invoked by the cron job scheduler or by admins
// manually from the admin UI.
//
// Endpoint summary:
//
//   POST /timesheet-reminder  — scans all collaborators and sends a reminder email
//                               to every admin for each collab who has NOT submitted
//                               their timesheet for the current month.
//                               Handled by notificationController.triggerTimesheetReminder().
//                               Also called automatically by the monthly cron job
//                               (runMonthlyTimesheetReminder).
//
//   POST /pace-alert          — sends a pace alert email to the primary and secondary
//                               collaborator responsible for a given client, warning
//                               that the project is burning budget.
//                               Body must include: { clientName, paceIndex, … }
//                               Handled by notificationController.triggerPaceAlert().
//
// Email delivery:
//   Both handlers use Nodemailer configured from EMAIL_USER / EMAIL_PASS env vars.
//   In development (vars not set), emails are logged to the console instead of sent.

import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import { triggerTimesheetReminder, triggerPaceAlert } from "../controllers/notificationController";

const router = Router();

router.post("/timesheet-reminder", protect, triggerTimesheetReminder);
router.post("/pace-alert",         protect, triggerPaceAlert);

export default router;
