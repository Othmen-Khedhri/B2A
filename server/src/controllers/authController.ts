import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import Expert from "../models/Expert";
import BlacklistedToken from "../models/BlacklistedToken";
import LoginAttempt from "../models/LoginAttempt";
import { AuthRequest } from "../middleware/authMiddleware";
import { Role } from "../models/Expert";
import { logAudit } from "../utils/auditLogger";
import { MAX_LOGIN_ATTEMPTS, LOCK_DURATION_MS } from "../config/constants";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const signAccessToken = (id: string, role: Role, email: string) =>
  jwt.sign({ id, role, email }, process.env.JWT_ACCESS_SECRET as string, {
    expiresIn: "8h",
  });

/** Embeds a device fingerprint (fp) only when ENABLE_DEVICE_FINGERPRINT=true.
 *  Disabled by default for mobile compatibility (4G/5G IP changes). */
const signRefreshToken = (id: string, fingerprint: string) => {
  const payload: Record<string, unknown> = { id };
  if (process.env.ENABLE_DEVICE_FINGERPRINT === "true") {
    payload.fp = fingerprint;
  }
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, { expiresIn: "7d" });
};

/** SHA-256 of "ip|user-agent" — stored as a claim in the refresh JWT. */
const buildFingerprint = (req: Request): string =>
  crypto
    .createHash("sha256")
    .update(`${req.ip ?? ""}|${req.headers["user-agent"] ?? ""}`)
    .digest("hex");

// ─── Email helper ───────────────────────────────────────────────────────────────

const sendResetEmail = async (to: string, resetUrl: string) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"B2A Smart-Resource" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Password Reset Request",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2 style="color: #111;">Reset your password</h2>
        <p>You requested a password reset. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">
          Reset Password
        </a>
        <p style="color:#888;font-size:12px;">If you didn't request this, ignore this email. Your password will not change.</p>
        <p style="color:#888;font-size:12px;">Or copy this link: ${resetUrl}</p>
      </div>
    `,
  });
};

// ─── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // ── Rate-limit check ──────────────────────────────────────────────────────
    const attempt = await LoginAttempt.findOne({ email: normalizedEmail });
    if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
      res.status(429).json({ message: "Too many attempts, try again later" });
      return;
    }

    // ── Credential check ──────────────────────────────────────────────────────
    const expert = await Expert.findOne({ email: normalizedEmail }).select("+password");

    const isMatch = expert ? await expert.comparePassword(password) : false;

    if (!expert || !isMatch) {
      // Record failed attempt — upsert and slide the TTL window forward
      const updated = await LoginAttempt.findOneAndUpdate(
        { email: normalizedEmail },
        { $inc: { count: 1 }, $set: { updatedAt: new Date() } },
        { upsert: true, returnDocument: "after" }
      );
      if (updated.count >= MAX_LOGIN_ATTEMPTS) {
        updated.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
        await updated.save();
        logAudit(req, {
          action: "LOGIN_FAILED", resource: "auth",
          description: `Account locked after ${MAX_LOGIN_ATTEMPTS} failed attempts for ${normalizedEmail}`,
          metadata: { email: normalizedEmail },
        });
        res.status(429).json({ message: "Too many attempts, try again later" });
        return;
      }
      logAudit(req, {
        action: "LOGIN_FAILED", resource: "auth",
        description: `Failed login attempt for ${normalizedEmail}`,
        metadata: { email: normalizedEmail, attempts: updated.count },
      });
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    // ── Success — clear attempt record ────────────────────────────────────────
    await LoginAttempt.deleteOne({ email: normalizedEmail });

    const fingerprint  = buildFingerprint(req);
    const accessToken  = signAccessToken(expert._id.toString(), expert.role, expert.email);
    const refreshToken = signRefreshToken(expert._id.toString(), fingerprint);

    logAudit(req, {
      action: "LOGIN", resource: "auth",
      resourceId: expert._id.toString(), resourceName: expert.name,
      description: `${expert.name} (${expert.role}) logged in`,
    });

    res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id: expert._id,
        name: expert.name,
        email: expert.email,
        role: expert.role,
        level: expert.level,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /api/auth/refresh
 * Body: { refreshToken }
 */
export const refreshToken = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { refreshToken: token } = req.body;

  if (!token) {
    res.status(401).json({ message: "Refresh token required" });
    return;
  }

  try {
    // ── Blacklist check ───────────────────────────────────────────────────────
    const isBlacklisted = await BlacklistedToken.exists({ token });
    if (isBlacklisted) {
      res.status(401).json({ message: "Refresh token has been revoked" });
      return;
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET as string
    ) as { id: string; fp?: string };

    // ── Device fingerprint check ──────────────────────────────────────────────
    if (decoded.fp) {
      const currentFp = buildFingerprint(req);
      if (decoded.fp !== currentFp) {
        res.status(401).json({ message: "Session invalid — please log in again" });
        return;
      }
    }

    const expert = await Expert.findById(decoded.id);
    if (!expert) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    const newAccessToken = signAccessToken(
      expert._id.toString(),
      expert.role,
      expert.email
    );

    res.status(200).json({ accessToken: newAccessToken });
  } catch {
    res.status(401).json({ message: "Invalid or expired refresh token" });
  }
};

/**
 * POST /api/auth/logout  (protected)
 * Body: { refreshToken }
 * Blacklists the refresh token so it can never be used again.
 */
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;

  if (token) {
    try {
      const decoded = jwt.decode(token) as { exp?: number } | null;
      if (decoded?.exp) {
        const expiresAt = new Date(decoded.exp * 1000);
        // Ignore duplicate-key errors (token already blacklisted)
        await BlacklistedToken.create({ token, expiresAt }).catch(() => {});
      }
    } catch {
      // Malformed token — silently ignore, still succeed the logout
    }
  }

  logAudit(req, {
    action: "LOGOUT", resource: "auth",
    resourceId: req.user?.id, resourceName: req.user?.email,
    description: `${req.user?.email ?? "unknown"} logged out`,
  });

  res.status(200).json({ message: "Logged out successfully" });
};

/**
 * GET /api/auth/me  (protected)
 */
export const getMe = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const expert = await Expert.findById(req.user?.id);
    if (!expert) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json({
      id: expert._id,
      name: expert.name,
      email: expert.email,
      role: expert.role,
      level: expert.level,
      currentLoad: expert.currentLoad,
      burnoutFlags: expert.burnoutFlags,
    });
  } catch (err) {
    console.error("getMe error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /api/auth/forgot-password
 */
export const forgotPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ message: "Email is required" });
    return;
  }

  try {
    const expert = await Expert.findOne({ email: email.toLowerCase() }).select(
      "+resetPasswordToken +resetPasswordExpires"
    );

    if (!expert) {
      res.status(200).json({
        message: "If this email exists in our system, a reset link has been sent.",
      });
      return;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    expert.resetPasswordToken = hashedToken;
    expert.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await expert.save({ validateBeforeSave: false });

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl  = `${clientUrl}/reset-password/${rawToken}`;

    console.log("\n🔑 [DEV] Password reset link for", email);
    console.log("→", resetUrl, "\n");

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await sendResetEmail(expert.email, resetUrl);
      } catch (emailErr) {
        console.error("Email send failed:", emailErr);
      }
    }

    logAudit(req, {
      action: "PASSWORD_FORGOT", resource: "auth",
      resourceId: expert._id.toString(), resourceName: expert.name,
      description: `Password reset requested for ${expert.email}`,
    });

    res.status(200).json({
      message: "If this email exists in our system, a reset link has been sent.",
    });
  } catch (err) {
    console.error("forgotPassword error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /api/auth/reset-password/:token
 */
export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password || password.length < 8) {
    res.status(400).json({ message: "Password must be at least 8 characters" });
    return;
  }

  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(String(token))
      .digest("hex");

    const expert = await Expert.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!expert) {
      res.status(400).json({ message: "Reset token is invalid or has expired" });
      return;
    }

    expert.password = password;
    expert.resetPasswordToken = undefined;
    expert.resetPasswordExpires = undefined;
    await expert.save();

    logAudit(req, {
      action: "PASSWORD_RESET", resource: "auth",
      resourceId: expert._id.toString(), resourceName: expert.name,
      description: `Password successfully reset for ${expert.email}`,
    });

    res.status(200).json({ message: "Password reset successful. You can now log in." });
  } catch (err) {
    console.error("resetPassword error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
