import path from "path";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import projectRoutes from "./routes/projectRoutes";
import staffRoutes from "./routes/staffRoutes";
import importRoutes from "./routes/importRoutes";
import clientRoutes from "./routes/clientRoutes";
import leaveRoutes  from "./routes/leaveRoutes";
import auditLogRoutes from "./routes/auditLogRoutes";

dotenv.config();

const app = express();
app.set("trust proxy", 1); // trust X-Forwarded-For from nginx / load balancers

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/import", importRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/leaves",      leaveRoutes);
app.use("/api/audit-logs", auditLogRoutes);

app.get("/api", (_req, res) => {
  res.json({ message: "B2A Smart-Resource API is running" });
});

// ─── Database ─────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// ─── Server ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
