import { Router } from "express";
import { protect } from "../middleware/authMiddleware";
import { triggerTimesheetReminder, triggerPaceAlert } from "../controllers/notificationController";

const router = Router();

router.post("/timesheet-reminder", protect, triggerTimesheetReminder);
router.post("/pace-alert",         protect, triggerPaceAlert);

export default router;
