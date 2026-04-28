import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware";
import { upload, parseTimesheetFile, previewSheets } from "../controllers/parseController";

const router = Router();

router.use(protect);
router.use(authorize("admin", "manager"));

router.post("/preview", upload.single("file"), previewSheets);
router.post("/run",     upload.single("file"), parseTimesheetFile);

export default router;
