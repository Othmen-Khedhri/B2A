// ─── EstimationMeta model ─────────────────────────────────────────────────────
// A singleton document (only one record in the entire collection) that tracks
// the state of the ML estimation system.
//
// completedSinceRetrain:
//   Counts how many projects have been completed since the last training data sync.
//   When this counter reaches 10 (AUTO_RETRAIN_THRESHOLD in estimationController.ts),
//   syncFromCompletedProjects() is triggered automatically to refresh the ML dataset.
//   The counter is then reset to 0.
//   This batching strategy avoids a full dataset sync on every single project completion.
//
// lastRetrainedAt:
//   Timestamp of the most recent training data sync. Displayed on the estimation
//   page so admins know how current the ML data is.
//
// The document is created with upsert:true on first access, so no manual seeding is needed.

import mongoose, { Document, Schema } from "mongoose";

export interface IEstimationMeta extends Document {
  completedSinceRetrain: number; // projects completed since last sync
  lastRetrainedAt?:      Date;   // timestamp of last syncFromCompletedProjects() call
  createdAt:             Date;
  updatedAt:             Date;
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
