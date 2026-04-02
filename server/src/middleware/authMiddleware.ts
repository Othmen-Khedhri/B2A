import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import Expert, { Role } from "../models/Expert";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: Role;
    email: string;
  };
}

interface JwtPayload {
  id: string;
  role: Role;
  email: string;
}

// Protect: verify access token
export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Not authorized, no token" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET as string
    ) as JwtPayload;

    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    };

    next();
  } catch {
    res.status(401).json({ message: "Not authorized, token invalid or expired" });
  }
};

// Authorize: restrict to specific roles
export const authorize = (...roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        message: `Role '${req.user?.role}' is not allowed to access this resource`,
      });
      return;
    }
    next();
  };
};
