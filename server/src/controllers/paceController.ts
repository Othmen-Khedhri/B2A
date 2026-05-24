// ─── Pace controller ──────────────────────────────────────────────────────────
// Per-project pace monitoring and email alert system.
// This is different from paceIndexController.ts which handles annual client budgets.
// This controller focuses on individual Project documents and their burn rate.
//
//   GET  /api/projects/pace         — compute pace for all active projects
//   POST /api/projects/pace/notify  — send pace alert emails to responsible managers
//
// Core metric: paceRatio = (% of hours used) / (% of contract time elapsed)
//   paceRatio ≤ 1.00 → "On Track"
//   paceRatio ≤ 1.25 → "At Risk"
//   paceRatio >  1.25 → "Burning"

import { Request, Response } from "express";
import nodemailer from "nodemailer";
import Project from "../models/Project";
import Expert from "../models/Expert";
import { logAudit } from "../utils/auditLogger";

// ─── Types ─────────────────────────────────────────────────────────────────────

export type PaceLabel = "On Track" | "At Risk" | "Burning";

export interface PaceEntry {
  _id:                    string;
  name:                   string;
  clientName:             string;
  responsiblePartnerName: string;
  budgetHours:            number;
  hoursConsumed:          number;
  startDate:              string;
  endDate:                string;
  status:                 string;
  // Computed fields:
  hoursProgress:          number;  // % of budget hours consumed (e.g. 72.5 = 72.5%)
  timeProgress:           number;  // % of contract duration elapsed
  paceRatio:              number;  // hoursProgress / timeProgress (1.0 = perfectly on pace)
  paceLabel:              PaceLabel;
  estimatedFinishDate:    string | null; // ISO date string of when hours will run out
  daysToDeadline:         number;  // days until contract end (negative = already past)
  estimatedOverrunDays:   number;  // days the estimated finish exceeds the contract end
  managerEmail?:          string;
}

// ─── computePace ─────────────────────────────────────────────────────────────
// Pure calculation function — no DB access. Takes raw project values and returns
// all derived pace metrics.
//
// 5% minimum timeProgress guard: prevents absurd paceRatio values on the first day
// of a project (e.g. logging 10h on day 1 of a 200h / 200-day project would show
// hoursProgress=5%, timeProgress=0.5%, paceRatio=10× without the guard).
function computePace(p: {
  budgetHours:   number;
  hoursConsumed: number;
  startDate:     Date;
  endDate:       Date;
}) {
  const now = Date.now();
  const MS  = 1000 * 60 * 60 * 24; // milliseconds per day

  const contractDays = Math.max((p.endDate.getTime() - p.startDate.getTime()) / MS, 1);
  const elapsedDays  = Math.max((p.startDate.getTime() > now ? 0 : (now - p.startDate.getTime()) / MS), 0.01);

  const hoursProgress = p.budgetHours > 0 ? (p.hoursConsumed / p.budgetHours) * 100 : 0;
  const timeProgress  = Math.min((elapsedDays / contractDays) * 100, 100); // capped at 100%
  // 5% floor on timeProgress to avoid paceRatio blowup on brand-new projects
  const paceRatio     = hoursProgress / Math.max(timeProgress, 5);

  let paceLabel: PaceLabel;
  if (paceRatio <= 1.0)       paceLabel = "On Track";
  else if (paceRatio <= 1.25) paceLabel = "At Risk";
  else                        paceLabel = "Burning";

  // Estimate when the budget hours will run out based on the current daily burn rate
  const dailyBurn      = p.hoursConsumed / elapsedDays;
  const hoursRemaining = Math.max(p.budgetHours - p.hoursConsumed, 0);

  let estimatedFinishDate: Date | null = null;
  let estimatedOverrunDays = 0;

  if (dailyBurn > 0 && hoursRemaining > 0) {
    // Project how many days until hours run out at the current burn rate
    const daysToFinish   = hoursRemaining / dailyBurn;
    estimatedFinishDate  = new Date(now + daysToFinish * MS);
    estimatedOverrunDays = Math.max(
      (estimatedFinishDate.getTime() - p.endDate.getTime()) / MS, 0
    );
  } else if (p.hoursConsumed >= p.budgetHours && p.budgetHours > 0) {
    // Already over budget — finish date is now, overrun = today - deadline
    estimatedFinishDate  = new Date(now);
    estimatedOverrunDays = Math.max((now - p.endDate.getTime()) / MS, 0);
  }

  const daysToDeadline = (p.endDate.getTime() - now) / MS;

  return { hoursProgress, timeProgress, paceRatio, paceLabel, estimatedFinishDate, daysToDeadline, estimatedOverrunDays };
}

// ─── GET /api/projects/pace ───────────────────────────────────────────────────
// Returns pace metrics for all active projects that have already started.
// Projects with a future startDate are excluded (no elapsed time → no meaningful pace).
// Also resolves the responsible manager's email for the "notify" button on each row.
export const getPaceReport = async (_req: Request, res: Response): Promise<void> => {
  try {
    const projects = await Project.find({ status: "active" }).sort({ startDate: 1 });

    // Batch-resolve manager emails in one query rather than N individual lookups
    const partnerIds = projects
      .map((p) => p.responsiblePartnerId)
      .filter((id): id is NonNullable<typeof id> => id != null);
    const managers  = await Expert.find({ _id: { $in: partnerIds } }).select("_id email");
    const emailMap  = new Map<string, string>();
    managers.forEach((m) => emailMap.set(m._id.toString(), m.email));

    const now = Date.now();
    const report: PaceEntry[] = projects
      .filter((p) => p.startDate.getTime() <= now) // skip projects not yet started
      .map((p) => {
        const pace = computePace({
          budgetHours:   p.budgetHours,
          hoursConsumed: p.hoursConsumed,
          startDate:     p.startDate,
          endDate:       p.endDate,
        });

        return {
          _id:                    (p._id as { toString(): string }).toString(),
          name:                   p.name,
          clientName:             p.clientName,
          responsiblePartnerName: p.responsiblePartnerName,
          budgetHours:            p.budgetHours,
          hoursConsumed:          p.hoursConsumed,
          startDate:              p.startDate.toISOString(),
          endDate:                p.endDate.toISOString(),
          status:                 p.status,
          managerEmail:           p.responsiblePartnerId
                                    ? emailMap.get(p.responsiblePartnerId.toString())
                                    : undefined,
          ...pace,
          estimatedFinishDate: pace.estimatedFinishDate?.toISOString() ?? null,
        };
      });

    res.json(report);
  } catch (err) {
    console.error("getPaceReport error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST /api/projects/pace/notify ──────────────────────────────────────────
// Sends pace alert emails to the responsible managers of "At Risk" or "Burning" projects.
// Body: { projectIds?: string[] } — if omitted, checks ALL active projects.
// Only sends emails for projects that are NOT "On Track".
// In development (no EMAIL_USER/PASS), logs the email content to console instead.
//
// The email template is a branded HTML email with:
//   - Pace status badge (red = Burning, amber = At Risk)
//   - Hours consumed vs budget
//   - Time progress %
//   - Estimated finish date vs contract deadline
//   - Overrun warning (if estimated finish is after deadline)
export const sendPaceAlerts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectIds } = req.body as { projectIds?: string[] };

    const filter: Record<string, unknown> = { status: "active" };
    if (projectIds?.length) filter._id = { $in: projectIds };

    const projects = await Project.find(filter);

    // Batch-resolve manager emails
    const partnerIds = projects
      .map((p) => p.responsiblePartnerId)
      .filter((id): id is NonNullable<typeof id> => id != null);
    const managers  = await Expert.find({ _id: { $in: partnerIds } }).select("_id email name");
    const managerMap = new Map<string, string>();
    managers.forEach((m) => managerMap.set(m._id.toString(), m.email));

    const transporter = nodemailer.createTransport({
      host:   process.env.EMAIL_HOST || "smtp.gmail.com",
      port:   Number(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    const results: { project: string; recipients: string[]; paceLabel: string }[] = [];

    for (const project of projects) {
      const pace = computePace({
        budgetHours:   project.budgetHours,
        hoursConsumed: project.hoursConsumed,
        startDate:     project.startDate,
        endDate:       project.endDate,
      });

      // Skip "On Track" projects — no alert needed
      if (pace.paceLabel === "On Track") continue;

      // Collect the project manager's email as the recipient
      const recipientSet = new Set<string>();
      if (project.responsiblePartnerId) {
        const mEmail = managerMap.get(project.responsiblePartnerId.toString());
        if (mEmail) recipientSet.add(mEmail);
      }

      const recipients = [...recipientSet].filter(Boolean);
      if (!recipients.length) continue; // no email on record for this manager

      // Format helper for French-style date display
      const fmtDate = (d: Date) =>
        d.toLocaleDateString("fr-TN", { day: "2-digit", month: "long", year: "numeric" });

      const deadline   = fmtDate(project.endDate);
      const finishDate = pace.estimatedFinishDate ? fmtDate(pace.estimatedFinishDate) : "Indéterminée";
      const badgeColor = pace.paceLabel === "Burning" ? "#ef4444" : "#f59e0b";
      const badgeText  = pace.paceLabel === "Burning" ? "Dépassement critique" : "Risque de dépassement";

      // Only show overrun warning if the estimated finish is after the deadline
      const overrunNote = pace.estimatedOverrunDays > 0
        ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin-bottom:24px;">
             <p style="color:#dc2626;font-size:14px;font-weight:600;margin:0;">
               ⚠️ Au rythme actuel, ce projet dépassera son échéance de <strong>${Math.round(pace.estimatedOverrunDays)} jour(s)</strong>.
             </p>
           </div>`
        : "";

      // Branded HTML email template with B2A dark header and yellow logo
      const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#0D0D0D;padding:24px 32px;display:flex;align-items:center;gap:12px;">
    <div style="background:#FFD600;width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;color:#0D0D0D;flex-shrink:0;">B</div>
    <div>
      <p style="color:#fff;font-size:16px;font-weight:700;margin:0;">B2A Platform</p>
      <p style="color:#6b6b6f;font-size:12px;margin:2px 0 0;">Alerte de rythme projet</p>
    </div>
  </div>
  <div style="padding:32px;">
    <span style="display:inline-block;background:${badgeColor}22;color:${badgeColor};font-size:12px;font-weight:700;padding:6px 14px;border-radius:100px;margin-bottom:20px;">${badgeText}</span>
    <h2 style="color:#0D0D0D;font-size:22px;font-weight:800;margin:0 0 6px;">${project.name}</h2>
    <p style="color:#6b6b6f;font-size:14px;margin:0 0 28px;">
      Client : <strong style="color:#0D0D0D;">${project.clientName}</strong> &nbsp;·&nbsp;
      Responsable : <strong style="color:#0D0D0D;">${project.responsiblePartnerName || "—"}</strong>
    </p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:28px;">
      <div style="background:#f4f4f5;border-radius:12px;padding:16px;">
        <p style="color:#6b6b6f;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">Heures consommées</p>
        <p style="color:#0D0D0D;font-size:20px;font-weight:800;margin:0;">${project.hoursConsumed}h <span style="font-size:13px;color:#6b6b6f;">/ ${project.budgetHours}h</span></p>
        <p style="color:${badgeColor};font-size:13px;font-weight:600;margin:4px 0 0;">${pace.hoursProgress.toFixed(1)}% du budget</p>
      </div>
      <div style="background:#f4f4f5;border-radius:12px;padding:16px;">
        <p style="color:#6b6b6f;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">Avancement temporel</p>
        <p style="color:#0D0D0D;font-size:20px;font-weight:800;margin:0;">${pace.timeProgress.toFixed(1)}%</p>
        <p style="color:#6b6b6f;font-size:13px;margin:4px 0 0;">du contrat écoulé</p>
      </div>
      <div style="background:#f4f4f5;border-radius:12px;padding:16px;">
        <p style="color:#6b6b6f;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">Fin estimée</p>
        <p style="color:#0D0D0D;font-size:16px;font-weight:700;margin:0;">${finishDate}</p>
      </div>
      <div style="background:#f4f4f5;border-radius:12px;padding:16px;">
        <p style="color:#6b6b6f;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">Échéance contrat</p>
        <p style="color:#0D0D0D;font-size:16px;font-weight:700;margin:0;">${deadline}</p>
        <p style="color:#6b6b6f;font-size:12px;margin:4px 0 0;">${pace.daysToDeadline < 0 ? `En retard de ${Math.abs(Math.round(pace.daysToDeadline))} j` : `Dans ${Math.round(pace.daysToDeadline)} j`}</p>
      </div>
    </div>
    ${overrunNote}
    <p style="color:#6b6b6f;font-size:13px;margin:0;">Alerte générée automatiquement par B2A Platform. Prenez les mesures nécessaires pour corriger le rythme.</p>
  </div>
  <div style="background:#f4f4f5;padding:16px 32px;text-align:center;">
    <p style="color:#9e9ea3;font-size:11px;margin:0;">© B2A Platform ${new Date().getFullYear()}</p>
  </div>
</div>
</body></html>`;

      const subject = `[B2A] Alerte rythme — ${project.name} (${badgeText})`;

      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        // Production: actually send the email
        await transporter.sendMail({
          from: `"B2A Platform" <${process.env.EMAIL_USER}>`,
          to:   recipients.join(", "),
          subject,
          html,
        });
      } else {
        // Development fallback: log to console instead of sending
        console.log(`[PACE ALERT - DEV] ${subject} → ${recipients.join(", ")}`);
      }

      results.push({ project: project.name, recipients, paceLabel: pace.paceLabel });
    }

    // Log the email batch to the audit trail for traceability
    if (results.length > 0) {
      logAudit(req, {
        action:      "EMAIL_SENT",
        resource:    "paceAlert",
        description: `Sent pace alerts for ${results.length} project(s)`,
        metadata:    { results },
      });
    }
    res.json({ sentCount: results.length, results });
  } catch (err) {
    console.error("sendPaceAlerts error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
