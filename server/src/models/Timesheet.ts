import mongoose, { Document, Schema } from "mongoose";

export interface ITimesheetEntry {
  clientName: string;   // parsed: everything before first "-"
  mission: string;      // parsed: everything after first "-"
  prestation: string;   // COMPTA, Audit, Réunion, etc.
  date: Date;
  hours: number;
  detail: string;
}

export interface ITimesheet extends Document {
  collabId: mongoose.Types.ObjectId;
  collabName: string;
  month: number;   // 1–12
  year: number;
  entries: ITimesheetEntry[];
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TimesheetEntrySchema = new Schema<ITimesheetEntry>(
  {
    clientName:  { type: String, default: "", trim: true },
    mission:     { type: String, default: "", trim: true },
    prestation:  { type: String, default: "", trim: true },
    date:        { type: Date, required: true },
    hours:       { type: Number, required: true, min: 0 },
    detail:      { type: String, default: "", trim: true },
  },
  { _id: false }
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

// One timesheet per collab per month per year
TimesheetSchema.index({ collabId: 1, month: 1, year: 1 }, { unique: true });
TimesheetSchema.index({ year: 1, month: 1 });

export default mongoose.model<ITimesheet>("Timesheet", TimesheetSchema, "timesheets");
