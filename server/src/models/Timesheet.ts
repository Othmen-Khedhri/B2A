// ─── Timesheet model ──────────────────────────────────────────────────────────
// A Timesheet document represents one collaborator's time log for one calendar month.
// It is created (or replaced) by the /api/timesheets/upload endpoint when the
// collaborator uploads their monthly Excel file.
//
// Structure:
//   One Timesheet document = one collab × one month × one year
//   The entries array contains all the individual time log rows from the Excel file.
//
// Unique constraint:
//   (collabId, month, year) is unique — re-uploading the same month replaces the
//   existing document via findOneAndUpdate with upsert:true (not $push).
//
// clientName parsing:
//   The "Client/Affaire" cell in the Excel file has the format "ClientName - MissionName".
//   parseClientName() extracts everything before the first "-" as clientName.
//   parseMission() extracts everything after as mission.
//   A lone "-" cell maps to the INTERNAL_CLIENT sentinel ("__internal__").

import mongoose, { Document, Schema } from "mongoose";

// One row from the collaborator's monthly Excel timesheet
export interface ITimesheetEntry {
  clientName:  string;  // parsed: everything before first "-" in "Client/Affaire" column
  mission:     string;  // parsed: everything after first "-"
  prestation:  string;  // service type: "COMPTA", "Audit", "Réunion", etc.
  date:        Date;
  hours:       number;
  detail:      string;  // free-text description of the work done
}

export interface ITimesheet extends Document {
  collabId:   mongoose.Types.ObjectId; // ref to Expert
  collabName: string;                  // denormalised for display
  month:      number;   // 1–12
  year:       number;
  entries:    ITimesheetEntry[];
  uploadedAt: Date;     // when the file was last uploaded (useful for reminder tracking)
  createdAt:  Date;
  updatedAt:  Date;
}

// _id:false on the entry sub-schema because entries are embedded documents —
// they don't need their own MongoDB ObjectId.
const TimesheetEntrySchema = new Schema<ITimesheetEntry>(
  {
    clientName: { type: String, default: "", trim: true },
    mission:    { type: String, default: "", trim: true },
    prestation: { type: String, default: "", trim: true },
    date:       { type: Date,   required: true },
    hours:      { type: Number, required: true, min: 0 },
    detail:     { type: String, default: "", trim: true },
  },
  { _id: false } // no _id per entry — entries are value objects, not entities
);

const TimesheetSchema = new Schema<ITimesheet>(
  {
    collabId:   { type: Schema.Types.ObjectId, ref: "Expert", required: true },
    collabName: { type: String, required: true, trim: true },
    month:      { type: Number, required: true, min: 1, max: 12 },
    year:       { type: Number, required: true },
    entries:    { type: [TimesheetEntrySchema], default: [] },
    uploadedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
// Unique constraint enforces "one document per collab per month per year".
// The upload endpoint uses this via findOneAndUpdate + upsert:true.
TimesheetSchema.index({ collabId: 1, month: 1, year: 1 }, { unique: true });
// Non-unique index for "all timesheets for a given month" queries (dashboard + status page)
TimesheetSchema.index({ year: 1, month: 1 });

export default mongoose.model<ITimesheet>("Timesheet", TimesheetSchema, "timesheets");
