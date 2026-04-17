import mongoose, { Document, Schema } from "mongoose";

export interface IEstimationMeta extends Document {
  completedSinceRetrain: number;
  lastRetrainedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const EstimationMetaSchema = new Schema<IEstimationMeta>(
  {
    completedSinceRetrain: { type: Number, default: 0 },
    lastRetrainedAt:       { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IEstimationMeta>(
  "EstimationMeta",
  EstimationMetaSchema,
  "estimationMeta"
);
