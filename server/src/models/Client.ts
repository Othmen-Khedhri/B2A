// ─── Client model ─────────────────────────────────────────────────────────────
// Represents a firm client — a company or individual that the firm provides
// accounting/audit/consulting services to.
//
// Two groups of fields:
//
//   Core fields (manually entered via the Clients UI):
//     name, sector, phone, email, address, notes
//
//   CRM import fields (populated from the firm's CRM export Excel):
//     siret, espaceClient, espaceExtranet, formeJuridique, tvaRegime,
//     tvaDate, dateCloture, etat, pays, assignedTo, externalId, idGrpIntTeams
//
// Matching strategy for imports:
//   If a row has an externalId (CRM ID), we match on that (stable across name changes).
//   Otherwise we match by name. The sparse index on externalId allows multiple
//   documents to have an empty/null externalId without violating uniqueness.

import mongoose, { Document, Schema } from "mongoose";

export interface IClient extends Document {
  name:           string;
  sector:         string;
  phone:          string;
  email:          string;
  address:        string;
  notes:          string;
  // CRM import fields
  siret:          string;  // French company registration number
  espaceClient:   string;  // URL/ID for the client's online portal
  espaceExtranet: string;  // URL/ID for the extranet space
  formeJuridique: string;  // Legal form: SARL, SA, SAS, etc.
  tvaRegime:      string;  // VAT regime: "Réel normal", "Simplifié", etc.
  tvaDate?:       Date;    // VAT registration date
  dateCloture?:   Date;    // Fiscal year-end date (e.g. 31/12 or 31/03)
  etat:           string;  // Status: "Actif", "Inactif", etc.
  pays:           string;  // Country
  assignedTo:     string;  // Responsible partner name (from CRM)
  externalId:     string;  // CRM system ID (stable key for re-imports)
  idGrpIntTeams:  string;  // Internal Teams group ID
  createdAt:      Date;
  updatedAt:      Date;
}

const ClientSchema = new Schema<IClient>(
  {
    name:           { type: String, required: [true, "Name is required"], trim: true },
    sector:         { type: String, default: "", trim: true },
    phone:          { type: String, default: "", trim: true },
    email:          { type: String, default: "", trim: true, lowercase: true },
    address:        { type: String, default: "", trim: true },
    notes:          { type: String, default: "", trim: true },
    // CRM import fields
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

// ── Indexes ────────────────────────────────────────────────────────────────────
// Non-unique name index for search queries (case-sensitive; $regex queries use this)
ClientSchema.index({ name: 1 });
// Sparse unique index on externalId: unique among docs that HAVE a non-empty externalId,
// but allows multiple docs with an empty string or no externalId at all.
ClientSchema.index({ externalId: 1 }, { sparse: true });

export default mongoose.model<IClient>("Client", ClientSchema, "clients");
