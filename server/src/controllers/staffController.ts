import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import Expert from "../models/Expert";

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
    res.status(201).json(expert);
  } catch (err) {
    console.error("createStaff error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteStaff = async (req: Request, res: Response): Promise<void> => {
  try {
    const expert = await Expert.findByIdAndDelete(req.params.id);
    if (!expert) {
      res.status(404).json({ message: "Staff member not found" });
      return;
    }
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
    const expert = await Expert.findById(req.params.id).select("+password");
    if (!expert) {
      res.status(404).json({ message: "Staff member not found" });
      return;
    }

    const { password, ...rest } = req.body;
    Object.assign(expert, rest);

    // Hash new password through the pre-save hook
    if (password && password.length >= 8) {
      const salt = await bcrypt.genSalt(12);
      expert.password = await bcrypt.hash(password, salt);
    }

    await expert.save();
    res.json(expert);
  } catch (err) {
    console.error("updateStaff error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
