// ─── Expert model ─────────────────────────────────────────────────────────────
// "Expert" is the data model for every person in the system:
//   admins, managers, collaborators, and workers.
// Note: the collection is named "users" in MongoDB (historical naming).
//
// Key design points:
//   - email has a sparse unique index: non-worker roles need a unique email,
//     but "worker" accounts don't have logins at all — sparse allows multiple
//     null/missing email values without violating the uniqueness constraint.
//   - password has select:false — it is NEVER returned by default in queries;
//     controllers must explicitly opt in with .select("+password").
//   - The pre-save hook hashes the password with bcrypt (cost factor 12) whenever
//     the password field is modified.
//   - comparePassword() is an instance method used by the login endpoint.
//   - currentLoad and totalHours are recalculated by recalcExpertLoads() from
//     timesheet data — they are cached here for fast dashboard queries.
//   - burnoutFlags.flagged is set automatically when currentLoad > 160 h/month.

import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export type Role  = "admin" | "manager" | "collaborator" | "worker";
export type Level = "Junior" | "Mid" | "Senior" | "Partner";

export interface BurnoutFlags {
  flagged:   boolean;
  reasons:   string[];
  flaggedAt?: Date;
}

export interface IExpert extends Document {
  name:             string;
  email:            string;
  password:         string;
  role:             Role;
  level:            Level;
  academicLevel:    string;
  specializations:  string[];
  coutHoraire:      number;   // hourly cost rate (€/h) — used to compute costConsumed
  currentLoad:      number;   // hours this month (recalculated from timesheets)
  totalHours:       number;   // all-time hours across all projects
  burnoutFlags:     BurnoutFlags;
  // HR fields (optional, filled from HR records)
  cin:              string;   // Carte d'identité nationale (Tunisian ID)
  cnss:             string;   // Caisse Nationale de Sécurité Sociale number
  gender:           string;
  dateOfBirth?:     Date;
  placeOfBirth:     string;
  address:          string;
  civilStatus:      string;
  children:         number;
  hireDate?:        Date;
  contractType:     string;
  contractEndDate?: Date;
  department:       string;
  positionCategory: string;
  expStartDate?:    Date;     // experience start date (for seniority calculation)
  avatarUrl?:       string;   // relative path to profile photo, e.g. "/uploads/avatars/..."
  // Auth — never returned by default (select:false)
  resetPasswordToken?:   string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Instance method for login
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const ExpertSchema = new Schema<IExpert>(
  {
    name: {
      type:     String,
      required: [true, "Name is required"],
      trim:     true,
    },
    email: {
      type:      String,
      unique:    true,
      sparse:    true,      // sparse = unique only among documents that HAVE this field
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type:      String,
      minlength: [8, "Password must be at least 8 characters"],
      select:    false,     // excluded from all queries by default
    },
    role: {
      type:    String,
      enum:    ["admin", "manager", "collaborator", "worker"],
      default: "collaborator",
    },
    level: {
      type:    String,
      enum:    ["Junior", "Mid", "Senior", "Partner"],
      default: "Junior",
    },
    academicLevel:   { type: String, default: "", trim: true },
    specializations: { type: [String], default: [] },
    coutHoraire:     { type: Number, default: 0 },
    currentLoad:     { type: Number, default: 0 }, // updated by recalcExpertLoads()
    totalHours:      { type: Number, default: 0 }, // updated by recalcExpertLoads()
    burnoutFlags: {
      flagged:   { type: Boolean, default: false },
      reasons:   { type: [String], default: [] },
      flaggedAt: { type: Date },
    },
    // ── HR fields ──────────────────────────────────────────────────────────────
    cin:              { type: String, default: "", trim: true },
    cnss:             { type: String, default: "", trim: true },
    gender:           { type: String, default: "", trim: true },
    dateOfBirth:      { type: Date },
    placeOfBirth:     { type: String, default: "", trim: true },
    address:          { type: String, default: "", trim: true },
    civilStatus:      { type: String, default: "", trim: true },
    children:         { type: Number, default: 0 },
    hireDate:         { type: Date },
    contractType:     { type: String, default: "", trim: true },
    contractEndDate:  { type: Date },
    department:       { type: String, default: "", trim: true },
    positionCategory: { type: String, default: "", trim: true },
    expStartDate:     { type: Date },
    avatarUrl:        { type: String, default: "" },
    // ── Auth secrets (never exposed) ──────────────────────────────────────────
    resetPasswordToken:   { type: String, select: false },
    resetPasswordExpires: { type: Date,   select: false },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
// Compound index for "find collaborators by seniority, sorted by load" queries
// (used by the staff assignment panel to suggest least-loaded senior experts).
ExpertSchema.index({ level: 1, currentLoad: -1 });
// Partial index for burnout detection queries — only indexes flagged=true documents
ExpertSchema.index({ "burnoutFlags.flagged": 1 });

// ── Pre-save hook: password hashing ───────────────────────────────────────────
// Runs before every save(). Skips hashing if the password field wasn't changed
// (e.g. updating only the name or avatar). Cost factor 12 = ~200ms per hash,
// which makes brute-force attacks computationally expensive.
ExpertSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// ── Instance method: comparePassword ──────────────────────────────────────────
// Used by the login controller to verify a plain-text password against the hash.
// bcrypt.compare() is timing-safe (resistant to timing attacks).
ExpertSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Collection is named "users" for historical reasons (original design used User model)
export default mongoose.model<IExpert>("Expert", ExpertSchema, "users");
