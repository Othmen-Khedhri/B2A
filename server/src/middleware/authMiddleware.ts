// ─── Authentication & authorisation middleware ────────────────────────────────
// Two middleware functions:
//  protect   — verifies the JWT access token on every protected route
//  authorize — restricts a route to specific roles (e.g. "admin", "manager")
//
// Usage in a route file:
//   router.delete("/:id", protect, authorize("admin"), deleteUser);
//   ↑ protect runs first (token check), then authorize (role check)

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import Expert, { Role } from "../models/Expert";

// Extend Express's Request type to carry the decoded user after token verification.
// Controllers can access req.user.id, req.user.role, req.user.email safely.
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: Role;
    email: string;
  };
}

// Shape of the JWT payload we signed in authController.signAccessToken
interface JwtPayload {
  id: string;
  role: Role;
  email: string;
}

// ─── protect ─────────────────────────────────────────────────────────────────
// Reads the Authorization header, verifies the JWT, and attaches the decoded
// user to req.user so downstream controllers know who is making the request.
export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  // The header must be present AND follow the "Bearer <token>" format
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Not authorized, no token" });
    return;
  }

  // Extract just the token string (everything after "Bearer ")
  const token = authHeader.split(" ")[1];

  try {
    // jwt.verify throws if:
    //  - the signature doesn't match JWT_ACCESS_SECRET
    //  - the token has expired (exp claim is in the past)
    //  - the token is malformed
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET as string
    ) as JwtPayload;

    // Attach the decoded claims to the request so controllers can use them
    req.user = {
      id:    decoded.id,
      role:  decoded.role,
      email: decoded.email,
    };

    next(); // hand off to the next middleware or controller
  } catch {
    // Any verification failure returns 401 — do not reveal why (expired vs. forged)
    res.status(401).json({ message: "Not authorized, token invalid or expired" });
  }
};

// ─── authorize ───────────────────────────────────────────────────────────────
// Factory that returns a middleware restricting access to the given roles.
// Must be placed AFTER protect (so req.user is already populated).
//
// Example: authorize("admin", "manager") allows admins and managers only.
export const authorize = (...roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // If req.user is missing (protect wasn't run) or the role isn't in the allow-list
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        message: `Role '${req.user?.role}' is not allowed to access this resource`,
      });
      return;
    }
    next();
  };
};
