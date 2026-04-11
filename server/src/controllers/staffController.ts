import path from "path";
import fs from "fs";
import { Request, Response } from "express";
import Expert from "../models/Expert";
import { recalcExpertLoads } from "../utils/loadRecalculator";
import { logAudit, diffChanges } from "../utils/auditLogger";

export const createStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, level, academicLevel, specializations } = req.body;
    if (!name) {
      res.status(400).json({ message: "Name is required" });
      return;
    }
    if (role !== "worker" && (!email || !password)) {
      res.status(400).json({ message: "Email and password are required for non-worker roles" });
      return;
    }
    if (email) {
      const existing = await Expert.findOne({ email: email.toLowerCase() });
      if (existing) {
        res.status(409).json({ message: "A user with this email already exists" });
        return;
      }
    }
    const { coutHoraire, cin, cnss, gender, dateOfBirth, placeOfBirth, address, civilStatus,
            children, hireDate, contractType, contractEndDate, department, positionCategory,
            expStartDate } = req.body;
    const expert = await Expert.create({
      name, role, level, academicLevel, specializations, coutHoraire,
      email: email || undefined, password: password || undefined,
      cin, cnss, gender, dateOfBirth, placeOfBirth, address, civilStatus, children,
      hireDate, contractType, contractEndDate, department, positionCategory, expStartDate,
    });
    logAudit(req, {
      action: "CREATE", resource: "expert",
      resourceId: expert._id.toString(), resourceName: expert.name,
      description: `Created staff member "${expert.name}" (${expert.role})`,
    });
    res.status(201).json(expert);
  } catch (err) {
    console.error("createStaff error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const expert = await Expert.findById(req.params.id);
    if (!expert) {
      res.status(404).json({ message: "Staff member not found" });
      return;
    }

    const requester   = (req as import("../middleware/authMiddleware").AuthRequest).user;
    const requesterId = requester?.id;
    const requesterEmail = requester?.email?.toLowerCase();
    const ROOT_ADMIN  = "admin@b2a.com";

    // Cannot delete yourself
    if (requesterId && expert._id.toString() === requesterId) {
      res.status(403).json({ message: "You cannot delete your own account." });
      return;
    }

    // Only admin@b2a.com can delete other admin accounts
    if (expert.role === "admin" && requesterEmail !== ROOT_ADMIN) {
      res.status(403).json({ message: "Only the root admin can delete admin accounts." });
      return;
    }

    await expert.deleteOne();
    logAudit(req, {
      action: "DELETE", resource: "expert",
      resourceId: expert._id.toString(), resourceName: expert.name,
      description: `Deleted staff member "${expert.name}"`,
    });
    res.json({ message: "Staff member deleted" });
  } catch (err) {
    console.error("deleteStaff error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, level, search } = req.query;
    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (level) filter.level = level;
    if (search) filter.name = { $regex: search, $options: "i" };

    const staff = await Expert.find(filter).sort({ level: 1, name: 1 });
    res.json(staff);
  } catch (err) {
    console.error("getStaff error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

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

export const updateStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const before = await Expert.findById(req.params.id).lean();
    const expert = await Expert.findById(req.params.id).select("+password");
    if (!expert) {
      res.status(404).json({ message: "Staff member not found" });
      return;
    }

    const { password, ...rest } = req.body;
    Object.assign(expert, rest);

    // Assign raw — the pre-save hook in Expert.ts will hash it once
    if (password && password.length >= 8) {
      expert.password = password;
    }

    await expert.save();
    logAudit(req, {
      action: "UPDATE", resource: "expert",
      resourceId: expert._id.toString(), resourceName: expert.name,
      description: `Updated staff member "${expert.name}"`,
      changes: before ? diffChanges(before as unknown as Record<string, unknown>, rest) : {},
    });
    res.json(expert);
  } catch (err) {
    console.error("updateStaff error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const expert = await Expert.findById(req.params.id);
    if (!expert) {
      // Remove the just-uploaded file if expert not found
      fs.unlink(req.file.path, () => {});
      res.status(404).json({ message: "Staff member not found" });
      return;
    }

    // Delete old avatar file if it exists
    if (expert.avatarUrl) {
      const oldPath = path.join(process.cwd(), "uploads", "avatars", path.basename(expert.avatarUrl));
      fs.unlink(oldPath, () => {}); // ignore errors (file may not exist)
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    expert.avatarUrl = avatarUrl;
    await expert.save();

    res.json({ avatarUrl });
  } catch (err) {
    console.error("uploadAvatar error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const recalculateStaffLoads = async (req: Request, res: Response): Promise<void> => {
  try {
    await recalcExpertLoads();
    res.json({ message: "Staff loads recalculated" });
  } catch (err) {
    console.error("recalculateStaffLoads error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
