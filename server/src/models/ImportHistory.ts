// ─── ImportHistory model ──────────────────────────────────────────────────────
// Tracks every file import operation in the system — acts as an audit trail
// specifically for bulk data uploads.
//
// Created by:
//   - importController.ts (timesheets, billing, leave)
//   - budgetController.ts (annual budget Excel)
//   - timesheetController.ts (monthly timesheet upload)
//
// Status meanings:
//   success  — all rows processed without errors
//   partial  — some rows succeeded, some failed (errors array is non-empty)
//   failed   — no rows were imported (all rows had errors)
//
// The importId is also stored on TimeEntry and Leave documents so that
// re-running the same import can identify and update previously imported rows
// instead of creating duplicates.

import mongoose, { Schema } from "mongoose";

export type FileType     = "timesheets" | "billing" | "leave" | "timesheet" | "budget";
export type ImportStatus = "success" | "partial" | "failed";

export interface IImportHistory {
  date:         Date;
  userId:       mongoose.Types.ObjectId; // who triggered the import
  userName:     string;                  // email of the user
  fileName:     string;                  // original filename from the upload
  fileType:     FileType;
  recordCount:  number;                  // rows successfully imported
  importErrors: string[];                // per-row error messages
  status:       ImportStatus;
}

const ImportHistorySchema = new Schema<IImportHistory>(
  {
    date:         { type: Date,   default: Date.now },
    userId:       { type: Schema.Types.ObjectId, ref: "Expert", required: true },
    userName:     { type: String, required: true },
    fileName:     { type: String, required: true },
    fileType:     {
      type:     String,
      enum:     ["timesheets", "billing", "leave", "timesheet", "budget"],
      required: true,
    },
    recordCount:  { type: Number,   default: 0 },
    importErrors: { type: [String], default: [] },
    status:       { type: String, enum: ["success", "partial", "failed"], default: "success" },
  },
  { timestamps: false } // we manage the date field manually via default:Date.now
);

export default mongoose.model("ImportHistory", ImportHistorySchema, "importHistory");
