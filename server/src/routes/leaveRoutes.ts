import { Router } from "express";
import { getLeaves, createLeave, updateLeave, deleteLeave } from "../controllers/leaveController";
import { protect, authorize } from "../middleware/authMiddleware";

const router = Router();

router.get("/",     protect, getLeaves);
router.post("/",    protect, authorize("admin", "manager"), createLeave);
router.put("/:id",  protect, authorize("admin", "manager"), updateLeave);
router.delete("/:id", protect, authorize("admin"), deleteLeave);

export default router;
