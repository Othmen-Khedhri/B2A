// ─── Staff routes ─────────────────────────────────────────────────────────────
// Mounted at: /api/staff
//
// IMPORTANT: Named routes (/recalculate-loads, /cleanup-orphans) must come
// before /:id to prevent Express from matching them as IDs.
//
//   POST /recalculate-loads    — recalculate currentLoad for all collabs (admin)
//   POST /cleanup-orphans      — delete records linked to non-existent experts (admin)
//   GET  /                     — list staff (filterable by role, level, search)
//   GET  /:id                  — one staff member
//   POST /                     — create a staff member (admin)
//   PUT  /:id                  — update a staff member (admin)
//   DELETE /:id                — delete + cascade (admin)
//   POST /:id/avatar           — upload a profile photo (admin, manager)
//
// Avatar upload configuration:
//   - Stored on disk at uploads/avatars/
//   - Allowed MIME types: JPEG, PNG, WebP
//   - Max file size: 500 KB (prevents large images from filling disk)
//   - Filename: "avatar-{timestamp}-{random}.{ext}" to avoid collisions

import path from "path";
import fs from "fs";
import { Router } from "express";
import multer from "multer";
import {
  getStaff, getStaffById, createStaff, updateStaff, deleteStaff,
  uploadAvatar, recalculateStaffLoads, cleanupOrphanedData,
} from "../controllers/staffController";
import { protect, authorize } from "../middleware/authMiddleware";

// ─── Avatar upload setup ──────────────────────────────────────────────────────
// Ensure the uploads/avatars directory exists before multer tries to write to it
const avatarsDir = path.join(process.cwd(), "uploads", "avatars");
if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarsDir),
  filename:    (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    // Random suffix prevents filename collisions if two uploads happen simultaneously
    cb(null, `avatar-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];

const uploadMiddleware = multer({
  storage:    avatarStorage,
  limits:     { fileSize: 500 * 1024 }, // 500 KB max
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_MIMES.join(", ")}`));
  },
});

// ─── Routes ───────────────────────────────────────────────────────────────────
const router = Router();

// Named admin utility routes — before /:id
router.post("/recalculate-loads", protect, authorize("admin"), recalculateStaffLoads);
router.post("/cleanup-orphans",   protect, authorize("admin"), cleanupOrphanedData);

// Standard CRUD
router.get("/",     protect, getStaff);
router.get("/:id",  protect, getStaffById);
router.post("/",    protect, authorize("admin"), createStaff);
router.put("/:id",  protect, authorize("admin"), updateStaff);
router.delete("/:id", protect, authorize("admin"), deleteStaff);

// Avatar upload — managers can also update avatars (e.g. for new hires)
router.post("/:id/avatar", protect, authorize("admin", "manager"), uploadMiddleware.single("avatar"), uploadAvatar);

export default router;
