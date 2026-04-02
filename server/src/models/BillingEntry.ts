import mongoose, { Document, Schema } from "mongoose";

export interface IBillingEntry extends Document {
  projectId: mongoose.Types.ObjectId;
  projectName: string;
  invoicedAmount: number;
  realCost: number;
  period: Date;
  importId?: mongoose.Types.ObjectId;
}

const BillingEntrySchema = new Schema<IBillingEntry>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    projectName: { type: String, required: true },
    invoicedAmount: { type: Number, default: 0 },
    realCost: { type: Number, default: 0 },
    period: { type: Date, required: true },
    importId: { type: Schema.Types.ObjectId, ref: "ImportHistory" },
  },
  { timestamps: true }
);

// Index from README
BillingEntrySchema.index({ projectId: 1, period: -1 });

export default mongoose.model<IBillingEntry>("BillingEntry", BillingEntrySchema, "billingEntries");
