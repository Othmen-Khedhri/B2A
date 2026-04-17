import mongoose, { Document, Schema } from "mongoose";

export interface IAffectation extends Document {
  expertId: mongoose.Types.ObjectId;
  expertName: string;
  projectId: mongoose.Types.ObjectId;
  projectName: string;
  clientName: string;
  externalId: string;
  type: string;
  status: string;
  assignedAt: Date;
}

const AffectationSchema = new Schema<IAffectation>(
  {
    expertId:    { type: Schema.Types.ObjectId, ref: "Expert",  required: true },
    expertName:  { type: String, required: true },
    projectId:   { type: Schema.Types.ObjectId, ref: "Project", required: true },
    projectName: { type: String, required: true },
    clientName:  { type: String, default: "" },
    externalId:  { type: String, default: "" },
    type:        { type: String, default: "" },
    status:      { type: String, default: "active" },
    assignedAt:  { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One record per expert–project pair
AffectationSchema.index({ expertId: 1, projectId: 1 }, { unique: true });
AffectationSchema.index({ projectId: 1 });
AffectationSchema.index({ expertId: 1 });

export default mongoose.model<IAffectation>(
  "Affectation",
  AffectationSchema,
  "affectations"
);
