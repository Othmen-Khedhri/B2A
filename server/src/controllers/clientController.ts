// ─── Client controller ────────────────────────────────────────────────────────
// CRUD + bulk import for the Client collection.
// "Client" here means a firm's client (e.g. "Cabinet Dupont"), not an HTTP client.
//
//   GET    /api/clients               — list clients (searchable)
//   GET    /api/clients/:id           — one client
//   POST   /api/clients               — create a client
//   PUT    /api/clients/:id           — update a client
//   DELETE /api/clients/:id           — delete a client
//   POST   /api/clients/import        — bulk-upsert from an Excel file (CRM export)

import { Request, Response } from "express";
import * as XLSX from "xlsx";
import Client from "../models/Client";
import { logAudit, diffChanges } from "../utils/auditLogger";

// ─── GET /api/clients ─────────────────────────────────────────────────────────
// Returns all clients sorted alphabetically, with optional name search.
export const getClients = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search } = req.query;
    const filter = search ? { name: { $regex: String(search), $options: "i" } } : {};
    const clients = await Client.find(filter).sort({ name: 1 });
    res.json(clients);
  } catch (err) {
    console.error("getClients error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── GET /api/clients/:id ─────────────────────────────────────────────────────
export const getClientById = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) { res.status(404).json({ message: "Client not found" }); return; }
    res.json(client);
  } catch (err) {
    console.error("getClientById error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST /api/clients ────────────────────────────────────────────────────────
// Creates a new client. Rejects duplicate names (case-sensitive exact match).
export const createClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, sector, phone, email, address, notes } = req.body;
    if (!name) { res.status(400).json({ message: "Name is required" }); return; }

    // Prevent duplicates — client names are used as lookup keys in budget and timesheet data
    const existing = await Client.findOne({ name: name.trim() });
    if (existing) { res.status(409).json({ message: "A client with this name already exists" }); return; }

    const client = await Client.create({ name, sector, phone, email, address, notes });
    logAudit(req, {
      action: "CREATE", resource: "client",
      resourceId:   client._id.toString(),
      resourceName: client.name,
      description:  `Created client "${client.name}"`,
    });
    res.status(201).json(client);
  } catch (err) {
    console.error("createClient error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── PUT /api/clients/:id ─────────────────────────────────────────────────────
export const updateClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const before = await Client.findById(req.params.id).lean();
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!client) { res.status(404).json({ message: "Client not found" }); return; }
    logAudit(req, {
      action: "UPDATE", resource: "client",
      resourceId:   client._id.toString(),
      resourceName: client.name,
      description:  `Updated client "${client.name}"`,
      changes:      before ? diffChanges(before as unknown as Record<string, unknown>, req.body) : {},
    });
    res.json(client);
  } catch (err) {
    console.error("updateClient error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── DELETE /api/clients/:id ──────────────────────────────────────────────────
export const deleteClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) { res.status(404).json({ message: "Client not found" }); return; }
    logAudit(req, {
      action: "DELETE", resource: "client",
      resourceId:   client._id.toString(),
      resourceName: client.name,
      description:  `Deleted client "${client.name}"`,
    });
    res.json({ message: "Client deleted" });
  } catch (err) {
    console.error("deleteClient error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── safeDate ─────────────────────────────────────────────────────────────────
// Parses a date from an Excel cell value — xlsx may return a Date object or a
// string depending on the cell format. Returns undefined for empty/invalid values
// so optional date fields are simply omitted from the database document.
function safeDate(val: unknown): Date | undefined {
  if (!val) return undefined;
  const d = val instanceof Date ? val : new Date(String(val));
  return isNaN(d.getTime()) ? undefined : d;
}

// ─── POST /api/clients/import ─────────────────────────────────────────────────
// Bulk-upsert clients from a CRM export Excel file.
// Supports the column layout exported by the firm's CRM tool.
// Each row is matched to an existing client using externalId (if present)
// or by name — matching rows are updated, new rows are inserted.
//
// Key column names (as exported by the CRM):
//   Client_societe / Title  — client name
//   ID                      — CRM external ID (for stable matching across re-imports)
//   Client_telpro           — phone number
//   Client_AdresseCourrier  — mailing address
//   SIRET                   — French company registration number
//   Formejuridique          — legal form (SARL, SA, etc.)
//   TVARégime               — VAT regime
//   TVAdate                 — VAT registration date
//   DateCloture             — fiscal year-end date
//   Etat                    — client status (active / inactive)
//   AssignedTo              — responsible partner name
export const importClients = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ message: "No file uploaded" }); return; }

    // cellDates:true ensures date columns are parsed as JS Date objects, not serial numbers
    const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    // defval:"" ensures missing cells come back as empty strings instead of undefined
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    let imported = 0, updated = 0, skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      // Support two possible name columns from different CRM export formats
      const name = String(row["Client_societe"] ?? row["Title"] ?? "").trim();
      if (!name) { skipped++; continue; } // blank rows

      const externalId = String(row["ID"] ?? "").trim();

      // Build the full payload from all known CRM columns.
      // The TVA column name has a special character (é) that may be encoded differently
      // across platforms — we try three variants to be safe.
      const payload = {
        name,
        phone:          String(row["Client_telpro"]           ?? "").trim(),
        address:        String(row["Client_AdresseCourrier"]  ?? "").trim(),
        siret:          String(row["SIRET"]                   ?? "").trim(),
        espaceClient:   String(row["Client_espaceclient"]     ?? "").trim(),
        espaceExtranet: String(row["EspaceExtranet"]          ?? "").trim(),
        formeJuridique: String(row["Formejuridique"]          ?? "").trim(),
        // Try three possible encodings of "TVARégime"
        tvaRegime:      String(row["TVARégime"] ?? row["TVARégime"] ?? row["TVAR_x00e9_gime"] ?? "").trim(),
        tvaDate:        safeDate(row["TVAdate"]),
        dateCloture:    safeDate(row["DateCloture"]),
        etat:           String(row["Etat"]       ?? "").trim(),
        pays:           String(row["Pays"]       ?? "").trim(),
        assignedTo:     String(row["AssignedTo"] ?? "").trim(),
        idGrpIntTeams:  String(row["IDGrpIntTeams"] ?? "").trim(),
        ...(externalId ? { externalId } : {}), // only set externalId if it exists
      };

      try {
        // Prefer matching on externalId (stable across renames); fall back to name
        const filter = externalId ? { externalId } : { name };
        const existing = await Client.findOne(filter);
        if (existing) {
          await Client.findByIdAndUpdate(existing._id, payload);
          updated++;
        } else {
          await Client.create(payload);
          imported++;
        }
      } catch (rowErr) {
        errors.push(`${name}: ${(rowErr as Error).message}`);
      }
    }

    logAudit(req, {
      action: "IMPORT", resource: "client",
      description: `Imported clients from Excel: ${imported} new, ${updated} updated, ${skipped} skipped`,
      metadata:    { imported, updated, skipped, errors },
    });
    res.json({ imported, updated, skipped, errors });
  } catch (err) {
    console.error("importClients error:", err);
    res.status(500).json({ message: "Server error during import" });
  }
};
