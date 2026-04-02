import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import Expert from "../models/Expert";
import { AuthRequest } from "../middleware/authMiddleware";
import { Role } from "../models/Expert";

// ─── Token helpers ────────────────────────────────────────────────────────────

const signAccessToken = (id: string, role: Role, email: string) =>
  jwt.sign({ id, role, email }, process.env.JWT_ACCESS_SECRET as string, {
    expiresIn: "8h",
  });

const signRefreshToken = (id: string) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: "7d",
  });

// ─── Email helper ─────────────────────────────────────────────────────────────

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

// ─── Controllers ──────────────────────────────────────────────────────────────

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

  try {
    // Explicitly select password (excluded by default in schema)
    const expert = await Expert.findOne({ email: email.toLowerCase() }).select(
      "+password"
    );

    if (!expert) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const isMatch = await expert.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const accessToken = signAccessToken(
      expert._id.toString(),
      expert.role,
      expert.email
    );
    const refreshToken = signRefreshToken(expert._id.toString());

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
    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET as string
    ) as { id: string };

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
 * GET /api/auth/me  (protected)
 * Returns the currently logged-in user's profile
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
 * Body: { email }
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

    // Always respond with success to prevent email enumeration
    if (!expert) {
      res.status(200).json({
        message:
          "If this email exists in our system, a reset link has been sent.",
      });
      return;
    }

    // Generate a secure random token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    expert.resetPasswordToken = hashedToken;
    expert.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await expert.save({ validateBeforeSave: false });

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${clientUrl}/reset-password/${rawToken}`;

    // In development: always log the link to console (email may not be configured)
    console.log("\n🔑 [DEV] Password reset link for", email);
    console.log("→", resetUrl, "\n");

    // Send email only if credentials are configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await sendResetEmail(expert.email, resetUrl);
      } catch (emailErr) {
        console.error("Email send failed:", emailErr);
        // Don't fail the request — the console link is still available in dev
      }
    }

    res.status(200).json({
      message:
        "If this email exists in our system, a reset link has been sent.",
    });
  } catch (err) {
    console.error("forgotPassword error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /api/auth/reset-password/:token
 * Body: { password }
 */
export const resetPassword = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password || password.length < 8) {
    res
      .status(400)
      .json({ message: "Password must be at least 8 characters" });
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
      res
        .status(400)
        .json({ message: "Reset token is invalid or has expired" });
      return;
    }

    expert.password = password; // pre-save hook will hash it
    expert.resetPasswordToken = undefined;
    expert.resetPasswordExpires = undefined;
    await expert.save();

    res.status(200).json({ message: "Password reset successful. You can now log in." });
  } catch (err) {
    console.error("resetPassword error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
