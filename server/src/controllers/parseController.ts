// ─── Parse controller ─────────────────────────────────────────────────────────
// Handles the "Parse Timesheets" tool — an Excel pre-processing utility.
// This is NOT about importing timesheet data into the DB. It's a file transformation
// tool that takes a raw timesheet workbook (one sheet per collaborator) and produces
// a cleaned, standardised version that can then be uploaded via /api/timesheets/upload.
//
// The main challenge the parser solves: CRM export spreadsheets sometimes split a
// single logical row across two physical rows (the second row has an empty first cell).
// processSheet() merges those continuation rows back into their parent row, joining
// values with " | " so no data is lost.
//
//   POST /api/parse/timesheet  — parse + clean an Excel file; returns a ZIP of cleaned sheets
//   POST /api/parse/preview    — return the sheet names without processing (for preview UI)

import { Response } from "express";
import * as XLSX from "xlsx";
import archiver from "archiver";
import multer from "multer";
import { AuthRequest } from "../middleware/authMiddleware";

// Multer is configured here (memory storage) and exported so the route file can
// apply it as middleware without importing multer again.
export const upload = multer({ storage: multer.memoryStorage() });

type CellValue = string | number | boolean | null | undefined;

// ─── processSheet ─────────────────────────────────────────────────────────────
// Port of merge.py — cleans and merges a single worksheet.
// Steps:
//   1. Find the header row (the first row whose first cell contains "client")
//   2. For every subsequent row:
//      - If the first cell is non-empty  → it's a new data row; start a new currentRow
//      - If the first cell is empty      → it's a continuation of currentRow; merge it in
//        by appending non-empty cells with " | " to the corresponding column of currentRow
// Returns the cleaned rows as a 2D array ready to be written back to xlsx.
function processSheet(ws: XLSX.WorkSheet): CellValue[][] {
  // Convert to a raw 2D array (header:1) so we can access cells by index
  const rows = XLSX.utils.sheet_to_json<CellValue[]>(ws, { header: 1, defval: null });

  let headerRow: CellValue[] | null = null;
  let startIndex = 0;

  // Find the header row by looking for "client" in the first column
  for (let i = 0; i < rows.length; i++) {
    const first = rows[i][0];
    if (first && typeof first === "string" && first.toLowerCase().includes("client")) {
      headerRow  = rows[i];
      startIndex = i + 1; // data rows start after the header
      break;
    }
  }

  const result: CellValue[][] = [];
  if (headerRow) result.push(headerRow); // include the header in the output

  let currentRow: CellValue[] | null = null;

  for (let i = startIndex; i < rows.length; i++) {
    const raw = rows[i];
    // Normalise each cell: convert Date objects to ISO strings, trim strings
    const cleaned: CellValue[] = raw.map((cell) => {
      if (cell instanceof Date) return cell.toISOString().slice(0, 10); // "YYYY-MM-DD"
      if (typeof cell === "string") return cell.trim();
      return cell;
    });

    if (cleaned[0]) {
      // Non-empty first cell = new row → push a copy of the cleaned array
      currentRow = [...cleaned];
      result.push(currentRow);
    } else if (currentRow !== null) {
      // Empty first cell = continuation row → merge into currentRow
      for (let j = 0; j < cleaned.length; j++) {
        const cell = cleaned[j];
        if (cell !== null && cell !== undefined && cell !== "") {
          if (currentRow[j] !== null && currentRow[j] !== undefined && currentRow[j] !== "") {
            // Both the existing cell and the continuation cell have values — join with " | "
            currentRow[j] = String(currentRow[j]) + " | " + String(cell);
          } else {
            // Existing cell is empty — just fill it in
            currentRow[j] = cell;
          }
        }
      }
    }
  }

  return result;
}

// ─── POST /api/parse/timesheet ────────────────────────────────────────────────
// Reads an uploaded Excel workbook, processes each sheet with processSheet(),
// and returns a ZIP archive containing one cleaned .xlsx file per sheet.
// The frontend can then let the user download the ZIP and re-upload the cleaned files.
//
// Why return a ZIP instead of a single file?
// The source file may contain multiple sheets (one per collaborator). Each cleaned
// sheet is a separate upload-ready file, so the ZIP lets the user unzip and upload
// each file individually via /api/timesheets/upload.
export const parseTimesheetFile = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ message: "No file uploaded" });
    return;
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });

    if (workbook.SheetNames.length === 0) {
      res.status(400).json({ message: "Excel file has no sheets" });
      return;
    }

    // Set response headers for a ZIP file download
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="parsed_timesheets.zip"`
    );

    // Stream the ZIP directly into the HTTP response — no temp file needed
    const archive = archiver("zip", { zlib: { level: 6 } }); // compression level 6 = good balance
    archive.pipe(res);

    for (const sheetName of workbook.SheetNames) {
      const ws         = workbook.Sheets[sheetName];
      const mergedRows = processSheet(ws);

      // Create a new workbook containing just this one cleaned sheet
      const newWb = XLSX.utils.book_new();
      const newWs = XLSX.utils.aoa_to_sheet(mergedRows); // aoa = array of arrays
      XLSX.utils.book_append_sheet(newWb, newWs, sheetName);

      // Write the workbook to a buffer and append it to the archive
      const buffer   = XLSX.write(newWb, { type: "buffer", bookType: "xlsx" });
      // Sanitise the sheet name for use as a filename (remove filesystem-special chars)
      const safeName = sheetName.replace(/[/\\?%*:|"<>]/g, "-");
      archive.append(buffer, { name: `${safeName}.xlsx` });
    }

    // Finalise the archive — this triggers the actual ZIP compression and flushes to res
    await archive.finalize();
  } catch (err) {
    console.error("parseTimesheetFile error:", err);
    // Can't send a JSON error response if headers were already sent (ZIP started streaming)
    if (!res.headersSent) {
      res.status(500).json({ message: "Parse failed: " + (err as Error).message });
    }
  }
};

// ─── POST /api/parse/preview ──────────────────────────────────────────────────
// Returns just the sheet names from an uploaded Excel file without doing any parsing.
// Used by the frontend to let the user confirm which sheets will be processed
// before triggering the full parse.
export const previewSheets = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ message: "No file uploaded" });
    return;
  }

  try {
    // No cellDates needed here — we're only reading sheet names, not cell values
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    res.json({ sheets: workbook.SheetNames, count: workbook.SheetNames.length });
  } catch (err) {
    res.status(500).json({ message: "Could not read file" });
  }
};
