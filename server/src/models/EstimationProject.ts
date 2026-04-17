import mongoose, { Document, Schema } from "mongoose";

export type EstimationSource = "project" | "upload";

export interface IEstimationProject extends Document {
  projectId?: mongoose.Types.ObjectId;
  client: string;
  type: string;
  budgetHT: number;
  hBudget: number;
  hReal: number;
  coutReel: number;
  marge: number;
  rentPct: number;
  overBudget: boolean;
  sector: string;
  complexity: string;
  collabPrincipal: string;
  source: EstimationSource;
  createdAt: Date;
  updatedAt: Date;
}

const EstimationProjectSchema = new Schema<IEstimationProject>(
  {
    projectId:       { type: Schema.Types.ObjectId, ref: "Project" },
    client:          { type: String, required: true, trim: true },
    type:            { type: String, required: true, trim: true },
    budgetHT:        { type: Number, default: 0 },
    hBudget:         { type: Number, default: 0 },
    hReal:           { type: Number, default: 0 },
    coutReel:        { type: Number, default: 0 },
    marge:           { type: Number, default: 0 },
    rentPct:         { type: Number, default: 0 },
    overBudget:      { type: Boolean, default: false },
    sector:          { type: String, default: "" },
    complexity:      { type: String, default: "Moyenne" },
    collabPrincipal: { type: String, default: "" },
    source:          { type: String, enum: ["project", "upload"], default: "project" },
  },
  { timestamps: true }
);

EstimationProjectSchema.index({ projectId: 1 }, { unique: true, sparse: true });
EstimationProjectSchema.index({ type: 1, sector: 1, complexity: 1 });

export default mongoose.model<IEstimationProject>(
  "EstimationProject",
  EstimationProjectSchema,
  "estimationProjects"
);
