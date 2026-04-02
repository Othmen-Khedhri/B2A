import { Router } from "express";
import { getStaff, getStaffById, createStaff, updateStaff, deleteStaff } from "../controllers/staffController";
import { protect, authorize } from "../middleware/authMiddleware";

const router = Router();
router.get("/", protect, getStaff);
router.get("/:id", protect, getStaffById);
router.post("/", protect, authorize("admin"), createStaff);
router.put("/:id", protect, authorize("admin"), updateStaff);
router.delete("/:id", protect, authorize("admin"), deleteStaff);

export default router;
