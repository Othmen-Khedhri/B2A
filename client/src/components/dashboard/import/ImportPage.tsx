import { useState, useEffect } from "react";
import { Clock, Trash2 } from "lucide-react";
import api from "../../../services/api";
import { useLanguage } from "../../../context/LanguageContext";

interface HistoryEntry {
  _id: string;
  date: string;
  fileName: string;
  fileType: string;
  recordCount: number;
  errors: string[];
  status: "success" | "partial" | "failed";
  userName: string;
}

interface CleanupResult {
  timesheetsDeleted: number;
  timeEntriesDeleted: number;
  affectationsDeleted: number;
}

const statusStyle: Record<string, string> = {
  success: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  partial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  failed:  "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const fileTypeLabel: Record<string, { label: string; cls: string }> = {
  timesheet:  { label: "Timesheet",     cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  timesheets: { label: "Timesheet",     cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  budget:     { label: "Annual Budget", cls: "bg-[#FFD600]/20 text-amber-700 dark:text-amber-400" },
  billing:    { label: "Billing",       cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  leave:      { label: "Leave",         cls: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400" },
};

const ImportPage = () => {
  const { t } = useLanguage();
  const [history, setHistory]               = useState<HistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [cleaningUp, setCleaningUp]         = useState(false);
  const [cleanupResult, setCleanupResult]   = useState<CleanupResult | null>(null);

  useEffect(() => {
    api.get("/import/history")
      .then((r) => setHistory(r.data))
      .catch(console.error)
      .finally(() => setLoadingHistory(false));
  }, []);

  const handleCleanup = async () => {
    setCleaningUp(true);
    setCleanupResult(null);
    try {
      const { data } = await api.post("/staff/cleanup-orphans");
      setCleanupResult(data);
    } catch (err) {
      console.error("Cleanup failed", err);
    } finally {
      setCleaningUp(false);
    }
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto">

      {/* Data Maintenance */}
      <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm">
        <div className="px-5 py-4 border-b border-[#CACAC4] dark:border-white/[0.06] flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-[#9E9EA3]" />
          <h3 className="text-sm font-semibold text-[#6B6B6F] dark:text-[#9E9EA3]">{t("import.maintenance_title")}</h3>
        </div>
        <div className="px-5 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#0D0D0D] dark:text-white">{t("import.cleanup_title")}</p>
            <p className="text-xs text-[#9E9EA3] mt-0.5">{t("import.cleanup_desc")}</p>
            {cleanupResult && (
              <div className="mt-3 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {cleanupResult.timesheetsDeleted} {t("import.timesheets_removed")}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {cleanupResult.timeEntriesDeleted} {t("import.time_entries_removed")}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  {cleanupResult.affectationsDeleted} {t("import.affectations_removed")}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleCleanup}
            disabled={cleaningUp}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cleaningUp ? (
              <>
                <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                {t("import.cleaning_up")}
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                {t("import.run_cleanup")}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Import History */}
      <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm overflow-x-auto">
        <div className="px-5 py-4 border-b border-[#CACAC4] dark:border-white/[0.06] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#9E9EA3]" />
            <h3 className="text-sm font-semibold text-[#6B6B6F] dark:text-[#9E9EA3]">{t("import.title")}</h3>
          </div>
          {history.length > 0 && (
            <span className="text-xs text-[#9E9EA3]">{history.length} record{history.length !== 1 ? "s" : ""}</span>
          )}
        </div>
        {loadingHistory ? (
          <div className="flex items-center justify-center h-24">
            <div className="w-6 h-6 border-4 border-[#FFD600] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-center text-[#9E9EA3] text-sm py-8">{t("import.no_imports_yet")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[#CACAC4] dark:border-white/[0.06]">
              <tr>
                {[
                  t("import.col_file"),
                  t("import.col_type"),
                  t("import.col_records"),
                  t("import.col_status"),
                  t("import.col_by"),
                  t("import.col_date"),
                ].map((h) => (
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
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${(fileTypeLabel[h.fileType] ?? { cls: "bg-[#F2F2F2] text-[#6B6B6F]" }).cls}`}>
                      {(fileTypeLabel[h.fileType] ?? { label: h.fileType }).label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#6B6B6F] dark:text-[#9E9EA3]">{h.recordCount}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusStyle[h.status]}`}>
                      {h.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#6B6B6F] dark:text-[#9E9EA3]">{h.userName}</td>
                  <td className="px-4 py-3 text-[#6B6B6F] dark:text-[#9E9EA3]">
                    {new Date(h.date).toLocaleDateString("fr-TN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
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
