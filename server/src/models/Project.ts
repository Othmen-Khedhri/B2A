// ─── Project model ────────────────────────────────────────────────────────────
// Central entity of the application — represents a client engagement or mission.
//
// Two categories of fields:
//
//   SOURCE fields (set by humans or imports):
//     name, clientName, type, budgetHours, budgetCost, startDate, endDate,
//     status, assignedStaff, responsiblePartnerId, externalId, notes, etc.
//
//   DERIVED fields (computed and written back by syncProjectConsistency / repairProjectData):
//     hoursConsumed, costConsumed, invoicedAmount,
//     paceIndexHours, paceIndexCost, grossMargin, marginPercent, effectiveCostPerHour
//
// Derived fields are denormalised here for fast dashboard queries — the alternative
// would be running expensive aggregations on every page load.
//
// Pace index formula:
//   paceIndexHours = (hoursConsumed / budgetHours) / elapsedRatio
//   where elapsedRatio = time_elapsed / total_duration (clamped to [5%, 100%])
//   A pace of 1.0 = perfectly on budget; > 1.0 = burning faster than expected.
//   Capped at 5× to prevent extreme outliers from skewing the dashboard sort.

import mongoose, { Document, Schema } from "mongoose";

export type ProjectStatus = "active" | "completed" | "on-hold" | "cancelled";

// AlertSent tracks which budget threshold alerts have already been emailed,
// so the same alert isn't sent twice (e.g. "70% budget used" only emails once).
export interface AlertSent {
  threshold: number;               // e.g. 70 = 70% of budget
  axis:      "hours" | "cost";     // whether threshold was crossed on hours or cost axis
  sentAt:    Date;
}

export interface IProject extends Document {
  name:                  string;
  clientId?:             mongoose.Types.ObjectId; // ref to Client document (optional)
  clientName:            string;                  // denormalised for fast display
  type:                  string;                  // e.g. "Audit légal", "Comptabilité générale"
  // Budget (planned)
  budgetHours:           number;
  budgetCost:            number;
  // Consumed (actuals — updated incrementally as time entries arrive)
  hoursConsumed:         number;
  costConsumed:          number;   // = hoursConsumed × avg(expert hourly rate)
  invoicedAmount:        number;   // total revenue invoiced to the client
  // Derived metrics (recomputed by syncProjectConsistency after any change)
  paceIndexHours:        number;
  paceIndexCost:         number;
  grossMargin:           number;   // invoicedAmount - costConsumed (or budgetCost if no billing)
  marginPercent:         number;   // grossMargin / invoicedAmount × 100
  effectiveCostPerHour:  number;   // costConsumed / hoursConsumed
  status:                ProjectStatus;
  startDate:             Date;
  endDate:               Date;
  responsiblePartnerId?: mongoose.Types.ObjectId; // ref to Expert (the manager)
  responsiblePartnerName: string;                  // denormalised
  assignedStaff:         mongoose.Types.ObjectId[]; // refs to Expert
  alertsSent:            AlertSent[];
  // Excel import metadata
  externalId:            string;   // e.g. "SAGE-001" from the accounting system
  segment:               string;   // business segment
  notes:                 string;
  collaboratorsRaw:      string;   // pipe-separated collab names, stored for rate calculations
  validatedByManager:    boolean;
  createdAt:             Date;
  updatedAt:             Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name:                   { type: String, required: true, trim: true },
    clientId:               { type: Schema.Types.ObjectId, ref: "Client" },
    clientName:             { type: String, default: "" },
    type:                   { type: String, default: "General" },
    budgetHours:            { type: Number, default: 0 },
    budgetCost:             { type: Number, default: 0 },
    hoursConsumed:          { type: Number, default: 0 },
    costConsumed:           { type: Number, default: 0 },
    invoicedAmount:         { type: Number, default: 0 },
    paceIndexHours:         { type: Number, default: 0 },
    paceIndexCost:          { type: Number, default: 0 },
    grossMargin:            { type: Number, default: 0 },
    marginPercent:          { type: Number, default: 0 },
    effectiveCostPerHour:   { type: Number, default: 0 },
    status: {
      type:    String,
      enum:    ["active", "completed", "on-hold", "cancelled"],
      default: "active",
    },
    startDate:              { type: Date, required: true },
    endDate:                { type: Date, required: true },
    responsiblePartnerId:   { type: Schema.Types.ObjectId, ref: "Expert" },
    responsiblePartnerName: { type: String, default: "" },
    assignedStaff:          [{ type: Schema.Types.ObjectId, ref: "Expert" }],
    alertsSent:             [
      {
        threshold: Number,
        axis:      { type: String, enum: ["hours", "cost"] },
        sentAt:    Date,
      },
    ],
    // ── Excel import metadata ─────────────────────────────────────────────────
    externalId:          { type: String, default: "", trim: true },
    segment:             { type: String, default: "", trim: true },
    notes:               { type: String, default: "", trim: true },
    collaboratorsRaw:    { type: String, default: "", trim: true }, // e.g. "Dupont | Martin"
    validatedByManager:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index: the most common query pattern is "active projects sorted by pace"
// (the dashboard projects table). This index makes that query a covered index scan.
ProjectSchema.index({ status: 1, paceIndexHours: -1 });

export default mongoose.model<IProject>("Project", ProjectSchema, "projects");
