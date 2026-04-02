import { Request, Response } from "express";
import * as XLSX from "xlsx";
import Client from "../models/Client";

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

export const createClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, sector, phone, email, address, notes } = req.body;
    if (!name) { res.status(400).json({ message: "Name is required" }); return; }
    const existing = await Client.findOne({ name: name.trim() });
    if (existing) { res.status(409).json({ message: "A client with this name already exists" }); return; }
    const client = await Client.create({ name, sector, phone, email, address, notes });
    res.status(201).json(client);
  } catch (err) {
    console.error("createClient error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!client) { res.status(404).json({ message: "Client not found" }); return; }
    res.json(client);
  } catch (err) {
    console.error("updateClient error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteClient = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) { res.status(404).json({ message: "Client not found" }); return; }
    res.json({ message: "Client deleted" });
  } catch (err) {
    console.error("deleteClient error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

function safeDate(val: unknown): Date | undefined {
  if (!val) return undefined;
  const d = val instanceof Date ? val : new Date(String(val));
  return isNaN(d.getTime()) ? undefined : d;
}

export const importClients = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ message: "No file uploaded" }); return; }

    const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    let imported = 0, updated = 0, skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const name = String(row["Client_societe"] ?? row["Title"] ?? "").trim();
      if (!name) { skipped++; continue; }

      const externalId = String(row["ID"] ?? "").trim();

      const payload = {
        name,
        phone:          String(row["Client_telpro"]           ?? "").trim(),
        address:        String(row["Client_AdresseCourrier"]  ?? "").trim(),
        siret:          String(row["SIRET"]                   ?? "").trim(),
        espaceClient:   String(row["Client_espaceclient"]     ?? "").trim(),
        espaceExtranet: String(row["EspaceExtranet"]          ?? "").trim(),
        formeJuridique: String(row["Formejuridique"]          ?? "").trim(),
        tvaRegime:      String(row["TVAR\u00e9gime"] ?? row["TVARégime"] ?? row["TVAR_x00e9_gime"] ?? "").trim(),
        tvaDate:        safeDate(row["TVAdate"]),
        dateCloture:    safeDate(row["DateCloture"]),
        etat:           String(row["Etat"]       ?? "").trim(),
        pays:           String(row["Pays"]       ?? "").trim(),
        assignedTo:     String(row["AssignedTo"] ?? "").trim(),
        idGrpIntTeams:  String(row["IDGrpIntTeams"] ?? "").trim(),
        ...(externalId ? { externalId } : {}),
      };

      try {
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

    res.json({ imported, updated, skipped, errors });
  } catch (err) {
    console.error("importClients error:", err);
    res.status(500).json({ message: "Server error during import" });
  }
};
