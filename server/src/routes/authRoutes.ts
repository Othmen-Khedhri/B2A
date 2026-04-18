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

// ─── In-memory rate limiter for forgot-password ────────────────────────────────
// Max 3 requests per 15 minutes per IP
const forgotPasswordAttempts = new Map<string, { count: number; resetAt: number }>();

const forgotPasswordRateLimit = (req: Request, res: Response, next: NextFunction): void => {
  const ip = String(req.ip ?? "unknown");
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxRequests = 3;

  const record = forgotPasswordAttempts.get(ip);

  if (record && now < record.resetAt) {
    if (record.count >= maxRequests) {
      res.status(429).json({ message: "Too many reset requests, try again later" });
      return;
    }
    record.count++;
  } else {
    forgotPasswordAttempts.set(ip, { count: 1, resetAt: now + windowMs });
  }

  next();
};

const router = Router();

router.post("/login",               login);
router.post("/refresh",             refreshToken);
router.post("/logout",              protect, logout);
router.post("/forgot-password",     forgotPasswordRateLimit, forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/me",                   protect, getMe);

export default router;
