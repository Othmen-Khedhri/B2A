import path from "path";
import { spawn, ChildProcess } from "child_process";
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
import estimationRoutes from "./routes/estimationRoutes";
import affectationRoutes from "./routes/affectationRoutes";
import budgetRoutes from "./routes/budgetRoutes";
import timesheetRoutes from "./routes/timesheetRoutes";
import paceIndexRoutes from "./routes/paceIndexRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import parseRoutes from "./routes/parseRoutes";
import { runMonthlyTimesheetReminder } from "./controllers/notificationController";
import { recalcExpertLoads } from "./utils/loadRecalculator";

dotenv.config();

// ─── ML server ────────────────────────────────────────────────────────────────
const mlDir = path.join(process.cwd(), "ml");
const mlServer: ChildProcess = spawn(
  "uvicorn",
  ["main:app", "--port", "8000", "--reload"],
  { cwd: mlDir, stdio: "inherit", shell: true }
);
mlServer.on("error", (err) =>
  console.warn("⚠ ML server failed to start:", err.message)
);
mlServer.on("exit", (code) => {
  if (code !== 0) console.warn(`⚠ ML server exited with code ${code}`);
});
["exit", "SIGINT", "SIGTERM"].forEach((sig) =>
  process.on(sig, () => mlServer.kill())
);

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
app.use("/api/estimations", estimationRoutes);
app.use("/api/affectations", affectationRoutes);
app.use("/api/budget", budgetRoutes);
app.use("/api/timesheets", timesheetRoutes);
app.use("/api/pace-index", paceIndexRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/parse", parseRoutes);

app.get("/api", (_req, res) => {
  res.json({ message: "B2A Smart-Resource API is running" });
});

// ─── Database ─────────────────────────────────────────────────────────────────
mongoose.connection.on("disconnected", () => console.warn("MongoDB disconnected — will retry"));
mongoose.connection.on("reconnected",  () => console.log("MongoDB reconnected"));

mongoose
  .connect(process.env.MONGO_URI as string, {
    serverSelectionTimeoutMS: 10_000,  // fail fast on initial connect
    socketTimeoutMS:          45_000,  // close idle sockets after 45s
    connectTimeoutMS:         10_000,
    maxPoolSize:              10,
    heartbeatFrequencyMS:     10_000,  // probe disconnected servers every 10s
  })
  .then(() => {
    console.log("MongoDB Connected");
    recalcExpertLoads()
      .then(() => console.log("[Startup] Expert loads recalculated from timesheets"))
      .catch((e) => console.error("[Startup] recalcExpertLoads error:", e));
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// ─── Monthly timesheet reminder cron (last day of month at 09:00) ─────────────
const scheduleMonthlyReminder = () => {
  const checkAndRun = () => {
    const now = new Date();
    // Last day of current month
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    if (now.getDate() === lastDay && now.getHours() === 9 && now.getMinutes() === 0) {
      runMonthlyTimesheetReminder();
    }
  };
  // Check every minute
  setInterval(checkAndRun, 60 * 1000);
};
scheduleMonthlyReminder();

// ─── Server ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
