import { Router } from "express";
import {
  login,
  refreshToken,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
} from "../controllers/authController";
import { protect } from "../middleware/authMiddleware";

const router = Router();

router.post("/login",               login);
router.post("/refresh",             refreshToken);
router.post("/logout",              protect, logout);
router.post("/forgot-password",     forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/me",                   protect, getMe);

export default router;
