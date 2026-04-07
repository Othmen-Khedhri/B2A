import mongoose, { Document, Schema } from "mongoose";

export type LeaveType = "Annuel" | "Maladie" | "Exceptionnel";

export interface ILeave extends Document {
  expertId: mongoose.Types.ObjectId;
  expertName: string;
  dateStart: Date;
  dateEnd: Date;
  days: number;
  type: LeaveType;
  approved: boolean;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveSchema = new Schema<ILeave>(
  {
    expertId:    { type: Schema.Types.ObjectId, ref: "Expert", required: true },
    expertName:  { type: String, required: true, trim: true },
    dateStart:   { type: Date, required: true },
    dateEnd:     { type: Date, required: true },
    days:        { type: Number, required: true, min: 0 },
    type:        { type: String, enum: ["Annuel", "Maladie", "Exceptionnel"], default: "Annuel" },
    approved:    { type: Boolean, default: false },
    notes:       { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

LeaveSchema.index({ expertId: 1, dateStart: 1 });
LeaveSchema.index({ dateStart: 1, dateEnd: 1 });

export default mongoose.model<ILeave>("Leave", LeaveSchema, "leaves");
