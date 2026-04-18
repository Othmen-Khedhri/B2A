import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export type Role = "admin" | "manager" | "collaborator" | "worker";
export type Level = "Junior" | "Mid" | "Senior" | "Partner";

export interface BurnoutFlags {
  flagged: boolean;
  reasons: string[];
  flaggedAt?: Date;
}

export interface IExpert extends Document {
  name: string;
  email: string;
  password: string;
  role: Role;
  level: Level;
  academicLevel: string;
  specializations: string[];
  coutHoraire: number;
  currentLoad: number;
  totalHours: number;
  burnoutFlags: BurnoutFlags;
  // HR fields
  cin: string;
  cnss: string;
  gender: string;
  dateOfBirth?: Date;
  placeOfBirth: string;
  address: string;
  civilStatus: string;
  children: number;
  hireDate?: Date;
  contractType: string;
  contractEndDate?: Date;
  department: string;
  positionCategory: string;
  expStartDate?: Date;
  avatarUrl?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const ExpertSchema = new Schema<IExpert>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,   // allows multiple documents with no email (workers)
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    password: {
      type: String,
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "manager", "collaborator", "worker"],
      default: "collaborator",
    },
    level: {
      type: String,
      enum: ["Junior", "Mid", "Senior", "Partner"],
      default: "Junior",
    },
    academicLevel: {
      type: String,
      default: "",
      trim: true,
    },
    specializations: {
      type: [String],
      default: [],
    },
    coutHoraire: {
      type: Number,
      default: 0,
    },
    currentLoad: {
      type: Number,
      default: 0,
    },
    totalHours: {
      type: Number,
      default: 0,
    },
    burnoutFlags: {
      flagged: { type: Boolean, default: false },
      reasons: { type: [String], default: [] },
      flaggedAt: { type: Date },
    },
    // HR fields
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
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  {
    timestamps: true,
  }
);

// Indexes from README spec
ExpertSchema.index({ level: 1, currentLoad: -1 });
ExpertSchema.index({ "burnoutFlags.flagged": 1 }); // used in burnout queries

// Hash password before saving
ExpertSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to compare passwords
ExpertSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IExpert>("Expert", ExpertSchema, "users");
