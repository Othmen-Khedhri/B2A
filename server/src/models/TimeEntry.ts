// ─── TimeEntry model ──────────────────────────────────────────────────────────
// An individual time log record: one expert worked N hours on one project on one date.
// TimeEntry documents are the raw source of truth for project hours.
//
// Created by:
//   - importController.ts (bulk import from Excel)
//   - Any manual time entry endpoint
//
// Used by:
//   - repairProjectData.ts — aggregates totalHours per project from TimeEntry
//   - projectImportController.ts — upserts entries and increments project.hoursConsumed
//   - getProjectById — returns recent entries for the project detail page
//   - estimationController.ts — aggregates actual hours per completed project for ML
//
// importId links each entry to its ImportHistory document so that re-running
// the same import can detect and update existing entries (upsert by importId).
//
// validationStatus tracks whether the entry has been reviewed:
//   pending   — just imported, awaiting manager review
//   validated — approved
//   rejected  — flagged for correction
// (Imported entries are set to "validated" automatically.)

import mongoose, { Document, Schema } from "mongoose";

export type ValidationStatus = "pending" | "validated" | "rejected";

export interface ITimeEntry extends Document {
  expertId:         mongoose.Types.ObjectId;  // ref to Expert
  expertName:       string;                   // denormalised for display
  projectId:        mongoose.Types.ObjectId;  // ref to Project
  projectName:      string;                   // denormalised; kept in sync by syncProjectConsistency
  date:             Date;
  hours:            number;
  validationStatus: ValidationStatus;
  importId?:        mongoose.Types.ObjectId;  // ref to ImportHistory (set on bulk import)
}

const TimeEntrySchema = new Schema<ITimeEntry>(
  {
    expertId:         { type: Schema.Types.ObjectId, ref: "Expert",        required: true },
    expertName:       { type: String, required: true },
    projectId:        { type: Schema.Types.ObjectId, ref: "Project",       required: true },
    projectName:      { type: String, required: true },
    date:             { type: Date,   required: true },
    hours:            { type: Number, required: true, min: 0 },
    validationStatus: {
      type:    String,
      enum:    ["pending", "validated", "rejected"],
      default: "pending",
    },
    importId: { type: Schema.Types.ObjectId, ref: "ImportHistory" },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
// Compound index for "project entries sorted by date" (project detail page)
TimeEntrySchema.index({ projectId: 1, date: -1 });
// Compound index for "all entries by an expert sorted by date" (staff detail page)
TimeEntrySchema.index({ expertId: 1, date: -1 });
// Index for "find all pending entries" (dashboard validation alert count)
TimeEntrySchema.index({ validationStatus: 1 });

export default mongoose.model<ITimeEntry>("TimeEntry", TimeEntrySchema, "timeEntries");
