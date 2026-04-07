import mongoose, { Document, Schema } from "mongoose";

export type ProjectStatus = "active" | "completed" | "on-hold" | "cancelled";

export interface AlertSent {
  threshold: number;
  axis: "hours" | "cost";
  sentAt: Date;
}

export interface IProject extends Document {
  name: string;
  clientId?: mongoose.Types.ObjectId;
  clientName: string;
  type: string;
  budgetHours: number;
  budgetCost: number;
  hoursConsumed: number;
  costConsumed: number;
  invoicedAmount: number;
  paceIndexHours: number;
  paceIndexCost: number;
  grossMargin: number;
  marginPercent: number;
  effectiveCostPerHour: number;
  status: ProjectStatus;
  startDate: Date;
  endDate: Date;
  responsiblePartnerId?: mongoose.Types.ObjectId;
  responsiblePartnerName: string;
  assignedStaff: mongoose.Types.ObjectId[];
  alertsSent: AlertSent[];
  // Excel import fields
  externalId: string;
  segment: string;
  notes: string;
  collaboratorsRaw: string;
  validatedByManager: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    name: { type: String, required: true, trim: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Client" },
    clientName: { type: String, default: "" },
    type: { type: String, default: "General" },
    budgetHours: { type: Number, default: 0 },
    budgetCost: { type: Number, default: 0 },
    hoursConsumed: { type: Number, default: 0 },
    costConsumed: { type: Number, default: 0 },
    invoicedAmount: { type: Number, default: 0 },
    paceIndexHours: { type: Number, default: 0 },
    paceIndexCost: { type: Number, default: 0 },
    grossMargin: { type: Number, default: 0 },
    marginPercent: { type: Number, default: 0 },
    effectiveCostPerHour: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["active", "completed", "on-hold", "cancelled"],
      default: "active",
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    responsiblePartnerId: { type: Schema.Types.ObjectId, ref: "Expert" },
    responsiblePartnerName: { type: String, default: "" },
    assignedStaff: [{ type: Schema.Types.ObjectId, ref: "Expert" }],
    alertsSent: [
      {
        threshold: Number,
        axis: { type: String, enum: ["hours", "cost"] },
        sentAt: Date,
      },
    ],
    // Excel import fields
    externalId:          { type: String, default: "", trim: true },
    segment:             { type: String, default: "", trim: true },
    notes:               { type: String, default: "", trim: true },
    collaboratorsRaw:    { type: String, default: "", trim: true },
    validatedByManager:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indexes from README
ProjectSchema.index({ status: 1, paceIndexHours: -1 });

export default mongoose.model<IProject>("Project", ProjectSchema, "projects");
