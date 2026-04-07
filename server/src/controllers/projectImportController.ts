import { Response } from "express";
import * as XLSX from "xlsx";
import { AuthRequest } from "../middleware/authMiddleware";
import Project from "../models/Project";
import Expert from "../models/Expert";
import { ProjectStatus } from "../models/Project";
import { logAudit } from "../utils/auditLogger";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const toNum = (v: unknown): number => Number(v) || 0;
const toStr = (v: unknown): string => (v == null ? "" : String(v).trim());

/** Map French status strings to the ProjectStatus enum */
function parseStatus(raw: string): ProjectStatus {
  const s = raw.toLowerCase().trim();
  if (s.includes("cours") || s === "actif" || s === "active") return "active";
  if (s.includes("termin"))                                      return "completed";
  if (s.includes("attente") || s === "hold")                    return "on-hold";
  if (s.includes("annul"))                                       return "cancelled";
  return "active";
}

/** Parse a month string like "Jan-25", "01/2025", "2025-01", "janvier 2025", or an Excel serial */
function parseMonthDate(val: unknown, endOfMonth = false): Date {
  if (val instanceof Date && !isNaN(val.getTime())) {
    const d = new Date(val.getFullYear(), val.getMonth(), endOfMonth ? 28 : 1);
    return d;
  }

  if (typeof val === "number") {
    // Excel serial date
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return new Date(d.getFullYear(), d.getMonth(), endOfMonth ? 28 : 1);
  }

  if (typeof val === "string") {
    const s = val.trim();

    // "MM/YYYY" or "YYYY/MM"
    const slashMatch = s.match(/^(\d{1,2})\/(\d{4})$/) || s.match(/^(\d{4})\/(\d{1,2})$/);
    if (slashMatch) {
      const [, a, b] = slashMatch;
      const [month, year] = Number(a) > 12 ? [Number(b) - 1, Number(a)] : [Number(a) - 1, Number(b)];
      return new Date(year, month, endOfMonth ? 28 : 1);
    }

    // "YYYY-MM"
    const dashMatch = s.match(/^(\d{4})-(\d{1,2})$/);
    if (dashMatch) {
      return new Date(Number(dashMatch[1]), Number(dashMatch[2]) - 1, endOfMonth ? 28 : 1);
    }

    // "Jan-25" or "Jan 2025"
    const monthMap: Record<string, number> = {
      jan: 0, fév: 1, fev: 1, feb: 1, mar: 2, avr: 3, apr: 3,
      mai: 4, may: 4, jun: 5, jui: 5, jul: 6, aoû: 7, aou: 7, aug: 7,
      sep: 8, oct: 9, nov: 10, déc: 11, dec: 11,
    };
    const shortMatch = s.match(/^([a-zéûîôàâèùäëïü]{3})[-./ ]?(\d{2,4})$/i);
    if (shortMatch) {
      const mon = monthMap[shortMatch[1].toLowerCase()] ?? 0;
      let year = Number(shortMatch[2]);
      if (year < 100) year += 2000;
      return new Date(year, mon, endOfMonth ? 28 : 1);
    }
  }

  // Fallback: today
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), endOfMonth ? 28 : 1);
}

/** Resolve a comma-separated list of names to Expert ObjectIds */
async function resolveCollaborators(raw: string): Promise<{ ids: string[]; notFound: string[] }> {
  if (!raw.trim()) return { ids: [], notFound: [] };
  const names = raw.split(/[,;|]+/).map((n) => n.trim()).filter(Boolean);
  const ids: string[] = [];
  const notFound: string[] = [];

  for (const name of names) {
    const expert = await Expert.findOne({ name: { $regex: name, $options: "i" } }).select("_id");
    if (expert) ids.push((expert._id as { toString(): string }).toString());
    else notFound.push(name);
  }
  return { ids, notFound };
}

// ─── Column aliases ────────────────────────────────────────────────────────────

function col(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
  }
  return undefined;
}

// ─── Controller ───────────────────────────────────────────────────────────────

export const importProjects = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ message: "Aucun fichier fourni." });
    return;
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const rows     = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    if (rows.length === 0) {
      res.status(400).json({ message: "Le fichier Excel est vide ou illisible." });
      return;
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed + header row

      try {
        // ── Required: project name ──
        const name = toStr(
          col(row, "ID Nouveau Projet", "ID Projet", "Projet", "Name", "nom")
        );
        if (!name) {
          errors.push(`Ligne ${rowNum} : "ID Nouveau Projet" manquant — ligne ignorée.`);
          continue;
        }

        // ── Optional fields ──
        const externalId   = toStr(col(row, "Code Sage Proposé", "Code Sage", "Code", "ExternalId"));
        const clientName   = toStr(col(row, "Client", "client"));
        const segment      = toStr(col(row, "Segment", "segment"));
        const type         = toStr(col(row, "Type de Mission", "Type Mission", "Type", "type")) || "Général";
        const managerName  = toStr(col(row, "Manager Proposé", "Manager", "Responsable", "manager"));
        const budgetCost   = toNum(col(row, "Budget Estimé (TND)", "Budget Estimé", "Budget", "budget"));
        const budgetHours  = toNum(col(row, "Heures Estimées", "Heures Budget", "heures", "hours"));
        const collabRaw    = toStr(col(row, "Collaborateurs", "collaborateurs", "Collaborator", "staff"));
        const notes        = toStr(col(row, "Notes", "notes", "Note"));
        const statusRaw    = toStr(col(row, "Statut", "Status", "statut"));
        const validatedRaw = toStr(col(row, "Validé Par Manager", "Validé", "Validated", "valide"));

        const startRaw = col(row, "Mois Début Prévu", "Mois Début", "Date Début", "Start");
        const endRaw   = col(row, "Mois Fin Prévu",   "Mois Fin",   "Date Fin",   "End");

        const startDate = parseMonthDate(startRaw, false);
        const endDate   = parseMonthDate(endRaw,   true);

        const status: ProjectStatus = statusRaw ? parseStatus(statusRaw) : "active";

        const validatedByManager =
          typeof validatedRaw === "boolean"
            ? validatedRaw
            : ["oui", "yes", "true", "1", "vrai"].includes(validatedRaw.toLowerCase());

        // ── Resolve collaborators ──
        const { ids: staffIds, notFound } = await resolveCollaborators(collabRaw);
        if (notFound.length > 0) {
          warnings.push(`Ligne ${rowNum} (${name}) : collaborateurs introuvables → ${notFound.join(", ")}`);
        }

        // ── Resolve manager by name if possible ──
        let responsiblePartnerId: string | undefined;
        if (managerName) {
          const mgr = await Expert.findOne({
            name: { $regex: managerName, $options: "i" },
            role: { $in: ["admin", "manager"] },
          }).select("_id");
          if (mgr) responsiblePartnerId = (mgr._id as { toString(): string }).toString();
        }

        // ── Upsert by project name ──
        const updatePayload: Record<string, unknown> = {
          name,
          clientName,
          type,
          segment,
          budgetCost,
          budgetHours,
          startDate,
          endDate,
          status,
          responsiblePartnerName: managerName,
          notes,
          collaboratorsRaw: collabRaw,
          validatedByManager,
          ...(externalId       && { externalId }),
          ...(responsiblePartnerId && { responsiblePartnerId }),
          ...(staffIds.length  && { assignedStaff: staffIds }),
        };

        const existing = await Project.findOne({ name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } });

        if (existing) {
          await Project.findByIdAndUpdate(existing._id, { $set: updatePayload });
          updated++;
        } else {
          await Project.create({ ...updatePayload, hoursConsumed: 0, costConsumed: 0, invoicedAmount: 0 });
          created++;
        }
      } catch (e) {
        errors.push(`Ligne ${rowNum} : ${(e as Error).message}`);
      }
    }

    logAudit(req, {
      action: "IMPORT", resource: "project",
      description: `Imported projects from Excel: ${created} created, ${updated} updated`,
      metadata: { created, updated, total: rows.length, errors: errors.length, warnings: warnings.length },
    });
    res.json({ created, updated, errors, warnings, total: rows.length });
  } catch (err) {
    console.error("importProjects error:", err);
    res.status(500).json({ message: "Échec de l'import : " + (err as Error).message });
  }
};
