// ─── Project import controller ────────────────────────────────────────────────
// Handles bulk project import from an Excel file (typically the firm's project
// tracking spreadsheet).
//
//   POST /api/projects/import  — parse Excel and upsert projects into the DB
//
// Key design decisions:
//   - Projects are matched first by externalId (stable), then by exact name
//   - Hours are INCREMENTED, not replaced (the file contains period hours, not totals)
//   - Derived metrics (pace, margin) are recomputed after each upsert
//   - Collaborators are resolved in-memory from a pre-loaded expert map (single DB query)
//   - All date formats from French project spreadsheets are supported:
//     "DD/MM/YYYY", "MM/YYYY", "YYYY-MM-DD", "Jan-25", "janvier 2025", Excel serials
//   - Row errors do NOT abort the whole import; each row is independent

import { Response } from "express";
import * as XLSX from "xlsx";
import { AuthRequest } from "../middleware/authMiddleware";
import Project from "../models/Project";
import Expert from "../models/Expert";
import { ProjectStatus } from "../models/Project";
import { logAudit } from "../utils/auditLogger";
import { syncProjectConsistency } from "../utils/projectConsistency";

// ─── toNum ────────────────────────────────────────────────────────────────────
// Robustly converts an Excel cell value to a number.
// Handles: plain numbers, TND currency amounts, hour values ("150h"), percentages,
// both comma-decimal ("1,5") and period-decimal ("1.5") conventions,
// and European thousands separators ("1.234,56").
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

  // Detect whether the number uses European format: "1.234,56" vs "1,234.56"
  const normalized = cleaned.includes(",") && cleaned.includes(".")
    ? cleaned.replace(/,/g, "")   // European: drop thousands separator (comma)
    : cleaned.replace(/,/g, "."); // French: replace decimal comma with period

  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

const toStr = (v: unknown): string => (v == null ? "" : String(v).trim());

// ─── escapeRegExp ─────────────────────────────────────────────────────────────
// Escapes special regex characters in a string so it can be used safely in a
// MongoDB $regex query (prevents injection via project names like "A.B (C)").
const escapeRegExp = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ─── normalizeHeader ──────────────────────────────────────────────────────────
// Strips accents, converts to lowercase, and removes non-alphanumeric characters.
// Used for fuzzy column name matching (e.g. "Heures Estimées" → "heuresestimees").
const normalizeHeader = (s: string): string =>
  s.normalize("NFD")
   .replace(/[̀-ͯ]/g, "") // strip combining diacritics
   .toLowerCase()
   .replace(/[^a-z0-9]/g, "");

// ─── parseStatus ─────────────────────────────────────────────────────────────
// Maps French project status strings to the ProjectStatus enum used in the DB.
function parseStatus(raw: string): ProjectStatus {
  const s = raw.toLowerCase().trim();
  if (s.includes("cours") || s === "actif" || s === "active") return "active";
  if (s.includes("termin"))                                     return "completed";
  if (s.includes("attente") || s === "hold")                   return "on-hold";
  if (s.includes("annul"))                                      return "cancelled";
  return "active"; // default to active for unknown statuses
}

// ─── parseMonthDate ───────────────────────────────────────────────────────────
// Parses a date value from an Excel cell in any of the formats used in the firm's
// spreadsheets. Returns a JS Date at midnight local time (no time-zone offset).
function parseMonthDate(val: unknown, _endOfMonth = false): Date {
  // Already a JS Date (returned by xlsx when cellDates:true)
  if (val instanceof Date && !isNaN(val.getTime())) {
    return new Date(val.getFullYear(), val.getMonth(), val.getDate());
  }

  // Excel serial date number (days since 1900-01-01)
  if (typeof val === "number") {
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  if (typeof val === "string") {
    const s = val.trim();

    // "DD/MM/YYYY" — French full date format
    const ddmmyyyy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
      return new Date(Number(ddmmyyyy[3]), Number(ddmmyyyy[2]) - 1, Number(ddmmyyyy[1]));
    }

    // "YYYY-MM-DD" — ISO 8601
    const isoFull = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoFull) {
      return new Date(Number(isoFull[1]), Number(isoFull[2]) - 1, Number(isoFull[3]));
    }

    // "MM/YYYY" or "YYYY/MM" — month-only formats
    const slashMatch = s.match(/^(\d{1,2})\/(\d{4})$/) || s.match(/^(\d{4})\/(\d{1,2})$/);
    if (slashMatch) {
      const [, a, b] = slashMatch;
      // Detect which is month and which is year by checking if a > 12
      const [month, year] = Number(a) > 12 ? [Number(b) - 1, Number(a)] : [Number(a) - 1, Number(b)];
      return new Date(year, month, 1);
    }

    // "YYYY-MM" — ISO year-month
    const dashMatch = s.match(/^(\d{4})-(\d{1,2})$/);
    if (dashMatch) {
      return new Date(Number(dashMatch[1]), Number(dashMatch[2]) - 1, 1);
    }

    // "Jan-25", "Jan 2025", "janvier 2025" — French/English month name variants
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
      let year  = Number(shortMatch[2]);
      if (year < 100) year += 2000; // "25" → 2025
      return new Date(year, mon, 1);
    }
  }

  // Unknown format — fallback to today
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// ─── resolveCollaboratorsSync ─────────────────────────────────────────────────
// Parses a pipe/comma/semicolon-separated list of collaborator names and resolves
// each to an Expert _id using the pre-loaded expertMap (in-memory, fast).
// Returns ids (found) and notFound (name strings with no match) separately so
// warnings can be reported without failing the row.
function resolveCollaboratorsSync(
  raw: string,
  expertMap: Map<string, { id: string; role: string }>,
): { ids: string[]; notFound: string[] } {
  if (!raw.trim()) return { ids: [], notFound: [] };
  const names = raw.split(/[,;|]+/).map((n) => n.trim()).filter(Boolean);
  const ids: string[] = [];
  const notFound: string[] = [];

  for (const name of names) {
    const key = name.toLowerCase();
    // Try exact match first, then substring match (handles partial names like "Dupont" matching "Jean Dupont")
    const entry =
      expertMap.get(key) ??
      [...expertMap.entries()].find(([k]) => k.includes(key) || key.includes(k))?.[1];
    if (entry) ids.push(entry.id);
    else        notFound.push(name);
  }
  return { ids, notFound };
}

// ─── col ──────────────────────────────────────────────────────────────────────
// Exact-match column lookup — tries each key alias in order.
function col(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
  }
  return undefined;
}

// ─── colLike ─────────────────────────────────────────────────────────────────
// Fuzzy column lookup — normalises column headers before matching so accents
// and case differences don't prevent a match.
function colLike(row: Record<string, unknown>, ...fragments: string[]): unknown {
  const normalizedFragments = fragments.map(normalizeHeader);
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined || v === null || v === "") continue;
    const nk      = normalizeHeader(k);
    const matched = normalizedFragments.some((f) => nk.includes(f));
    if (matched) return v;
  }
  return undefined;
}

// ─── POST /api/projects/import ────────────────────────────────────────────────
// Main import handler. Reads the uploaded Excel file row by row:
//   1. Parses each row into a structured project payload
//   2. Resolves collaborator names to Expert IDs (using pre-loaded map)
//   3. Matches the row to an existing project (by externalId then by name)
//   4. If found: increments hoursConsumed and updates base fields
//   5. If not found: creates a new project
//   6. Calls syncProjectConsistency() to recalculate pace, margin, and affectations
//
// Returns counts of created/updated rows plus error and warning arrays.
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

    // Pre-load all experts once to avoid N per-row DB queries for collaborator resolution.
    // A typical import has 100–500 rows, each with 1–5 collaborator names — loading all
    // experts once is far more efficient than querying per-name per-row.
    const allExperts = await Expert.find().select("name coutHoraire role").lean();
    const rateByName = new Map<string, number>();
    const expertMap  = new Map<string, { id: string; role: string }>();
    for (const e of allExperts) {
      const key = (e.name || "").trim().toLowerCase();
      rateByName.set(key, Number(e.coutHoraire) || 0);
      expertMap.set(key, { id: (e._id as { toString(): string }).toString(), role: e.role as string });
    }

    // ─── computeMetrics ──────────────────────────────────────────────────────
    // Computes costConsumed (hours × avg hourly rate) and all derived metrics
    // (paceIndex, grossMargin, etc.) given raw hours and collaborator names.
    const computeMetrics = (
      hoursConsumed:    number,
      collaboratorsRaw: string,
      budgetHours:      number,
      budgetCost:       number,
      startDate:        Date,
      endDate:          Date,
    ) => {
      const names   = (collaboratorsRaw || "").split(/[|,;]+/).map((n) => n.trim().toLowerCase()).filter(Boolean);
      const rates   = names.map((n) => rateByName.get(n) || 0);
      const avgRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
      const costConsumed = hoursConsumed * avgRate;

      const now          = Date.now();
      const totalMs      = endDate.getTime() - startDate.getTime();
      // 5% minimum elapsed prevents extreme pace values on brand-new projects
      const elapsedRatio = totalMs > 0
        ? Math.min(Math.max((now - startDate.getTime()) / totalMs, 0.05), 1)
        : 1;

      const paceIndexHours       = budgetHours > 0 ? Math.min((hoursConsumed / budgetHours) / elapsedRatio, 5) : 0;
      const paceIndexCost        = budgetCost  > 0 ? Math.min((costConsumed  / budgetCost)  / elapsedRatio, 5) : 0;
      const grossMargin          = budgetCost - costConsumed;
      const marginPercent        = budgetCost > 0 ? (grossMargin / budgetCost) * 100 : 0;
      const effectiveCostPerHour = hoursConsumed > 0 ? costConsumed / hoursConsumed : 0;

      return { costConsumed, paceIndexHours, paceIndexCost, grossMargin, marginPercent, effectiveCostPerHour };
    };

    let created = 0;
    let updated = 0;
    const errors:   string[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row    = rows[i];
      const rowNum = i + 2; // +1 for 0-index, +1 for the header row

      try {
        // ── Required field: project name ──
        const name = toStr(col(row, "ID Nouveau Projet", "ID Projet", "Projet", "Project", "Name", "nom"));
        if (!name) {
          errors.push(`Ligne ${rowNum} : "ID Nouveau Projet" manquant — ligne ignorée.`);
          continue;
        }

        // ── Optional fields ──
        const externalId  = toStr(col(row, "Code Sage Proposé", "Code Sage Projet", "Code Sage", "Code", "ExternalId", "externalId"));
        const clientName  = toStr(col(row, "Nom du Client", "Client", "Nom Client", "client", "Client Name"));
        const segment     = toStr(col(row, "Segment", "segment"));
        const sector      = toStr(col(row, "Secteur d'Activité", "Secteur", "Secteur d Activite", "sector"));
        const typeRaw     = toStr(col(row, "Type de Mission", "Type Mission", "Type", "type"));

        // Normalise project type to one of the canonical values (accent-insensitive)
        const PROJECT_TYPES = [
          "Audit légal", "Audit interne", "Conseil en organisation", "Conseil fiscal",
          "Assistance juridique", "Révision comptable", "Comptabilité générale",
          "Commissariat aux apports", "Consolidation", "Due diligence", "Formation", "Paie & RH",
        ];
        const type = PROJECT_TYPES.find(
          (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase() ===
                 typeRaw.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
        ) ?? typeRaw || "Général";

        const managerName = toStr(col(row, "Manager Proposé", "Responsable", "Manager", "Collab Principal", "manager"));
        const budgetCost  = toNum(
          col(row, "Budget Estimé (TND)", "Budget Estimé", "Budget HT", "Budget", "budget")
          ?? colLike(row, "budgetestime", "budgettnd", "budgetht", "budget")
        );
        const budgetHours = toNum(
          col(row, "Heures Estimées", "Heures Budget", "Heures budget", "heures", "hours")
          ?? colLike(row, "heuresestimees", "heuresbudget", "budgethours")
        );
        const hoursConsumedRaw =
          col(row, "Heures Consommées", "Heures Réelles", "Heures réelles", "Hours Consumed", "hoursConsumed")
          ?? colLike(row, "heuresconsommees", "heuresreelles", "hoursconsumed", "actualhours");

        const collabRaw    = toStr(col(row, "Noms Collaborateurs", "Collaborateurs", "collaborateurs", "Collaborator", "staff", "Equipe"));
        const notes        = toStr(col(row, "Notes", "notes", "Note", "Commentaires"));
        const statusRaw    = toStr(col(row, "Statut", "Status", "statut"));
        const validatedRaw = toStr(col(row, "Validé Par Manager", "Validé", "Validated", "valide"));

        const startRaw = col(row, "Date Début", "Mois Début Prévu", "Mois Début", "Start", "Début");
        const endRaw   = col(row, "Date Fin Prévue", "Date Fin", "Mois Fin Prévu", "Mois Fin", "End", "Fin");

        const startDate = parseMonthDate(startRaw, false);
        const endDate   = parseMonthDate(endRaw,   true);

        // Log column names only on the first data row (debug aid for column mapping issues)
        if (rowNum === 2) {
          console.log("\n── Excel columns detected ──", Object.keys(row));
        }

        const status: ProjectStatus = statusRaw ? parseStatus(statusRaw) : "active";
        const validatedByManager =
          typeof validatedRaw === "boolean"
            ? validatedRaw
            : ["oui", "yes", "true", "1", "vrai"].includes(validatedRaw.toLowerCase());

        // ── Resolve collaborators from pre-loaded expert map ──
        const { ids: staffIds, notFound } = resolveCollaboratorsSync(collabRaw, expertMap);
        if (notFound.length > 0) {
          warnings.push(`Ligne ${rowNum} (${name}) : collaborateurs introuvables → ${notFound.join(", ")}`);
        }

        // ── Resolve manager by name and role ──
        let responsiblePartnerId: string | undefined;
        if (managerName) {
          const mgrKey   = managerName.trim().toLowerCase();
          const mgrEntry =
            expertMap.get(mgrKey) ??
            [...expertMap.entries()].find(([k]) => k.includes(mgrKey) || mgrKey.includes(k))?.[1];
          // Only set responsiblePartnerId for actual managers/admins (not regular collaborators)
          if (mgrEntry && ["admin", "manager"].includes(mgrEntry.role)) {
            responsiblePartnerId = mgrEntry.id;
          }
        }

        const basePayload: Record<string, unknown> = {
          name,
          clientName,
          type,
          segment: segment || sector, // prefer segment; fall back to sector
          budgetCost,
          budgetHours,
          startDate,
          endDate,
          status,
          responsiblePartnerName: managerName,
          notes,
          collaboratorsRaw:       collabRaw,
          validatedByManager,
          ...(externalId           && { externalId }),
          ...(responsiblePartnerId && { responsiblePartnerId }),
          ...(staffIds.length      && { assignedStaff: staffIds }),
        };

        const newHours = toNum(hoursConsumedRaw) || 0;

        // ── Match to existing project ──
        // Try externalId first (stable across renames), then exact name match.
        // Sort by hoursConsumed DESC + updatedAt DESC to pick the most-activity record
        // in case of duplicates (shouldn't happen but defends against bad data).
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
          // Update: accumulate hours (Excel file contains period hours, not running total)
          const totalHours = (Number(existing.hoursConsumed) || 0) + newHours;
          const metrics    = computeMetrics(totalHours, collabRaw, budgetHours, budgetCost, startDate, endDate);

          const updatedProject = await Project.findByIdAndUpdate(
            existing._id,
            {
              $set: { ...basePayload, ...metrics },
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
          // Create: this is the first import for this project
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
        // Row-level error — continue to next row rather than aborting the whole import
        errors.push(`Ligne ${rowNum} : ${(e as Error).message}`);
      }
    }

    logAudit(req, {
      action:      "IMPORT",
      resource:    "project",
      description: `Imported projects from Excel: ${created} created, ${updated} updated`,
      metadata:    { created, updated, total: rows.length, errors: errors.length, warnings: warnings.length },
    });
    res.json({ created, updated, errors, warnings, total: rows.length });
  } catch (err) {
    console.error("importProjects error:", err);
    res.status(500).json({ message: "Échec de l'import : " + (err as Error).message });
  }
};
