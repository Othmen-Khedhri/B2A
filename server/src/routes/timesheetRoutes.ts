import { Router } from "express";
import multer from "multer";
import { protect } from "../middleware/authMiddleware";
import {
  uploadTimesheet,
  getTimesheetsByPeriod,
  getCollabTimesheet,
  getClientTimesheetSummary,
  getTimesheetStatus,
  deleteTimesheet,
} from "../controllers/timesheetController";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload",                  protect, upload.single("file"), uploadTimesheet);
router.get("/status/:year/:month",      protect, getTimesheetStatus);
router.get("/client/:clientName/:year", protect, getClientTimesheetSummary);
router.get("/:year/:month",             protect, getTimesheetsByPeriod);
router.get("/:year/:month/:collabId",   protect, getCollabTimesheet);
router.delete("/:id",                   protect, deleteTimesheet);

export default router;
