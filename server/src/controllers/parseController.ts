import { Response } from "express";
import * as XLSX from "xlsx";
import archiver from "archiver";
import multer from "multer";
import { AuthRequest } from "../middleware/authMiddleware";

export const upload = multer({ storage: multer.memoryStorage() });

type CellValue = string | number | boolean | null | undefined;

// Port of merge.py: find header row by "client" in first cell, then merge split rows
function processSheet(ws: XLSX.WorkSheet): CellValue[][] {
  const rows = XLSX.utils.sheet_to_json<CellValue[]>(ws, { header: 1, defval: null });

  let headerRow: CellValue[] | null = null;
  let startIndex = 0;

  for (let i = 0; i < rows.length; i++) {
    const first = rows[i][0];
    if (first && typeof first === "string" && first.toLowerCase().includes("client")) {
      headerRow = rows[i];
      startIndex = i + 1;
      break;
    }
  }

  const result: CellValue[][] = [];
  if (headerRow) result.push(headerRow);

  let currentRow: CellValue[] | null = null;

  for (let i = startIndex; i < rows.length; i++) {
    const raw = rows[i];
    const cleaned: CellValue[] = raw.map((cell) => {
      if (cell instanceof Date) return cell.toISOString().slice(0, 10);
      if (typeof cell === "string") return cell.trim();
      return cell;
    });

    if (cleaned[0]) {
      currentRow = [...cleaned];
      result.push(currentRow);
    } else if (currentRow !== null) {
      for (let j = 0; j < cleaned.length; j++) {
        const cell = cleaned[j];
        if (cell !== null && cell !== undefined && cell !== "") {
          if (currentRow[j] !== null && currentRow[j] !== undefined && currentRow[j] !== "") {
            currentRow[j] = String(currentRow[j]) + " | " + String(cell);
          } else {
            currentRow[j] = cell;
          }
        }
      }
    }
  }

  return result;
}

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

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="parsed_timesheets.zip"`
    );

    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.pipe(res);

    for (const sheetName of workbook.SheetNames) {
      const ws = workbook.Sheets[sheetName];
      const mergedRows = processSheet(ws);

      const newWb = XLSX.utils.book_new();
      const newWs = XLSX.utils.aoa_to_sheet(mergedRows);
      XLSX.utils.book_append_sheet(newWb, newWs, sheetName);

      const buffer = XLSX.write(newWb, { type: "buffer", bookType: "xlsx" });
      const safeName = sheetName.replace(/[/\\?%*:|"<>]/g, "-");
      archive.append(buffer, { name: `${safeName}.xlsx` });
    }

    await archive.finalize();
  } catch (err) {
    console.error("parseTimesheetFile error:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Parse failed: " + (err as Error).message });
    }
  }
};

// Returns sheet names without processing — used by frontend to preview
export const previewSheets = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ message: "No file uploaded" });
    return;
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    res.json({ sheets: workbook.SheetNames, count: workbook.SheetNames.length });
  } catch (err) {
    res.status(500).json({ message: "Could not read file" });
  }
};
