// ─── AnnualBudget model ───────────────────────────────────────────────────────
// Stores the annual hour budget allocated to each client for a given fiscal year.
// This is NOT the same as a Project budget — it's the annual retainer / recurring
// engagement plan imported from the firm's yearly planning spreadsheet.
//
// Key fields:
//   internalHours — how many hours the firm internally targets to spend per month
//                   (the firm's own estimate for profitability planning)
//   clientHours   — how many hours the client is billed for per month
//                   (what the client pays for — may be a fixed fee package)
//   financialBudget — total annual financial value of the client engagement (TND)
//
// Both internalHours and clientHours are MONTHLY values.
// To get the annual total, multiply by 12.
//
// primaryCollab / secondaryCollab are the names of the responsible collaborators.
// These are stored as strings (not refs) because they come from Excel imports and
// may not always match an Expert document exactly.
//
// Unique constraint: (year, clientName) — one budget record per client per year.
// The budget import endpoint uses bulkWrite + upsert to enforce this.

import mongoose, { Document, Schema } from "mongoose";

export interface IAnnualBudget extends Document {
  year:             number;
  clientName:       string;
  primaryCollab:    string;  // name of the main responsible collaborator
  secondaryCollab:  string;  // name of a secondary responsible collaborator (optional)
  financialBudget:  number;  // total annual financial value in TND
  internalHours:    number;  // monthly hour target (firm's internal plan)
  clientHours:      number;  // monthly hours billed to the client
  createdAt:        Date;
  updatedAt:        Date;
}

const AnnualBudgetSchema = new Schema<IAnnualBudget>(
  {
    year:             { type: Number, required: true },
    clientName:       { type: String, required: true, trim: true },
    primaryCollab:    { type: String, default: "", trim: true },
    secondaryCollab:  { type: String, default: "", trim: true },
    financialBudget:  { type: Number, default: 0 },
    internalHours:    { type: Number, default: 0 }, // per month
    clientHours:      { type: Number, default: 0 }, // per month
  },
  { timestamps: true }
);

// One record per client per year — re-importing replaces via upsert
AnnualBudgetSchema.index({ year: 1, clientName: 1 }, { unique: true });

export default mongoose.model<IAnnualBudget>("AnnualBudget", AnnualBudgetSchema, "annualBudgets");
