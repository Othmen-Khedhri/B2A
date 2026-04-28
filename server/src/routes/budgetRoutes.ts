import { Router } from "express";
import multer from "multer";
import { protect } from "../middleware/authMiddleware";
import {
  importBudget,
  getBudgetByYear,
  getBudgetClient,
  deleteBudgetYear,
} from "../controllers/budgetController";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/import",           protect, upload.single("file"), importBudget);
router.get("/:year",             protect, getBudgetByYear);
router.get("/:year/:clientName", protect, getBudgetClient);
router.delete("/:year",          protect, deleteBudgetYear);

export default router;
