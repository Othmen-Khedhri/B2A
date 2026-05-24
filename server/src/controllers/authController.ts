// ─── Authentication controller ────────────────────────────────────────────────
// Handles all auth-related HTTP endpoints:
//   POST /api/auth/login            — issue access + refresh tokens
//   POST /api/auth/refresh          — trade a refresh token for a new access token
//   POST /api/auth/logout           — blacklist the refresh token
//   GET  /api/auth/me               — return the current user's profile
//   POST /api/auth/forgot-password  — send password-reset email
//   POST /api/auth/reset-password/:token — apply new password

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

// ─── Token helpers ────────────────────────────────────────────────────────────

// Signs a short-lived access token (8 hours).
// Payload contains id, role, and email so controllers don't need a DB lookup.
const signAccessToken = (id: string, role: Role, email: string) =>
  jwt.sign({ id, role, email }, process.env.JWT_ACCESS_SECRET as string, {
    expiresIn: "8h",
  });

// Signs a long-lived refresh token (7 days).
// Optionally embeds a device fingerprint (fp) — disabled by default because
// mobile clients change IP on 4G/5G handoffs, which would invalidate the token.
const signRefreshToken = (id: string, fingerprint: string) => {
  const payload: Record<string, unknown> = { id };
  if (process.env.ENABLE_DEVICE_FINGERPRINT === "true") {
    payload.fp = fingerprint; // only included when explicitly opted in
  }
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, { expiresIn: "7d" });
};

// Builds a SHA-256 hash of "ip|user-agent".
// Used as a device fingerprint stored inside the refresh token to detect token theft.
const buildFingerprint = (req: Request): string =>
  crypto
    .createHash("sha256")
    .update(`${req.ip ?? ""}|${req.headers["user-agent"] ?? ""}`)
    .digest("hex");

// ─── Email helper ─────────────────────────────────────────────────────────────

// Sends a styled password-reset email via SMTP (configured in .env).
// Falls back gracefully if EMAIL_USER/EMAIL_PASS are not set (dev mode).
const sendResetEmail = async (to: string, resetUrl: string) => {
  const transporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   Number(process.env.EMAIL_PORT) || 587,
    secure: false, // STARTTLS (port 587), not SSL (port 465)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from:    `"B2A Smart-Resource" <${process.env.EMAIL_USER}>`,
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

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Validates credentials, enforces rate limiting, and returns JWT tokens.
export const login = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: "Email and password are required" });
    return;
  }

  // Normalise email: lowercase + no leading/trailing spaces
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // ── Step 1: Rate-limit check ──────────────────────────────────────────────
    // LoginAttempt documents are auto-deleted after 15 minutes (TTL index).
    // If lockedUntil is in the future, the account is still locked.
    const attempt = await LoginAttempt.findOne({ email: normalizedEmail });
    if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
      res.status(429).json({ message: "Too many attempts, try again later" });
      return;
    }

    // ── Step 2: Credential check ──────────────────────────────────────────────
    // Password field is select:false — must explicitly request it
    const expert = await Expert.findOne({ email: normalizedEmail }).select("+password");

    // comparePassword() uses bcrypt.compare; returns false if expert is null
    const isMatch = expert ? await expert.comparePassword(password) : false;

    if (!expert || !isMatch) {
      // Increment the failed-attempt counter using upsert (creates on first failure)
      const updated = await LoginAttempt.findOneAndUpdate(
        { email: normalizedEmail },
        { $inc: { count: 1 }, $set: { updatedAt: new Date() } },
        { upsert: true, returnDocument: "after" }
      );

      // Lock the account once MAX_LOGIN_ATTEMPTS is reached
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

      // Regular failed attempt — log it but don't lock yet
      logAudit(req, {
        action: "LOGIN_FAILED", resource: "auth",
        description: `Failed login attempt for ${normalizedEmail}`,
        metadata: { email: normalizedEmail, attempts: updated.count },
      });
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    // ── Step 3: Role guard ────────────────────────────────────────────────────
    // Only admin accounts can access the dashboard application.
    // Non-admin logins are blocked here regardless of correct credentials.
    if (expert.role !== "admin") {
      logAudit(req, {
        action: "LOGIN_FAILED", resource: "auth",
        resourceId: expert._id.toString(), resourceName: expert.name,
        description: `Non-admin login attempt blocked for ${normalizedEmail} (role: ${expert.role})`,
        metadata: { email: normalizedEmail, role: expert.role },
      });
      res.status(403).json({ message: "Access restricted to administrators only" });
      return;
    }

    // ── Step 4: Success — clear failure record and issue tokens ───────────────
    await LoginAttempt.deleteOne({ email: normalizedEmail }); // reset the rate-limit counter

    const fingerprint  = buildFingerprint(req);
    const accessToken  = signAccessToken(expert._id.toString(), expert.role, expert.email);
    const refreshToken = signRefreshToken(expert._id.toString(), fingerprint);

    logAudit(req, {
      action: "LOGIN", resource: "auth",
      resourceId: expert._id.toString(), resourceName: expert.name,
      description: `${expert.name} (${expert.role}) logged in`,
    });

    // Return tokens + a minimal user object (frontend stores this in sessionStorage)
    res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id:    expert._id,
        name:  expert.name,
        email: expert.email,
        role:  expert.role,
        level: expert.level,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
// Validates a refresh token and returns a new access token.
// Called automatically by the Axios interceptor in api.ts when a 401 is received.
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
    // Prevents reuse of a logout-invalidated token
    const isBlacklisted = await BlacklistedToken.exists({ token });
    if (isBlacklisted) {
      res.status(401).json({ message: "Refresh token has been revoked" });
      return;
    }

    // Verify the token's signature and expiry
    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET as string
    ) as { id: string; fp?: string };

    // ── Device fingerprint check ──────────────────────────────────────────────
    // If the token contains a fingerprint (fp), verify it matches the current request.
    // A mismatch means the token was stolen and is being used from a different device.
    if (decoded.fp) {
      const currentFp = buildFingerprint(req);
      if (decoded.fp !== currentFp) {
        res.status(401).json({ message: "Session invalid — please log in again" });
        return;
      }
    }

    // Verify the user still exists in the DB (covers account-deletion edge case)
    const expert = await Expert.findById(decoded.id);
    if (!expert) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    // Issue a fresh access token (same 8h lifetime)
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

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
// Blacklists the refresh token so it can never be used to issue new access tokens.
// The BlacklistedToken TTL index auto-deletes the record when the token naturally expires.
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  const { refreshToken: token } = req.body;

  if (token) {
    try {
      // Decode (don't verify) to extract the expiry so we can set the TTL correctly
      const decoded = jwt.decode(token) as { exp?: number } | null;
      if (decoded?.exp) {
        const expiresAt = new Date(decoded.exp * 1000); // JWT exp is in seconds
        // Ignore duplicate-key errors — happens if the same token is logged out twice
        await BlacklistedToken.create({ token, expiresAt }).catch(() => {});
      }
    } catch {
      // Malformed token — silently ignore; the logout still succeeds
    }
  }

  logAudit(req, {
    action: "LOGOUT", resource: "auth",
    resourceId: req.user?.id, resourceName: req.user?.email,
    description: `${req.user?.email ?? "unknown"} logged out`,
  });

  res.status(200).json({ message: "Logged out successfully" });
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Returns the currently authenticated user's profile.
// Used by AuthContext.tsx on page refresh to restore the session.
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
      id:           expert._id,
      name:         expert.name,
      email:        expert.email,
      role:         expert.role,
      level:        expert.level,
      currentLoad:  expert.currentLoad,
      burnoutFlags: expert.burnoutFlags,
    });
  } catch (err) {
    console.error("getMe error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
// Generates a one-time reset token, stores its hash in the DB, and emails a link.
// Always returns 200 regardless of whether the email exists (prevents user enumeration).
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
    // select("+resetPasswordToken +resetPasswordExpires") needed because those fields
    // are select:false on the schema (hidden from normal queries for security)
    const expert = await Expert.findOne({ email: email.toLowerCase() }).select(
      "+resetPasswordToken +resetPasswordExpires"
    );

    // Always return 200 even if the user doesn't exist
    if (!expert) {
      res.status(200).json({
        message: "If this email exists in our system, a reset link has been sent.",
      });
      return;
    }

    // Generate a cryptographically random 32-byte token
    const rawToken   = crypto.randomBytes(32).toString("hex");
    // Store the SHA-256 hash in the DB (so the raw token can travel over email safely)
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    expert.resetPasswordToken   = hashedToken;
    expert.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    await expert.save({ validateBeforeSave: false }); // skip full validation; only updating reset fields

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl  = `${clientUrl}/reset-password/${rawToken}`; // raw token goes in the URL

    // Print the link to the console in dev so you don't need a real SMTP server
    console.log("\n🔑 [DEV] Password reset link for", email);
    console.log("→", resetUrl, "\n");

    // Attempt to send the email; log failure but don't expose it to the user
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

// ─── POST /api/auth/reset-password/:token ────────────────────────────────────
// Verifies the reset token (hashed), updates the password, and clears the token.
export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { token }    = req.params;
  const { password } = req.body;

  if (!password || password.length < 8) {
    res.status(400).json({ message: "Password must be at least 8 characters" });
    return;
  }

  try {
    // Hash the raw token from the URL and look it up in the DB
    const hashedToken = crypto
      .createHash("sha256")
      .update(String(token))
      .digest("hex");

    // Find user where token matches AND hasn't expired yet
    const expert = await Expert.findOne({
      resetPasswordToken:   hashedToken,
      resetPasswordExpires: { $gt: new Date() }, // $gt = "greater than now" = not expired
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!expert) {
      res.status(400).json({ message: "Reset token is invalid or has expired" });
      return;
    }

    // Assign the new raw password — the Expert pre-save hook hashes it with bcrypt
    expert.password              = password;
    expert.resetPasswordToken    = undefined; // clear the used token
    expert.resetPasswordExpires  = undefined;
    await expert.save(); // triggers the bcrypt pre-save hook

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
