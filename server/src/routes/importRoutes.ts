import { Router } from "express";
import multer from "multer";
import { importFile, getImportHistory } from "../controllers/importController";
import { protect, authorize } from "../middleware/authMiddleware";

// Memory storage — file never touches disk
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();
router.post("/", protect, authorize("admin"), upload.single("file"), importFile);
router.get("/history", protect, getImportHistory);

export default router;
