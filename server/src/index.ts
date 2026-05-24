// ─── Entry point for the B2A Smart-Resource Express server ───────────────────
// Responsibilities:
//  1. Spawn the Python ML microservice (FastAPI on port 8000)
//  2. Configure Express middleware (CORS, JSON body parser, static files)
//  3. Mount all API route groups under /api
//  4. Connect to MongoDB Atlas
//  5. Start a cron loop that fires a timesheet reminder on the last day of each month

import path from "path";
import { spawn, ChildProcess } from "child_process";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

// ── Route modules ── each file maps a URL prefix to a set of controller functions
import authRoutes         from "./routes/authRoutes";
import dashboardRoutes    from "./routes/dashboardRoutes";
import projectRoutes      from "./routes/projectRoutes";
import staffRoutes        from "./routes/staffRoutes";
import importRoutes       from "./routes/importRoutes";
import clientRoutes       from "./routes/clientRoutes";
import leaveRoutes        from "./routes/leaveRoutes";
import auditLogRoutes     from "./routes/auditLogRoutes";
import estimationRoutes   from "./routes/estimationRoutes";
import affectationRoutes  from "./routes/affectationRoutes";
import budgetRoutes       from "./routes/budgetRoutes";
import timesheetRoutes    from "./routes/timesheetRoutes";
import paceIndexRoutes    from "./routes/paceIndexRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import parseRoutes        from "./routes/parseRoutes";

// ── Utility imports ──
import { runMonthlyTimesheetReminder } from "./controllers/notificationController";
import { recalcExpertLoads }          from "./utils/loadRecalculator";

// Load .env variables into process.env before anything else
dotenv.config();

// ─── ML microservice (Python FastAPI) ────────────────────────────────────────
// The ML service lives in server/ml/ and runs on port 8000.
// Node spawns it as a child process so users don't have to start it manually.
const mlDir = path.join(process.cwd(), "ml"); // absolute path to the ml/ directory

const mlServer: ChildProcess = spawn(
  "uvicorn",                              // the ASGI server that runs FastAPI
  ["main:app", "--port", "8000", "--reload"], // reload = hot-restart on file change (dev)
  { cwd: mlDir, stdio: "inherit", shell: true } // inherit stdout/stderr so ML logs appear in terminal
);

// Log if the ML service crashes on startup (e.g. Python not installed)
mlServer.on("error", (err) =>
  console.warn("⚠ ML server failed to start:", err.message)
);

// Log abnormal exits (exit code 0 is a normal shutdown, anything else is a crash)
mlServer.on("exit", (code) => {
  if (code !== 0) console.warn(`⚠ ML server exited with code ${code}`);
});

// When Node itself is shutting down, kill the ML child process too
["exit", "SIGINT", "SIGTERM"].forEach((sig) =>
  process.on(sig, () => mlServer.kill())
);

// ─── Express app setup ────────────────────────────────────────────────────────
const app = express();

// Trust the first proxy hop (nginx / load balancer) so req.ip reflects the real client IP
// Required for accurate audit log IP addresses and rate-limit fingerprinting
app.set("trust proxy", 1);

// Allow requests from the frontend dev server (or production URL set in CLIENT_URL)
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true, // allow cookies/auth headers in cross-origin requests
}));

// Parse incoming JSON request bodies (e.g. POST/PUT payloads)
app.use(express.json());

// Serve uploaded avatar images at /uploads/avatars/<filename>
// Vite proxies /uploads → http://localhost:5000 in development
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ─── API routes ───────────────────────────────────────────────────────────────
// Each route module handles one domain of the API.
// The prefix here + the path inside the router = the full URL.
app.use("/api/auth",          authRoutes);          // login, logout, refresh, forgot-password
app.use("/api/dashboard",     dashboardRoutes);     // stats, notifications, budget-stats
app.use("/api/projects",      projectRoutes);       // CRUD + pace + import + repair
app.use("/api/staff",         staffRoutes);         // CRUD + avatar + cleanup-orphans
app.use("/api/import",        importRoutes);        // generic multi-format Excel import
app.use("/api/clients",       clientRoutes);        // CRUD + bulk import
app.use("/api/leaves",        leaveRoutes);         // CRUD for leave records
app.use("/api/audit-logs",    auditLogRoutes);      // paginated log viewer (admin only)
app.use("/api/estimations",   estimationRoutes);    // ML estimation + historical data
app.use("/api/affectations",  affectationRoutes);   // collab-project assignments
app.use("/api/budget",        budgetRoutes);        // annual budget per client
app.use("/api/timesheets",    timesheetRoutes);     // per-collab monthly timesheet upload
app.use("/api/pace-index",    paceIndexRoutes);     // client-level pace analysis
app.use("/api/notifications", notificationRoutes);  // email triggers
app.use("/api/parse",         parseRoutes);         // raw Excel splitter/cleaner

// Health check endpoint — useful for deployment monitoring
app.get("/api", (_req, res) => {
  res.json({ message: "B2A Smart-Resource API is running" });
});

// ─── MongoDB connection ───────────────────────────────────────────────────────
// Log reconnect events so ops can see transient Atlas blips in the server log
mongoose.connection.on("disconnected", () => console.warn("MongoDB disconnected — will retry"));
mongoose.connection.on("reconnected",  () => console.log("MongoDB reconnected"));

mongoose
  .connect(process.env.MONGO_URI as string, {
    serverSelectionTimeoutMS: 10_000,  // abort initial connect after 10s instead of hanging
    socketTimeoutMS:          45_000,  // close idle sockets after 45s to avoid stale connections
    connectTimeoutMS:         10_000,  // TCP handshake timeout
    maxPoolSize:              10,      // keep at most 10 concurrent MongoDB connections open
    heartbeatFrequencyMS:     10_000,  // probe server liveness every 10s
  })
  .then(() => {
    console.log("MongoDB Connected");

    // On every startup, recompute currentLoad and totalHours for all experts from
    // their Timesheet records. This ensures the dashboard data is always consistent
    // even if the server crashed mid-operation last time.
    recalcExpertLoads()
      .then(() => console.log("[Startup] Expert loads recalculated from timesheets"))
      .catch((e) => console.error("[Startup] recalcExpertLoads error:", e));
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// ─── Monthly timesheet reminder cron ─────────────────────────────────────────
// Fires at 09:00 on the last day of each month to email admins a list of
// collaborators who have not yet submitted their timesheet for that month.
const scheduleMonthlyReminder = () => {
  const checkAndRun = () => {
    const now = new Date();

    // Calculate the last day of the current month:
    // new Date(year, month+1, 0) gives day 0 of the next month = last day of this month
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    // Only send the email once: on the last day at exactly 09:00
    if (now.getDate() === lastDay && now.getHours() === 9 && now.getMinutes() === 0) {
      runMonthlyTimesheetReminder();
    }
  };

  // Check every 60 seconds — lightweight; the condition is almost never true
  setInterval(checkAndRun, 60 * 1000);
};
scheduleMonthlyReminder();

// ─── Start HTTP server ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
