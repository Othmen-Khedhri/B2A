import { Response } from "express";
import nodemailer from "nodemailer";
import { AuthRequest } from "../middleware/authMiddleware";
import Expert from "../models/Expert";
import Timesheet from "../models/Timesheet";
import AnnualBudget from "../models/AnnualBudget";

const createTransporter = () =>
  nodemailer.createTransport({
    host:   process.env.EMAIL_HOST || "smtp.gmail.com",
    port:   Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

// ─── Core email sender ────────────────────────────────────────────────────────
export const sendTimesheetReminderEmail = async (year: number, month: number): Promise<{ sent: number; missing: string[] }> => {
  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Find collabs who haven't submitted timesheets
  const [allCollabs, submitted] = await Promise.all([
    Expert.find({ role: { $in: ["collaborator", "worker"] } }).select("_id name email").lean(),
    Timesheet.find({ year, month }).select("collabId").lean(),
  ]);

  const submittedIds = new Set(submitted.map((s) => String(s.collabId)));
  const missing      = allCollabs.filter((c) => !submittedIds.has(String(c._id)));

  if (missing.length === 0) return { sent: 0, missing: [] };

  // Get admin emails
  const admins = await Expert.find({ role: "admin" }).select("email name").lean();
  const adminEmails = admins.map((a) => a.email).filter(Boolean) as string[];

  if (adminEmails.length === 0) return { sent: 0, missing: missing.map((m) => m.name) };

  const missingNames = missing.map((c) => `• ${c.name}`).join("\n");
  const monthName    = MONTH_NAMES[month - 1];

  const transporter = createTransporter();

  await transporter.sendMail({
    from:    `"B2A Platform" <${process.env.EMAIL_USER}>`,
    to:      adminEmails.join(", "),
    subject: `[B2A] Timesheet Reminder — ${monthName} ${year}`,
    text: `Hello,\n\nThis is a reminder that the following collaborators have not yet submitted their timesheets for ${monthName} ${year}:\n\n${missingNames}\n\nPlease ensure all timesheets are uploaded before the end of the month.\n\nB2A Platform`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #FFD600; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0; color: #1a1a1a;">B2A Platform — Timesheet Reminder</h2>
        </div>
        <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
          <p style="color: #333;">Hello,</p>
          <p style="color: #333;">The following collaborators have <strong>not yet submitted</strong> their timesheets for <strong>${monthName} ${year}</strong>:</p>
          <ul style="background: #fff; padding: 16px 24px; border-radius: 6px; border: 1px solid #e0e0e0;">
            ${missing.map((c) => `<li style="color: #333; padding: 4px 0;">${c.name}</li>`).join("")}
          </ul>
          <p style="color: #333; margin-top: 16px;">Please ensure all timesheets are uploaded before the end of the month.</p>
          <p style="color: #888; font-size: 12px; margin-top: 24px;">B2A Platform — Automated Notification</p>
        </div>
      </div>
    `,
  });

  return { sent: adminEmails.length, missing: missing.map((m) => m.name) };
};

// ─── POST /api/notifications/timesheet-reminder ───────────────────────────────
// Manual trigger from frontend
export const triggerTimesheetReminder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { year, month } = req.body;
    if (!year || !month) {
      res.status(400).json({ message: "year and month are required" });
      return;
    }

    const result = await sendTimesheetReminderEmail(Number(year), Number(month));
    res.json({
      message: result.sent > 0
        ? `Reminder sent to ${result.sent} admin(s)`
        : "No missing timesheets or no admin emails found",
      missing: result.missing,
    });
  } catch (err) {
    console.error("triggerTimesheetReminder error:", err);
    res.status(500).json({ message: "Failed to send reminder email" });
  }
};

// ─── POST /api/notifications/pace-alert ──────────────────────────────────────
// Notifies the primary & secondary collab of a client that their project is burning
export const triggerPaceAlert = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { clientName, year, avgPace, ytdConsumed, health } = req.body;
    if (!clientName || !year) {
      res.status(400).json({ message: "clientName and year are required" });
      return;
    }

    const budget = await AnnualBudget.findOne({ year: Number(year), clientName }).lean();
    if (!budget) {
      res.status(404).json({ message: "Client not found in annual budget" });
      return;
    }

    // Collect responsible collab names
    const collabNames = [budget.primaryCollab, budget.secondaryCollab].filter(Boolean);
    if (collabNames.length === 0) {
      res.status(400).json({ message: "No responsible collabs assigned to this client" });
      return;
    }

    // Look up their emails by name — deduplicate in case of stale duplicate documents
    const experts = await Expert.find({ name: { $in: collabNames } }).select("name email").lean();
    console.log("[paceAlert] collabNames:", collabNames);
    console.log("[paceAlert] experts found:", experts.map((e) => ({ name: e.name, email: e.email })));
    const emails  = [...new Set(experts.map((e) => e.email).filter(Boolean))] as string[];
    console.log("[paceAlert] emails to send:", emails);

    if (emails.length === 0) {
      res.status(400).json({ message: "No email addresses found for the responsible collabs" });
      return;
    }

    const healthLabel = health === "red" ? "Over Budget 🔴" : health === "yellow" ? "At Risk 🟡" : "On Track 🟢";
    const paceDisplay = avgPace !== undefined ? `${(Number(avgPace) * 100).toFixed(0)}%` : "N/A";

    const transporter = createTransporter();
    await transporter.sendMail({
      from:    `"B2A Platform" <${process.env.EMAIL_USER}>`,
      to:      emails.join(", "),
      subject: `[B2A] Pace Alert — ${clientName} (${year})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #FFD600; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; color: #1a1a1a;">B2A Platform — Project Pace Alert</h2>
          </div>
          <div style="background: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0;">
            <p style="color: #333;">Hello,</p>
            <p style="color: #333;">This is an alert regarding the project <strong>${clientName}</strong> for <strong>${year}</strong>.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #fff; border-radius: 6px; border: 1px solid #e0e0e0;">
              <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 10px 16px; color: #888; font-size: 13px;">Status</td>
                <td style="padding: 10px 16px; color: #333; font-weight: bold;">${healthLabel}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 10px 16px; color: #888; font-size: 13px;">Average Pace</td>
                <td style="padding: 10px 16px; color: #333; font-weight: bold;">${paceDisplay}</td>
              </tr>
              <tr>
                <td style="padding: 10px 16px; color: #888; font-size: 13px;">YTD Consumed</td>
                <td style="padding: 10px 16px; color: #333; font-weight: bold;">${ytdConsumed ? Number(ytdConsumed).toFixed(1) + "h" : "N/A"}</td>
              </tr>
            </table>
            <p style="color: #333;">Please review the project hours and take corrective action if needed.</p>
            <p style="color: #888; font-size: 12px; margin-top: 24px;">B2A Platform — Automated Notification</p>
          </div>
        </div>
      `,
    });

    res.json({ message: `Pace alert sent to ${emails.join(", ")}`, recipients: emails });
  } catch (err) {
    console.error("triggerPaceAlert error:", err);
    res.status(500).json({ message: "Failed to send pace alert email" });
  }
};

// ─── Cron job function (called by scheduler) ──────────────────────────────────
export const runMonthlyTimesheetReminder = async (): Promise<void> => {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;
  console.log(`[Cron] Running monthly timesheet reminder for ${month}/${year}`);
  try {
    const result = await sendTimesheetReminderEmail(year, month);
    console.log(`[Cron] Reminder sent. Missing: ${result.missing.join(", ") || "none"}`);
  } catch (err) {
    console.error("[Cron] Failed to send timesheet reminder:", err);
  }
};
