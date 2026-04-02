import { Request, Response } from "express";
import Project from "../models/Project";
import TimeEntry from "../models/TimeEntry";

export const getProjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, partner, search } = req.query;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (partner) filter.responsiblePartnerName = { $regex: partner, $options: "i" };
    if (search) filter.name = { $regex: search, $options: "i" };

    const projects = await Project.find(filter).sort({ paceIndexHours: -1 });
    res.json(projects);
  } catch (err) {
    console.error("getProjects error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getProjectById = async (req: Request, res: Response): Promise<void> => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }

    const timeEntries = await TimeEntry.find({ projectId: project._id })
      .sort({ date: -1 })
      .limit(50);

    // Aggregate hours per expert for this project
    const staffHours = await TimeEntry.aggregate([
      { $match: { projectId: project._id } },
      {
        $group: {
          _id: "$expertId",
          expertName: { $first: "$expertName" },
          totalHours: { $sum: "$hours" },
        },
      },
      { $sort: { totalHours: -1 } },
    ]);

    // Monthly hours breakdown for chart
    const monthlyHours = await TimeEntry.aggregate([
      { $match: { projectId: project._id } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
          hours: { $sum: "$hours" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ project, timeEntries, staffHours, monthlyHours });
  } catch (err) {
    console.error("getProjectById error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const createProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const project = await Project.create(req.body);
    res.status(201).json(project);
  } catch (err) {
    console.error("createProject error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    res.json(project);
  } catch (err) {
    console.error("updateProject error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    res.json({ message: "Project deleted" });
  } catch (err) {
    console.error("deleteProject error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
