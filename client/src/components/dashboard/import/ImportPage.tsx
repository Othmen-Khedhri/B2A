import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, CheckCircle, XCircle, FileSpreadsheet, Clock } from "lucide-react";
import api from "../../../services/api";

type FileType = "timesheets" | "billing" | "leave" | "budgets";

interface HistoryEntry {
  _id: string;
  date: string;
  fileName: string;
  fileType: FileType;
  recordCount: number;
  errors: string[];
  status: "success" | "partial" | "failed";
  userName: string;
}

const FILE_TYPES: { key: FileType; label: string; description: string }[] = [
  { key: "timesheets", label: "Timesheets", description: "Hours per person per project (Teams export)" },
  { key: "billing", label: "Billing & Costs", description: "Invoice amounts & real costs (Sage export)" },
  { key: "leave", label: "Leave Records", description: "Absence & leave data (Teams/HR export)" },
  { key: "budgets", label: "Project Budgets", description: "Budget hours & costs per project" },
];

const statusStyle: Record<string, string> = {
  success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const ImportPage = () => {
  const [fileType, setFileType] = useState<FileType>("timesheets");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ message: string; recordCount: number; errors: string[]; status: string } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = () => {
    api.get("/import/history")
      .then((r) => setHistory(r.data))
      .catch(console.error)
      .finally(() => setLoadingHistory(false));
  };

  useEffect(() => { fetchHistory(); }, []);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) { setFile(accepted[0]); setResult(null); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  });

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    const form = new FormData();
    form.append("file", file);
    form.append("fileType", fileType);
    try {
      const { data } = await api.post("/import", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
      fetchHistory();
      setFile(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || "Upload failed";
      setResult({ message: msg, recordCount: 0, errors: [], status: "failed" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-14 max-w-5xl mx-auto">
      {/* File type selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {FILE_TYPES.map(({ key, label, description }) => (
          <button
            key={key}
            onClick={() => setFileType(key)}
            className={`p-6 sm:p-8 rounded-lg border text-center transition-all ${
              fileType === key
                ? "border-[#FFD600] bg-[#FFD600]/10 dark:bg-[#FFD600]/10"
                : "border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] hover:border-[#FFD600]"
            }`}
          >
            <FileSpreadsheet
              className={`w-8 h-8 mb-3 mx-auto ${fileType === key ? "text-[#FFD600]" : "text-[#9E9EA3]"}`}
            />
            <p className={`text-base font-semibold ${fileType === key ? "text-[#FFD600] dark:text-[#FFD600]" : "text-[#6B6B6F] dark:text-[#9E9EA3]"}`}>
              {label}
            </p>
            <p className="text-xs text-[#9E9EA3] mt-1 leading-snug">{description}</p>
          </button>
        ))}
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-10 sm:p-16 md:p-20 text-center cursor-pointer transition-all ${
          isDragActive
            ? "border-[#FFD600] bg-[#FFD600]/10 dark:bg-[#FFD600]/10"
            : file
            ? "border-green-400 bg-green-50 dark:bg-green-900/10"
            : "border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] hover:border-[#FFD600]"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className={`w-14 h-14 mx-auto mb-4 ${file ? "text-green-500" : "text-[#9E9EA3] dark:text-[#9E9EA3]"}`} />
        {file ? (
          <>
            <p className="text-lg font-semibold text-green-700 dark:text-green-400">{file.name}</p>
            <p className="text-sm text-[#9E9EA3] mt-1">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-[#6B6B6F] dark:text-[#9E9EA3]">
              {isDragActive ? "Drop your Excel file here" : "Drag & drop an Excel file"}
            </p>
            <p className="text-sm text-[#9E9EA3] mt-2">or click to browse — .xlsx / .xls only</p>
          </>
        )}
      </div>

      {/* Upload button */}
      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full py-4 rounded-lg bg-[#FFD600]/10 text-white text-base font-semibold hover:bg-[#FFD600]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {uploading ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Importing...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            Import File
          </>
        )}
      </button>

      {/* Result */}
      {result && (
        <div className={`rounded-lg p-4 flex items-start gap-3 ${
          result.status === "success"
            ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
            : result.status === "partial"
            ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
            : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
        }`}>
          {result.status === "success" ? (
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold text-[#0D0D0D] dark:text-white">{result.message}</p>
            {result.errors.length > 0 && (
              <ul className="mt-2 space-y-1">
                {result.errors.slice(0, 5).map((e, i) => (
                  <li key={i} className="text-xs text-red-600 dark:text-red-400">• {e}</li>
                ))}
                {result.errors.length > 5 && (
                  <li className="text-xs text-[#9E9EA3]">...and {result.errors.length - 5} more</li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Import history */}
      <div className="bg-white dark:bg-[#2A2A2E] rounded-lg border border-[#CACAC4] dark:border-white/[0.06] shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-[#CACAC4] dark:border-white/[0.06] flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#9E9EA3]" />
          <h3 className="text-sm font-semibold text-[#6B6B6F] dark:text-[#9E9EA3]">Import History</h3>
        </div>
        {loadingHistory ? (
          <div className="flex items-center justify-center h-24">
            <div className="w-6 h-6 border-4 border-[#FFD600] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-center text-[#9E9EA3] text-sm py-8">No imports yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[#CACAC4] dark:border-white/[0.06]">
              <tr>
                {["File", "Type", "Records", "Status", "Imported By", "Date"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6B6B6F] dark:text-[#9E9EA3] uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h._id} className="border-b border-[#CACAC4] dark:border-white/[0.06] last:border-0">
                  <td className="px-4 py-3 text-[#0D0D0D] dark:text-white font-medium max-w-[150px] truncate">{h.fileName}</td>
                  <td className="px-4 py-3 text-[#6B6B6F] dark:text-[#9E9EA3] capitalize">{h.fileType}</td>
                  <td className="px-4 py-3 text-[#6B6B6F] dark:text-[#9E9EA3]">{h.recordCount}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusStyle[h.status]}`}>
                      {h.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#6B6B6F] dark:text-[#9E9EA3]">{h.userName}</td>
                  <td className="px-4 py-3 text-[#6B6B6F] dark:text-[#9E9EA3]">
                    {new Date(h.date).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ImportPage;
