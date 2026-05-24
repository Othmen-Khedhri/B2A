// ─── BillingEntry model ───────────────────────────────────────────────────────
// Records a billing event for a project — typically one row from a billing/invoice
// Excel export.
//
// Fields:
//   invoicedAmount — how much was invoiced to the client for this period (€/TND)
//   realCost       — the firm's actual internal cost for this period
//   period         — the billing period (usually the first day of the month)
//
// When a BillingEntry is created, importController.ts increments:
//   Project.invoicedAmount += invoicedAmount
//   Project.costConsumed   += realCost
//
// This lets the dashboard compute gross margin as:
//   invoicedAmount - costConsumed
// (higher is more profitable)
//
// importId links billing entries to their ImportHistory document for deduplication.

import mongoose, { Document, Schema } from "mongoose";

export interface IBillingEntry extends Document {
  projectId:      mongoose.Types.ObjectId; // ref to Project
  projectName:    string;                  // denormalised for display
  invoicedAmount: number;                  // revenue billed to the client
  realCost:       number;                  // firm's actual cost for this period
  period:         Date;                    // billing period (first day of month)
  importId?:      mongoose.Types.ObjectId; // ref to ImportHistory
}

const BillingEntrySchema = new Schema<IBillingEntry>(
  {
    projectId:      { type: Schema.Types.ObjectId, ref: "Project", required: true },
    projectName:    { type: String, required: true },
    invoicedAmount: { type: Number, default: 0 },
    realCost:       { type: Number, default: 0 },
    period:         { type: Date,   required: true },
    importId:       { type: Schema.Types.ObjectId, ref: "ImportHistory" },
  },
  { timestamps: true }
);

// Compound index for "all billing entries for a project, newest first"
BillingEntrySchema.index({ projectId: 1, period: -1 });

export default mongoose.model<IBillingEntry>("BillingEntry", BillingEntrySchema, "billingEntries");
