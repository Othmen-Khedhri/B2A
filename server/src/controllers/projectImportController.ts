import { Response } from "express";
import * as XLSX from "xlsx";
import { AuthRequest } from "../middleware/authMiddleware";
import Project from "../models/Project";
import Expert from "../models/Expert";
import { ProjectStatus } from "../models/Project";
import { logAudit } from "../utils/auditLogger";
import { syncProjectConsistency } from "../utils/projectConsistency";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const toNum = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (v == null) return 0;

  const raw = String(v).trim();
  if (!raw) return 0;

  const cleaned = raw
    .replace(/\s+/g, "")
    .replace(/tnd/gi, "")
    .replace(/€/g, "")
    .replace(/h/gi, "")
    .replace(/%/g, "");

  // Handle both 1,234.56 and 1.234,56 formats.
  const normalized = cleaned.includes(",") && cleaned.includes(".")
    ? cleaned.replace(/,/g, "")
    : cleaned.replace(/,/g, ".");

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};
const toStr = (v: unknown): string => (v == null ? "" : String(v).trim());
const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizeHeader = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** Map French status strings to the ProjectStatus enum */
function parseStatus(raw: string): ProjectStatus {
  const s = raw.toLowerCase().trim();
  if (s.includes("cours") || s === "actif" || s === "active") return "active";
  if (s.includes("termin"))                                      return "completed";
  if (s.includes("attente") || s === "hold")                    return "on-hold";
  if (s.includes("annul"))                                       return "cancelled";
  return "active";
}

/** Parse a date string in multiple formats:
 *  "DD/MM/YYYY", "MM/YYYY", "YYYY/MM", "YYYY-MM-DD", "YYYY-MM",
 *  "Jan-25", "janvier 2025", or an Excel serial number / Date object.
 */
function parseMonthDate(val: unknown, _endOfMonth = false): Date {
  if (val instanceof Date && !isNaN(val.getTime())) {
    return new Date(val.getFullYear(), val.getMonth(), val.getDate());
  }

  if (typeof val === "number") {
    // Excel serial date
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  if (typeof val === "string") {
    const s = val.trim();

    // "DD/MM/YYYY" — most common French full date (e.g. "23/04/2026")
    const ddmmyyyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      return new Date(Number(ddmmyyyy[3]), Number(ddmmyyyy[2]) - 1, Number(ddmmyyyy[1]));
    }

    // "YYYY-MM-DD" (ISO full date)
    const isoFull = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoFull) {
      return new Date(Number(isoFull[1]), Number(isoFull[2]) - 1, Number(isoFull[3]));
    }

    // "MM/YYYY" or "YYYY/MM"
    const slashMatch = s.match(/^(\d{1,2})\/(\d{4})$/) || s.match(/^(\d{4})\/(\d{1,2})$/);
    if (slashMatch) {
      const [, a, b] = slashMatch;
      const [month, year] = Number(a) > 12 ? [Number(b) - 1, Number(a)] : [Number(a) - 1, Number(b)];
      return new Date(year, month, 1);
    }

    // "YYYY-MM"
    const dashMatch = s.match(/^(\d{4})-(\d{1,2})$/);
    if (dashMatch) {
      return new Date(Number(dashMatch[1]), Number(dashMatch[2]) - 1, 1);
    }

    // "Jan-25", "Jan 2025", "janvier 2025"
    const monthMap: Record<string, number> = {
      jan: 0, janv: 0, janvier: 0,
      fév: 1, fev: 1, févr: 1, fevr: 1, feb: 1, février: 1, fevrier: 1,
      mar: 2, mars: 2,
      avr: 3, apr: 3, avril: 3,
      mai: 4, may: 4,
      jun: 5, jui: 5, juin: 5,
      jul: 6, juil: 6, juillet: 6,
      aoû: 7, aou: 7, aug: 7, août: 7, aout: 7,
      sep: 8, sept: 8, septembre: 8,
      oct: 9, octobre: 9,
      nov: 10, novembre: 10,
      déc: 11, dec: 11, décembre: 11, decembre: 11,
    };
    const shortMatch = s.match(/^([a-zéûîôàâèùäëïü]+)[-./ ]?(\d{2,4})$/i);
    if (shortMatch) {
      const key = shortMatch[1].toLowerCase();
      const mon = monthMap[key] ?? 0;
      let year = Number(shortMatch[2]);
      if (year < 100) year += 2000;
      return new Date(year, mon, 1);
    }
  }

  // Fallback: today
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
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

function colLike(row: Record<string, unknown>, ...fragments: string[]): unknown {
  const normalizedFragments = fragments.map(normalizeHeader);

  for (const [k, v] of Object.entries(row)) {
    if (v === undefined || v === null || v === "") continue;
    const nk = normalizeHeader(k);
    const matched = normalizedFragments.some((f) => nk.includes(f));
    if (matched) return v;
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

    // Build expert name → coutHoraire lookup for cost computation
    const allExperts = await Expert.find().select("name coutHoraire").lean();
    const rateByName = new Map<string, number>();
    for (const e of allExperts) {
      rateByName.set((e.name || "").trim().toLowerCase(), Number(e.coutHoraire) || 0);
    }

    // costConsumed = hoursConsumed × avg(coutHoraire of collaborators)
    const computeMetrics = (
      hoursConsumed: number,
      collaboratorsRaw: string,
      budgetHours: number,
      budgetCost: number,
      startDate: Date,
      endDate: Date,
    ) => {
      const names  = (collaboratorsRaw || "").split(/[|,;]+/).map((n) => n.trim().toLowerCase()).filter(Boolean);
      const rates  = names.map((n) => rateByName.get(n) || 0);
      const avgRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
      const costConsumed = hoursConsumed * avgRate;

      const now         = Date.now();
      const totalMs     = endDate.getTime() - startDate.getTime();
      // Use 5% minimum elapsed to avoid extreme pace values on projects that just started
      const elapsedRatio = totalMs > 0
        ? Math.min(Math.max((now - startDate.getTime()) / totalMs, 0.05), 1)
        : 1;

      const paceIndexHours = budgetHours > 0 ? Math.min((hoursConsumed / budgetHours) / elapsedRatio, 5) : 0;
      const paceIndexCost  = budgetCost  > 0 ? Math.min((costConsumed  / budgetCost)  / elapsedRatio, 5) : 0;
      const grossMargin    = budgetCost - costConsumed;
      const marginPercent  = budgetCost > 0 ? (grossMargin / budgetCost) * 100 : 0;
      const effectiveCostPerHour = hoursConsumed > 0 ? costConsumed / hoursConsumed : 0;

      return { costConsumed, paceIndexHours, paceIndexCost, grossMargin, marginPercent, effectiveCostPerHour };
    };

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
          col(row, "ID Nouveau Projet", "ID Projet", "Projet", "Project", "Name", "nom")
        );
        if (!name) {
          errors.push(`Ligne ${rowNum} : "ID Nouveau Projet" manquant — ligne ignorée.`);
          continue;
        }

        // ── Optional fields ──
        const externalId   = toStr(col(row, "Code Sage Proposé", "Code Sage Projet", "Code Sage", "Code", "ExternalId", "externalId"));
        const clientName   = toStr(col(row, "Nom du Client", "Client", "Nom Client", "client", "Client Name"));
        const segment      = toStr(col(row, "Segment", "segment"));
        const sector       = toStr(col(row, "Secteur d'Activité", "Secteur", "Secteur d Activite", "sector"));
        const type         = toStr(col(row, "Type de Mission", "Type Mission", "Type", "type")) || "Général";
        const managerName  = toStr(col(row, "Manager Proposé", "Responsable", "Manager", "Collab Principal", "manager"));
        const budgetCost   = toNum(
          col(row, "Budget Estimé (TND)", "Budget Estimé", "Budget HT", "Budget", "budget")
          ?? colLike(row, "budgetestime", "budgettnd", "budgetht", "budget")
        );
        const budgetHours  = toNum(
          col(row, "Heures Estimées", "Heures Budget", "Heures budget", "heures", "hours")
          ?? colLike(row, "heuresestimees", "heuresbudget", "budgethours")
        );
        const hoursConsumedRaw =
          col(row, "Heures Consommées", "Heures Réelles", "Heures réelles", "Hours Consumed", "hoursConsumed")
          ?? colLike(row, "heuresconsommees", "heuresreelles", "hoursconsumed", "actualhours");
        // "Noms Collaborateurs" with "|" separator (already handled by resolveCollaborators)
        const collabRaw    = toStr(col(row, "Noms Collaborateurs", "Collaborateurs", "collaborateurs", "Collaborator", "staff", "Equipe"));
        const notes        = toStr(col(row, "Notes", "notes", "Note", "Commentaires"));
        const statusRaw    = toStr(col(row, "Statut", "Status", "statut"));
        const validatedRaw = toStr(col(row, "Validé Par Manager", "Validé", "Validated", "valide"));

        // Full dates: "DD/MM/YYYY" (from real Excel), also "Mois Début Prévu" month-only format
        const startRaw = col(row, "Date Début", "Mois Début Prévu", "Mois Début", "Start", "Début");
        const endRaw   = col(row, "Date Fin Prévue", "Date Fin",  "Mois Fin Prévu", "Mois Fin", "End", "Fin");

        const startDate = parseMonthDate(startRaw, false);
        const endDate   = parseMonthDate(endRaw,   true);

        if (rowNum === 2) {
          console.log("\n── Excel columns detected ──", Object.keys(row));
        }
        console.log(`\n── Row ${rowNum}: "${name}" ──`);
        console.log({
          name,
          externalId,
          clientName,
          segment,
          sector,
          type,
          managerName,
          budgetCost,
          budgetHours,
          hoursConsumed: toNum(hoursConsumedRaw),
          status: statusRaw || "(default: active)",
          validatedByManager: ["oui","yes","true","1","vrai"].includes(validatedRaw.toLowerCase()),
          startRaw,
          startDate,
          endRaw,
          endDate,
          collabRaw,
          notes,
        });

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

        // ── Base payload (no hours/cost — handled separately) ──
        const basePayload: Record<string, unknown> = {
          name,
          clientName,
          type,
          segment: segment || sector,
          budgetCost,
          budgetHours,
          startDate,
          endDate,
          status,
          responsiblePartnerName: managerName,
          notes,
          collaboratorsRaw: collabRaw,
          validatedByManager,
          ...(externalId           && { externalId }),
          ...(responsiblePartnerId && { responsiblePartnerId }),
          ...(staffIds.length      && { assignedStaff: staffIds }),
        };

        const newHours = toNum(hoursConsumedRaw) || 0;

        // Match existing project by external ID first (stable key), then by exact name.
        let existing = null as Awaited<ReturnType<typeof Project.findOne>>;
        if (externalId) {
          existing = await Project.findOne({
            externalId: { $regex: `^${escapeRegExp(externalId)}$`, $options: "i" },
          }).sort({ hoursConsumed: -1, updatedAt: -1 });
        }

        if (!existing) {
          existing = await Project.findOne({
            name: { $regex: `^${escapeRegExp(name)}$`, $options: "i" },
          }).sort({ hoursConsumed: -1, updatedAt: -1 });
        }

        if (existing) {
          // INCREMENT hours (Excel file contains the period's new hours, not a running total)
          const totalHours = (Number(existing.hoursConsumed) || 0) + newHours;
          const metrics = computeMetrics(totalHours, collabRaw, budgetHours, budgetCost, startDate, endDate);

          const updatedProject = await Project.findByIdAndUpdate(
            existing._id,
            {
              $set:  { ...basePayload, ...metrics },
              ...(newHours > 0 && { $inc: { hoursConsumed: newHours } }),
            },
            { new: true, runValidators: true },
          );

          if (updatedProject) {
            await syncProjectConsistency({
              projectId:      updatedProject._id.toString(),
              projectName:    updatedProject.name,
              status:         updatedProject.status,
              previousStatus: existing.status,
            });
          }

          updated++;
        } else {
          const metrics = computeMetrics(newHours, collabRaw, budgetHours, budgetCost, startDate, endDate);

          const createdProject = await Project.create({
            ...basePayload,
            hoursConsumed: newHours,
            ...metrics,
          });

          await syncProjectConsistency({
            projectId:   createdProject._id.toString(),
            projectName: createdProject.name,
            status:      createdProject.status,
          });

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
