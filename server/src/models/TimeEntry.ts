import mongoose, { Document, Schema } from "mongoose";

export type ValidationStatus = "pending" | "validated" | "rejected";

export interface ITimeEntry extends Document {
  expertId: mongoose.Types.ObjectId;
  expertName: string;
  projectId: mongoose.Types.ObjectId;
  projectName: string;
  date: Date;
  hours: number;
  validationStatus: ValidationStatus;
  importId?: mongoose.Types.ObjectId;
}

const TimeEntrySchema = new Schema<ITimeEntry>(
  {
    expertId: { type: Schema.Types.ObjectId, ref: "Expert", required: true },
    expertName: { type: String, required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    projectName: { type: String, required: true },
    date: { type: Date, required: true },
    hours: { type: Number, required: true, min: 0 },
    validationStatus: {
      type: String,
      enum: ["pending", "validated", "rejected"],
      default: "pending",
    },
    importId: { type: Schema.Types.ObjectId, ref: "ImportHistory" },
  },
  { timestamps: true }
);

// Indexes from README
TimeEntrySchema.index({ projectId: 1, date: -1 });
TimeEntrySchema.index({ expertId: 1, date: -1 });
TimeEntrySchema.index({ validationStatus: 1 }); // used in dashboard pending alerts query

export default mongoose.model<ITimeEntry>("TimeEntry", TimeEntrySchema, "timeEntries");
