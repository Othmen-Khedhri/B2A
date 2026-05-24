// ─── Leave model ──────────────────────────────────────────────────────────────
// Records approved leave for an expert (vacation, sick leave, special leave).
// Used to track time off for HR reporting and resource planning.
//
// Leave types:
//   Annuel       — annual leave / paid vacation
//   Maladie      — sick leave
//   Exceptionnel — special leave (bereavement, civic duty, etc.)
//
// The dateStart/dateEnd range represents the full leave period.
// days is the count of actual working days off (may differ from calendar days
// if the leave spans a weekend, for example).
//
// importId links leaves imported in bulk to their ImportHistory document,
// enabling re-import detection and deduplication.
//
// Indexes:
//   (expertId, dateStart) — "all leaves for an expert, sorted by start"
//   (dateStart, dateEnd)  — overlap query: "leaves active in month M"

import mongoose, { Document, Schema } from "mongoose";

export type LeaveType = "Annuel" | "Maladie" | "Exceptionnel";

export interface ILeave extends Document {
  expertId:   mongoose.Types.ObjectId; // ref to Expert
  expertName: string;                  // denormalised for display
  dateStart:  Date;
  dateEnd:    Date;
  days:       number;                  // working days count
  type:       LeaveType;
  approved:   boolean;                 // all imported leaves are pre-approved (true)
  notes:      string;
  importId?:  mongoose.Types.ObjectId; // ref to ImportHistory (set on bulk imports)
  createdAt:  Date;
  updatedAt:  Date;
}

const LeaveSchema = new Schema<ILeave>(
  {
    expertId:   { type: Schema.Types.ObjectId, ref: "Expert", required: true },
    expertName: { type: String, required: true, trim: true },
    dateStart:  { type: Date, required: true },
    dateEnd:    { type: Date, required: true },
    days:       { type: Number, required: true, min: 0 },
    type:       {
      type:    String,
      enum:    ["Annuel", "Maladie", "Exceptionnel"],
      default: "Annuel",
    },
    approved:  { type: Boolean, default: false },
    notes:     { type: String, default: "", trim: true },
    importId:  { type: Schema.Types.ObjectId, ref: "ImportHistory" },
  },
  { timestamps: true }
);

// Compound index for "all leaves for an expert ordered by start date"
LeaveSchema.index({ expertId: 1, dateStart: 1 });
// Compound index for the overlap query used by leaveController.getLeaves():
//   filter.dateStart <= monthEnd AND filter.dateEnd >= monthStart
LeaveSchema.index({ dateStart: 1, dateEnd: 1 });

export default mongoose.model<ILeave>("Leave", LeaveSchema, "leaves");
