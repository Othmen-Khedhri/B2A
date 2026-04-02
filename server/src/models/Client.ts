import mongoose, { Document, Schema } from "mongoose";

export interface IClient extends Document {
  name: string;
  sector: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  // Excel import fields
  siret: string;
  espaceClient: string;
  espaceExtranet: string;
  formeJuridique: string;
  tvaRegime: string;
  tvaDate?: Date;
  dateCloture?: Date;
  etat: string;
  pays: string;
  assignedTo: string;
  externalId: string;
  idGrpIntTeams: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    name:           { type: String, required: [true, "Name is required"], trim: true },
    sector:         { type: String, default: "", trim: true },
    phone:          { type: String, default: "", trim: true },
    email:          { type: String, default: "", trim: true, lowercase: true },
    address:        { type: String, default: "", trim: true },
    notes:          { type: String, default: "", trim: true },
    // Excel import fields
    siret:          { type: String, default: "", trim: true },
    espaceClient:   { type: String, default: "", trim: true },
    espaceExtranet: { type: String, default: "", trim: true },
    formeJuridique: { type: String, default: "", trim: true },
    tvaRegime:      { type: String, default: "", trim: true },
    tvaDate:        { type: Date },
    dateCloture:    { type: Date },
    etat:           { type: String, default: "", trim: true },
    pays:           { type: String, default: "", trim: true },
    assignedTo:     { type: String, default: "", trim: true },
    externalId:     { type: String, default: "", trim: true },
    idGrpIntTeams:  { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

ClientSchema.index({ name: 1 });
ClientSchema.index({ externalId: 1 }, { sparse: true });

export default mongoose.model<IClient>("Client", ClientSchema, "clients");
