import { Router } from "express";
import { protect, authorize } from "../middleware/authMiddleware";
import { getAuditLogs, getAuditStats } from "../controllers/auditLogController";

const router = Router();

// Admin-only
router.get("/stats", protect, authorize("admin"), getAuditStats);
router.get("/",      protect, authorize("admin"), getAuditLogs);

export default router;
