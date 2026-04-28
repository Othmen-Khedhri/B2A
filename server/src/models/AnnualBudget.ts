import mongoose, { Document, Schema } from "mongoose";

export interface IAnnualBudget extends Document {
  year: number;
  clientName: string;
  primaryCollab: string;
  secondaryCollab: string;
  financialBudget: number;
  // Internal estimated hours per month (B2A's internal plan)
  internalHours: number;
  // Client billed hours per month (what client pays for)
  clientHours: number;
  createdAt: Date;
  updatedAt: Date;
}

const AnnualBudgetSchema = new Schema<IAnnualBudget>(
  {
    year:            { type: Number, required: true },
    clientName:      { type: String, required: true, trim: true },
    primaryCollab:   { type: String, default: "", trim: true },
    secondaryCollab: { type: String, default: "", trim: true },
    financialBudget: { type: Number, default: 0 },
    internalHours:   { type: Number, default: 0 },
    clientHours:     { type: Number, default: 0 },
  },
  { timestamps: true }
);

// One client per year
AnnualBudgetSchema.index({ year: 1, clientName: 1 }, { unique: true });

export default mongoose.model<IAnnualBudget>("AnnualBudget", AnnualBudgetSchema, "annualBudgets");
