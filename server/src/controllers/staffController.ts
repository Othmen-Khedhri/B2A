// ─── Staff controller ─────────────────────────────────────────────────────────
// CRUD + utility operations for the Expert (staff) collection.
// "Expert" is the data model name; "staff" is the route/API name.
//
//   POST   /api/staff                      — create a new staff member
//   GET    /api/staff                      — list staff (filterable)
//   GET    /api/staff/:id                  — one staff member
//   PUT    /api/staff/:id                  — update a staff member
//   DELETE /api/staff/:id                  — delete + cascade-delete related data
//   POST   /api/staff/:id/avatar           — upload a profile photo
//   POST   /api/staff/recalculate-loads    — recalculate currentLoad for all collabs
//   POST   /api/staff/cleanup-orphans      — delete orphaned timesheets/entries/affectations

import path from "path";
import fs from "fs";
import { Request, Response } from "express";
import Expert from "../models/Expert";
import Timesheet from "../models/Timesheet";
import TimeEntry from "../models/TimeEntry";
import Affectation from "../models/Affectation";
import { recalcExpertLoads } from "../utils/loadRecalculator";
import { logAudit, diffChanges } from "../utils/auditLogger";

// ─── POST /api/staff ──────────────────────────────────────────────────────────
// Creates a new Expert document.
// Business rules enforced here:
//   - "worker" role doesn't need email/password (they never log in)
//   - Any other role (collaborator, admin, supervisor) requires both email and password
//   - Duplicate emails are rejected with 409 Conflict
// The Expert model's pre-save hook hashes the password with bcrypt automatically.
export const createStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, level, academicLevel, specializations } = req.body;
    if (!name) {
      res.status(400).json({ message: "Name is required" });
      return;
    }
    // Workers are external/manual staff who never log into the platform
    if (role !== "worker" && (!email || !password)) {
      res.status(400).json({ message: "Email and password are required for non-worker roles" });
      return;
    }
    // Prevent duplicate accounts — check before creating to avoid a save error
    if (email) {
      const existing = await Expert.findOne({ email: email.toLowerCase() });
      if (existing) {
        res.status(409).json({ message: "A user with this email already exists" });
        return;
      }
    }

    // Destructure all optional HR fields from the request body
    const { coutHoraire, cin, cnss, gender, dateOfBirth, placeOfBirth, address, civilStatus,
            children, hireDate, contractType, contractEndDate, department, positionCategory,
            expStartDate } = req.body;

    const expert = await Expert.create({
      name, role, level, academicLevel, specializations, coutHoraire,
      email:    email    || undefined, // undefined = omit the field entirely (avoids sparse index issues)
      password: password || undefined,
      cin, cnss, gender, dateOfBirth, placeOfBirth, address, civilStatus, children,
      hireDate, contractType, contractEndDate, department, positionCategory, expStartDate,
    });

    logAudit(req, {
      action: "CREATE", resource: "expert",
      resourceId:   expert._id.toString(),
      resourceName: expert.name,
      description:  `Created staff member "${expert.name}" (${expert.role})`,
    });
    res.status(201).json(expert);
  } catch (err) {
    console.error("createStaff error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── DELETE /api/staff/:id ────────────────────────────────────────────────────
// Deletes a staff member and cascade-deletes all associated data.
// Safety rules:
//   - You cannot delete your own account (prevents accidental self-lockout)
//   - Only the root admin (admin@b2a.com) can delete other admin accounts
// Cascade: Timesheets, TimeEntries, and Affectations for this expert are removed.
export const deleteStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const expert = await Expert.findById(req.params.id);
    if (!expert) {
      res.status(404).json({ message: "Staff member not found" });
      return;
    }

    // Extract the requesting user from the JWT payload (attached by authMiddleware)
    const requester      = (req as import("../middleware/authMiddleware").AuthRequest).user;
    const requesterId    = requester?.id;
    const requesterEmail = requester?.email?.toLowerCase();
    const ROOT_ADMIN     = "admin@b2a.com";

    // Guard: self-deletion
    if (requesterId && expert._id.toString() === requesterId) {
      res.status(403).json({ message: "You cannot delete your own account." });
      return;
    }

    // Guard: only the root admin can delete other admin accounts
    if (expert.role === "admin" && requesterEmail !== ROOT_ADMIN) {
      res.status(403).json({ message: "Only the root admin can delete admin accounts." });
      return;
    }

    // Cascade-delete all data linked to this expert in parallel for efficiency
    await Promise.all([
      Timesheet.deleteMany({ collabId: expert._id }),   // monthly timesheet files
      TimeEntry.deleteMany({ expertId: expert._id }),   // individual time log entries
      Affectation.deleteMany({ expertId: expert._id }), // project assignment records
    ]);

    await expert.deleteOne();
    logAudit(req, {
      action: "DELETE", resource: "expert",
      resourceId:   expert._id.toString(),
      resourceName: expert.name,
      description:  `Deleted staff member "${expert.name}" and all associated data`,
    });
    res.json({ message: "Staff member deleted" });
  } catch (err) {
    console.error("deleteStaff error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/staff ───────────────────────────────────────────────────────────
// Returns all staff members sorted by level then name.
// Optional filters: role (exact), level (exact), search (name regex)
export const getStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, level, search } = req.query;
    const filter: Record<string, unknown> = {};
    if (role)   filter.role  = role;
    if (level)  filter.level = level;
    if (search) filter.name  = { $regex: search, $options: "i" };

    const staff = await Expert.find(filter).sort({ level: 1, name: 1 });
    res.json(staff);
  } catch (err) {
    console.error("getStaff error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/staff/:id ───────────────────────────────────────────────────────
export const getStaffById = async (req: Request, res: Response): Promise<void> => {
  try {
    const expert = await Expert.findById(req.params.id);
    if (!expert) {
      res.status(404).json({ message: "Staff member not found" });
      return;
    }
    res.json(expert);
  } catch (err) {
    console.error("getStaffById error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── PUT /api/staff/:id ───────────────────────────────────────────────────────
// Updates a staff member.
// Password handling: if a new password (≥8 chars) is in the body, it is assigned
// to the document in plain text — the Expert pre-save hook hashes it with bcrypt.
// We never hash here manually; doing so would double-hash on save.
export const updateStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const before = await Expert.findById(req.params.id).lean();
    // +password tells Mongoose to include the password field (it has select:false by default)
    const expert = await Expert.findById(req.params.id).select("+password");
    if (!expert) {
      res.status(404).json({ message: "Staff member not found" });
      return;
    }

    // Separate password from the rest so we can validate minimum length
    const { password, ...rest } = req.body;
    Object.assign(expert, rest);

    // Only update the password if it passes the minimum length check
    // Assigning plain text here is intentional — the pre-save hook hashes it
    if (password && password.length >= 8) {
      expert.password = password;
    }

    await expert.save();
    logAudit(req, {
      action: "UPDATE", resource: "expert",
      resourceId:   expert._id.toString(),
      resourceName: expert.name,
      description:  `Updated staff member "${expert.name}"`,
      changes:      before ? diffChanges(before as unknown as Record<string, unknown>, rest) : {},
    });
    res.json(expert);
  } catch (err) {
    console.error("updateStaff error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST /api/staff/:id/avatar ───────────────────────────────────────────────
// Handles profile photo uploads via Multer (disk storage to /uploads/avatars/).
// Deletes the old avatar file before saving the new one to avoid accumulating
// orphaned files on disk.
export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const expert = await Expert.findById(req.params.id);
    if (!expert) {
      // If the expert doesn't exist, clean up the already-uploaded file immediately
      fs.unlink(req.file.path, () => {});
      res.status(404).json({ message: "Staff member not found" });
      return;
    }

    // Remove the old avatar file from disk (fire-and-forget — ignore errors)
    if (expert.avatarUrl) {
      const oldPath = path.join(process.cwd(), "uploads", "avatars", path.basename(expert.avatarUrl));
      fs.unlink(oldPath, () => {}); // may fail if file was manually deleted — that's fine
    }

    // Store the URL as an absolute path the frontend can request directly
    // e.g. "/uploads/avatars/1680000000000-avatar.jpg"
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    expert.avatarUrl = avatarUrl;
    await expert.save();

    res.json({ avatarUrl });
  } catch (err) {
    console.error("uploadAvatar error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST /api/staff/recalculate-loads ───────────────────────────────────────
// Admin trigger to force-recalculate currentLoad and totalHours for all collabs.
// Normally this runs automatically after timesheet uploads and deletions,
// but this endpoint lets admins manually trigger it if data looks stale.
export const recalculateStaffLoads = async (req: Request, res: Response): Promise<void> => {
  try {
    await recalcExpertLoads();
    res.json({ message: "Staff loads recalculated" });
  } catch (err) {
    console.error("recalculateStaffLoads error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST /api/staff/cleanup-orphans ─────────────────────────────────────────
// Removes Timesheets, TimeEntries, and Affectations whose expertId/collabId no
// longer matches any Expert document.
// This can happen when an expert is deleted directly in MongoDB Atlas without
// going through the DELETE /api/staff/:id endpoint (which cascades automatically).
// Safe to run at any time — it only deletes records whose parent expert is gone.
export const cleanupOrphanedData = async (req: Request, res: Response): Promise<void> => {
  try {
    const allExperts = await Expert.find().select("_id").lean();
    const validIds   = new Set(allExperts.map((e) => e._id.toString()));

    // Collect IDs of documents whose expert no longer exists
    const allTimesheets   = await Timesheet.find().select("collabId").lean();
    const orphanTsIds     = allTimesheets.filter((t) => !validIds.has(t.collabId.toString())).map((t) => t._id);

    const allTimeEntries  = await TimeEntry.find().select("expertId").lean();
    const orphanTeIds     = allTimeEntries.filter((t) => !validIds.has(t.expertId.toString())).map((t) => t._id);

    const allAffectations = await Affectation.find().select("expertId").lean();
    const orphanAffIds    = allAffectations.filter((a) => !validIds.has(a.expertId.toString())).map((a) => a._id);

    // Delete orphans in parallel — skip the delete if the list is empty (avoids no-op queries)
    const [ts, te, af] = await Promise.all([
      orphanTsIds.length  ? Timesheet.deleteMany({ _id: { $in: orphanTsIds } })    : Promise.resolve({ deletedCount: 0 }),
      orphanTeIds.length  ? TimeEntry.deleteMany({ _id: { $in: orphanTeIds } })    : Promise.resolve({ deletedCount: 0 }),
      orphanAffIds.length ? Affectation.deleteMany({ _id: { $in: orphanAffIds } }) : Promise.resolve({ deletedCount: 0 }),
    ]);

    res.json({
      message:             "Orphaned data cleaned up",
      timesheetsDeleted:   ts.deletedCount,
      timeEntriesDeleted:  te.deletedCount,
      affectationsDeleted: af.deletedCount,
    });
  } catch (err) {
    console.error("cleanupOrphanedData error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
