import mongoose, { Schema } from "mongoose";

export type FileType = "timesheets" | "billing" | "leave" | "timesheet" | "budget";
export type ImportStatus = "success" | "partial" | "failed";

export interface IImportHistory {
  date: Date;
  userId: mongoose.Types.ObjectId;
  userName: string;
  fileName: string;
  fileType: FileType;
  recordCount: number;
  importErrors: string[];
  status: ImportStatus;
}

const ImportHistorySchema = new Schema<IImportHistory>(
  {
    date: { type: Date, default: Date.now },
    userId: { type: Schema.Types.ObjectId, ref: "Expert", required: true },
    userName: { type: String, required: true },
    fileName: { type: String, required: true },
    fileType: {
      type: String,
      enum: ["timesheets", "billing", "leave", "timesheet", "budget"],
      required: true,
    },
    recordCount: { type: Number, default: 0 },
    importErrors: { type: [String], default: [] },
    status: { type: String, enum: ["success", "partial", "failed"], default: "success" },
  },
  { timestamps: false }
);

export default mongoose.model("ImportHistory", ImportHistorySchema, "importHistory");
