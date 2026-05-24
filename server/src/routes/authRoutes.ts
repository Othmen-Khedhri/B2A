// ─── Auth routes ──────────────────────────────────────────────────────────────
// Mounted at: /api/auth
//
//   POST /login                — authenticate with email + password; returns access + refresh tokens
//   POST /refresh              — exchange a valid refresh token for a new access token
//   POST /logout               — blacklist the current refresh token (requires auth)
//   POST /forgot-password      — send a password reset email (rate-limited: 3 req / 15 min / IP)
//   POST /reset-password/:token — complete password reset using the token from the email
//   GET  /me                   — return the currently authenticated user's profile

import { Router, Request, Response, NextFunction } from "express";
import {
  login,
  refreshToken,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
} from "../controllers/authController";
import { protect } from "../middleware/authMiddleware";

// ─── forgotPasswordRateLimit ──────────────────────────────────────────────────
// Simple in-memory rate limiter for the forgot-password endpoint.
// Allows max 3 requests per IP address per 15-minute window.
// We use in-memory state (not Redis) because:
//   a) this is a low-stakes operation (no DB query on every request)
//   b) rate-limiting across restarts isn't needed (15-min windows are short enough)
//   c) keeping it simple avoids an extra dependency
const forgotPasswordAttempts = new Map<string, { count: number; resetAt: number }>();

const forgotPasswordRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  const ip        = String(req.ip ?? "unknown");
  const now       = Date.now();
  const windowMs  = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 3;

  const record = forgotPasswordAttempts.get(ip);

  if (record && now < record.resetAt) {
    // Still within the window — increment count and check limit
    if (record.count >= maxRequests) {
      res.status(429).json({ message: "Too many reset requests, try again later" });
      return;
    }
    record.count++;
  } else {
    // First request or window has expired — start a fresh window
    forgotPasswordAttempts.set(ip, { count: 1, resetAt: now + windowMs });
  }

  next();
};

const router = Router();

router.post("/login",                 login);
router.post("/refresh",               refreshToken);
router.post("/logout",                protect, logout);                               // must be logged in to log out
router.post("/forgot-password",       forgotPasswordRateLimit, forgotPassword);       // rate-limited
router.post("/reset-password/:token", resetPassword);                                 // token from email link
router.get("/me",                     protect, getMe);

export default router;
