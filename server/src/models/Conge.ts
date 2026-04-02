import mongoose, { Document, Schema } from "mongoose";

export interface IConge extends Document {
  expertId: mongoose.Types.ObjectId;
  expertName: string;
  dateStart: Date;
  dateEnd: Date;
  type: string;
  days: number;
  approved: boolean;
  importId?: mongoose.Types.ObjectId;
}

const CongeSchema = new Schema<IConge>(
  {
    expertId: { type: Schema.Types.ObjectId, ref: "Expert", required: true },
    expertName: { type: String, required: true },
    dateStart: { type: Date, required: true },
    dateEnd: { type: Date, required: true },
    type: { type: String, default: "Annual" },
    days: { type: Number, required: true },
    approved: { type: Boolean, default: false },
    importId: { type: Schema.Types.ObjectId, ref: "ImportHistory" },
  },
  { timestamps: true }
);

// Index from README
CongeSchema.index({ expertId: 1, dateStart: 1 });

export default mongoose.model<IConge>("Conge", CongeSchema, "conges");
