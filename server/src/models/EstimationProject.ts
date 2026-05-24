// ─── EstimationProject model ──────────────────────────────────────────────────
// The training dataset for the ML budget estimation feature.
// Each document represents one COMPLETED project with its actual vs estimated hours,
// costs, and margin — used by the FastAPI ML microservice to train the prediction model.
//
// Two sources of training data:
//   source = "project"  — auto-synced from completed Project documents
//                         (via buildProjectTrainingRecord in estimationController.ts)
//   source = "upload"   — manually imported from a historical projects Excel file
//
// The ML model uses these features to predict budget ranges for new projects:
//   type, sector, complexity (derived from hBudget), hBudget, hReal,
//   overBudget (whether actual hours exceeded budget)
//
// Unique constraint on projectId (sparse):
//   Only one training record per Project document.
//   Sparse = allows multiple docs without a projectId (source="upload" rows).
//
// The compound index (type, sector, complexity) supports the ML service's
// "find similar projects" query used to populate the similarProjects list
// in the prediction response.

import mongoose, { Document, Schema } from "mongoose";

export type EstimationSource = "project" | "upload";

export interface IEstimationProject extends Document {
  projectId?:       mongoose.Types.ObjectId; // ref to Project (only for source="project")
  client:           string;       // client name
  type:             string;       // mission type (e.g. "Audit légal")
  budgetHT:         number;       // estimated financial budget (TND)
  hBudget:          number;       // estimated hours (budget)
  hReal:            number;       // actual hours consumed
  coutReel:         number;       // actual cost (TND)
  marge:            number;       // actual margin (invoiced - cost)
  rentPct:          number;       // margin percentage
  overBudget:       boolean;      // true if hReal > hBudget
  sector:           string;       // industry sector
  complexity:       string;       // "Faible", "Moyenne", "Élevée", "Critique"
  collabPrincipal:  string;       // responsible collaborator name
  source:           EstimationSource;
  createdAt:        Date;
  updatedAt:        Date;
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

// Sparse unique index: one record per Project document, but no uniqueness constraint
// among "upload" source records (they have no projectId).
EstimationProjectSchema.index({ projectId: 1 }, { unique: true, sparse: true });
// Compound index for the ML "find similar projects" query
EstimationProjectSchema.index({ type: 1, sector: 1, complexity: 1 });

export default mongoose.model<IEstimationProject>(
  "EstimationProject",
  EstimationProjectSchema,
  "estimationProjects"
);
