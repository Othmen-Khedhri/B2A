// ─── Affectation model ────────────────────────────────────────────────────────
// A cached/derived collection that mirrors which experts are currently assigned
// to which active projects.
//
// Source of truth: Project.assignedStaff (the array of Expert ObjectIds).
// Affectation documents are never created or edited directly — they are
// managed exclusively by affectationSync.ts.
//
// Why maintain this separate collection?
//   "Who is assigned to what?" is a common query pattern (staff list page, burnout
//   dashboard, project detail). Rather than running $lookup joins between Project
//   and Expert on every request, we maintain a flat, pre-joined collection that
//   can be queried directly with a single find().
//
// Lifecycle:
//   - Created/upserted when a project is saved (syncProjectAffectations)
//   - Deleted when a project is completed/cancelled/on-hold (non-active = no affectations)
//   - Deleted when a project is permanently deleted (removeProjectAffectations)
//   - Full wipe-and-rebuild available via rebuildAllAffectations (admin repair endpoint)
//
// Unique constraint: (expertId, projectId) — one record per expert–project pair.

import mongoose, { Document, Schema } from "mongoose";

export interface IAffectation extends Document {
  expertId:    mongoose.Types.ObjectId;  // ref to Expert
  expertName:  string;                   // denormalised for display
  projectId:   mongoose.Types.ObjectId;  // ref to Project
  projectName: string;                   // denormalised
  clientName:  string;                   // denormalised (from Project.clientName)
  externalId:  string;                   // denormalised (Project.externalId)
  type:        string;                   // denormalised (Project.type)
  status:      string;                   // always "active" (non-active projects have no affectations)
  assignedAt:  Date;                     // when the record was last upserted
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

// ── Indexes ────────────────────────────────────────────────────────────────────
// Unique pair: one record per (expert, project) combination
AffectationSchema.index({ expertId: 1, projectId: 1 }, { unique: true });
// Fast "all assignments for a project" query
AffectationSchema.index({ projectId: 1 });
// Fast "all assignments for an expert" query
AffectationSchema.index({ expertId: 1 });

export default mongoose.model<IAffectation>(
  "Affectation",
  AffectationSchema,
  "affectations"
);
