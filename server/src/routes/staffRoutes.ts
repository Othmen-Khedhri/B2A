import path from "path";
import fs from "fs";
import { Router } from "express";
import multer from "multer";
import { getStaff, getStaffById, createStaff, updateStaff, deleteStaff, uploadAvatar, recalculateStaffLoads, cleanupOrphanedData } from "../controllers/staffController";
import { protect, authorize } from "../middleware/authMiddleware";

// ─── Avatar upload setup ──────────────────────────────────────────────────────
const avatarsDir = path.join(process.cwd(), "uploads", "avatars");
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    cb(null, `avatar-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];

const uploadMiddleware = multer({
  storage: avatarStorage,
  limits: { fileSize: 500 * 1024 }, // 500 KB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_MIMES.join(", ")}`));
  },
});

// ─── Routes ───────────────────────────────────────────────────────────────────
const router = Router();
router.post("/recalculate-loads",  protect, authorize("admin"), recalculateStaffLoads);
router.post("/cleanup-orphans",    protect, authorize("admin"), cleanupOrphanedData);
router.get("/",    protect, getStaff);
router.get("/:id", protect, getStaffById);
router.post("/",   protect, authorize("admin"), createStaff);
router.put("/:id", protect, authorize("admin"), updateStaff);
router.delete("/:id", protect, authorize("admin"), deleteStaff);
router.post("/:id/avatar", protect, authorize("admin", "manager"), uploadMiddleware.single("avatar"), uploadAvatar);

export default router;
