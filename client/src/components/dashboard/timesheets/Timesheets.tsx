import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  FileSpreadsheet, Upload, X, Search, RefreshCw, CheckCircle2,
  AlertCircle, Clock, ChevronDown, ChevronUp, Calendar, Users, Trash2,
} from "lucide-react";
import api from "../../../services/api";
import { useToast } from "../../../context/ToastContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Collab {
  _id: string;
  name: string;
  role: string;
}

interface TimesheetStatus {
  collabId: string;
  collabName: string;
  submitted: boolean;
  uploadedAt: string | null;
}

interface TimesheetEntry {
  clientName: string;
  mission: string;
  prestation: string;
  date: string;
  hours: number;
  detail: string;
}

interface Timesheet {
  _id: string;
  collabId: string;
  collabName: string;
  month: number;
  year: number;
  entries: TimesheetEntry[];
  uploadedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function fmt(n: number, d = 1) {
  return n.toLocaleString("fr-TN", { minimumFractionDigits: d, maximumFractionDigits: d });
}

// ─── Upload Timesheet Modal ───────────────────────────────────────────────────

type UploadResult = { collab: string; periods: { month: number; year: number; entries: number }[] };

function UploadModal({ collabs, onClose, onDone }: { collabs: Collab[]; onClose: () => void; onDone: (periods: { month: number; year: number }[]) => void }) {
  const { toast }      = useToast();
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const [collabId, setCollabId] = useState("");
  const [file, setFile]         = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult]     = useState<UploadResult | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleUpload = async () => {
    if (!file || !collabId) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("collabId", collabId);
      const { data } = await api.post<UploadResult>("/timesheets/upload", fd);
      setResult(data);
      toast(`Timesheet uploaded for ${data.collab}.`, "success");
      onDone(data.periods);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Upload failed.";
      toast(msg, "error");
    } finally {
      setUploading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-6 py-5 border-b border-[#CACAC4] dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#FFD600]/20">
              <FileSpreadsheet className="w-5 h-5 text-[#FFD600]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0D0D0D] dark:text-white">Upload Timesheet</h2>
              <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3] mt-0.5">Select collaborator then upload their timesheet</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#9E9EA3] hover:text-[#0D0D0D] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!result ? (
            <>
              {/* Collab selector */}
              <div>
                <label className="block text-xs font-semibold text-[#6B6B6F] dark:text-[#9E9EA3] uppercase tracking-wide mb-1.5">
                  Collaborator
                </label>
                <select value={collabId} onChange={(e) => setCollabId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#1A1A1D] text-[#0D0D0D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFD600]/50">
                  <option value="">Select a collaborator…</option>
                  {collabs.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                  dragging ? "border-[#FFD600] bg-[#FFD600]/5" : "border-[#CACAC4] dark:border-white/[0.10] hover:border-[#FFD600]/60 hover:bg-[#FFD600]/5"
                }`}
              >
                <Upload className={`w-7 h-7 transition-colors ${dragging ? "text-[#FFD600]" : "text-[#9E9EA3]"}`} />
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#0D0D0D] dark:text-white">
                    {file ? file.name : "Drop timesheet here or click to browse"}
                  </p>
                  <p className="text-xs text-[#9E9EA3] mt-1">.xlsx accepted — modele fiche horaires</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <p className="text-sm text-[#0D0D0D] dark:text-white">
                  Uploaded for <span className="font-semibold">{result.collab}</span>
                </p>
              </div>
              <div className="space-y-2">
                {result.periods.map((p) => (
                  <div key={`${p.year}-${p.month}`} className="flex items-center justify-between px-4 py-3 bg-[#F2F2F2] dark:bg-[#1A1A1D] rounded-xl">
                    <span className="text-sm font-medium text-[#0D0D0D] dark:text-white">{MONTH_NAMES[p.month - 1]} {p.year}</span>
                    <span className="text-xs text-[#9E9EA3]">{p.entries} entries</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#CACAC4] dark:border-white/[0.06] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-[#CACAC4] dark:border-white/[0.06] text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#F2F2F2] dark:hover:bg-white/[0.04] transition">
            {result ? "Close" : "Cancel"}
          </button>
          {!result && (
            <button onClick={handleUpload} disabled={!file || !collabId || uploading}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-[#0D0D0D] dark:bg-white text-white dark:text-[#0D0D0D] hover:opacity-80 transition disabled:opacity-40 disabled:cursor-not-allowed">
              {uploading ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? "Uploading…" : "Upload"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Timesheet Detail Card ─────────────────────────────────────────────────────

function TimesheetCard({ sheet, onDelete }: { sheet: Timesheet; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const totalHours = sheet.entries.reduce((s, e) => s + e.hours, 0);

  const clientMap = new Map<string, number>();
  for (const e of sheet.entries) {
    clientMap.set(e.clientName, (clientMap.get(e.clientName) || 0) + e.hours);
  }

  // Group entries by date for calendar-style display
  const byDate = new Map<string, TimesheetEntry[]>();
  for (const e of sheet.entries) {
    const d = new Date(e.date).toISOString().split("T")[0];
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(e);
  }
  const sortedDates = Array.from(byDate.keys()).sort();

  return (
    <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#FFD600]/5 transition"
        onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-xl bg-[#FFD600]/10 shrink-0">
            <Users className="w-4 h-4 text-[#FFD600]" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[#0D0D0D] dark:text-white text-sm">{sheet.collabName}</p>
            <p className="text-xs text-[#9E9EA3] mt-0.5">
              {MONTH_NAMES[sheet.month - 1]} {sheet.year} · {sheet.entries.length} entries · uploaded {new Date(sheet.uploadedAt).toLocaleDateString("en-GB")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="font-bold text-[#0D0D0D] dark:text-white">{fmt(totalHours)}h</p>
            <p className="text-xs text-[#9E9EA3]">{clientMap.size} clients</p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(sheet._id); }}
            className="p-1.5 rounded-lg text-[#9E9EA3] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
            <Trash2 className="w-4 h-4" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-[#9E9EA3]" /> : <ChevronDown className="w-4 h-4 text-[#9E9EA3]" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#CACAC4] dark:border-white/[0.06]">

          {/* Client distribution */}
          <div className="px-5 py-4 bg-[#F2F2F2] dark:bg-[#1A1A1D] border-b border-[#CACAC4] dark:border-white/[0.06]">
            <p className="text-xs font-bold uppercase tracking-wide text-[#9E9EA3] mb-3">Hours by client</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(clientMap.entries()).map(([client, hrs]) => (
                <div key={client} className="flex items-center gap-2 bg-white dark:bg-[#2A2A2E] rounded-xl px-3 py-1.5 border border-[#CACAC4] dark:border-white/[0.06]">
                  <span className="text-xs font-medium text-[#0D0D0D] dark:text-white truncate max-w-[120px]">{client}</span>
                  <span className="text-xs font-bold text-[#FFD600]">{fmt(hrs)}h</span>
                </div>
              ))}
            </div>
          </div>

          {/* Calendar-style day entries */}
          <div className="divide-y divide-[#CACAC4]/40 dark:divide-white/[0.04]">
            {sortedDates.map((d) => {
              const dayEntries = byDate.get(d)!;
              const dayTotal = dayEntries.reduce((s, e) => s + e.hours, 0);
              return (
                <div key={d} className="px-5 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-3.5 h-3.5 text-[#9E9EA3]" />
                    <span className="text-xs font-semibold text-[#0D0D0D] dark:text-white">
                      {new Date(d).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}
                    </span>
                    <span className="text-xs text-[#9E9EA3] ml-auto">{fmt(dayTotal)}h total</span>
                  </div>
                  <div className="space-y-1.5 pl-5">
                    {dayEntries.map((e, i) => (
                      <div key={i} className="flex items-start gap-3 text-xs">
                        <span className="font-bold text-[#FFD600] shrink-0 w-8">{e.hours}h</span>
                        <span className="text-[#0D0D0D] dark:text-white font-medium shrink-0 max-w-[120px] truncate">{e.clientName}</span>
                        <span className="text-[#9E9EA3] shrink-0">{e.prestation}</span>
                        <span className="text-[#9E9EA3] truncate">{e.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const CURRENT_YEAR  = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

export default function Timesheets() {
  const { toast } = useToast();

  const [year, setYear]   = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [search, setSearch] = useState("");
  const [collabs, setCollabs]       = useState<Collab[]>([]);
  const [sheets, setSheets]         = useState<Timesheet[]>([]);
  const [statusList, setStatusList] = useState<TimesheetStatus[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [tab, setTab]               = useState<"submitted" | "pending">("submitted");

  // Load collabs once — independent of month/year so the selector always works
  useEffect(() => {
    api.get<Collab[]>("/staff")
      .then((r) => setCollabs(r.data.filter((c) => ["collaborator", "worker"].includes(c.role))))
      .catch(() => { /* non-blocking */ });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sheetsRes, statusRes] = await Promise.all([
        api.get<Timesheet[]>(`/timesheets/${year}/${month}`).catch(() => ({ data: [] as Timesheet[] })),
        api.get<{ status: TimesheetStatus[] }>(`/timesheets/status/${year}/${month}`).catch(() => ({ data: { status: [] as TimesheetStatus[] } })),
      ]);
      setSheets(sheetsRes.data);
      setStatusList(statusRes.data.status);
    } catch {
      toast("Failed to load timesheets.", "error");
    } finally {
      setLoading(false);
    }
  }, [year, month, toast]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this timesheet?")) return;
    try {
      await api.delete(`/timesheets/${id}`);
      setSheets((prev) => prev.filter((s) => s._id !== id));
      toast("Timesheet deleted.", "success");
      load();
    } catch {
      toast("Failed to delete.", "error");
    }
  };

  const submitted = statusList.filter((s) => s.submitted);
  const pending   = statusList.filter((s) => !s.submitted);

  const filteredSheets = sheets.filter((s) =>
    !search || s.collabName.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPending = pending.filter((s) =>
    !search || s.collabName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#FFD600]/20">
            <FileSpreadsheet className="w-6 h-6 text-[#FFD600]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0D0D0D] dark:text-white">Timesheets</h1>
            <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">
              {submitted.length}/{statusList.length} submitted for {MONTH_NAMES[month - 1]} {year}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 text-sm rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFD600]/50">
            {[CURRENT_YEAR - 1, CURRENT_YEAR].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-2 text-sm rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFD600]/50">
            {MONTH_NAMES.map((name, i) => <option key={i + 1} value={i + 1}>{name}</option>)}
          </select>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#CACAC4] dark:border-white/[0.06] text-sm text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#F2F2F2] dark:hover:bg-white/[0.04] transition disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFD600] text-[#0D0D0D] text-sm font-semibold hover:bg-[#e6c200] transition shadow-sm">
            <Upload className="w-4 h-4" />
            Upload Timesheet
          </button>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] p-4">
          <p className="text-xs text-[#9E9EA3] font-medium uppercase tracking-wide mb-1">Submitted</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{submitted.length}</p>
        </div>
        <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] p-4">
          <p className="text-xs text-[#9E9EA3] font-medium uppercase tracking-wide mb-1">Pending</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pending.length}</p>
        </div>
        <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] p-4">
          <p className="text-xs text-[#9E9EA3] font-medium uppercase tracking-wide mb-1">Total Hours</p>
          <p className="text-2xl font-bold text-[#0D0D0D] dark:text-white">
            {fmt(sheets.reduce((s, sh) => s + sh.entries.reduce((a, e) => a + e.hours, 0), 0))}h
          </p>
        </div>
      </div>

      {/* Search + tabs */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9EA3]" />
          <input type="text" placeholder="Search collaborator…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white placeholder:text-[#9E9EA3] focus:outline-none focus:ring-2 focus:ring-[#FFD600]/50" />
        </div>
        <div className="flex gap-1 p-1 bg-[#F2F2F2] dark:bg-[#1A1A1D] rounded-xl">
          {(["submitted","pending"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${
                tab === t ? "bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white shadow-sm" : "text-[#9E9EA3] hover:text-[#0D0D0D] dark:hover:text-white"
              }`}>
              {t} {t === "submitted" ? `(${submitted.length})` : `(${pending.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-7 h-7 border-4 border-[#CACAC4] border-t-[#FFD600] rounded-full animate-spin" />
        </div>
      ) : tab === "submitted" ? (
        filteredSheets.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-[#9E9EA3]">
            <Clock className="w-10 h-10 opacity-30" />
            <p className="text-sm font-medium">No timesheets submitted yet</p>
            <button onClick={() => setShowUpload(true)} className="text-sm text-[#FFD600] hover:underline">Upload the first one →</button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSheets.map((sheet) => (
              <TimesheetCard key={sheet._id} sheet={sheet} onDelete={handleDelete} />
            ))}
          </div>
        )
      ) : (
        filteredPending.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-[#9E9EA3]">
            <CheckCircle2 className="w-10 h-10 opacity-30 text-green-500" />
            <p className="text-sm font-medium text-green-600 dark:text-green-400">All timesheets submitted!</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] overflow-hidden">
            <div className="px-5 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {filteredPending.length} collaborator{filteredPending.length !== 1 ? "s" : ""} haven't submitted their timesheet
              </p>
            </div>
            <div className="divide-y divide-[#CACAC4]/40 dark:divide-white/[0.04]">
              {filteredPending.map((s) => (
                <div key={s.collabId} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#F2F2F2] dark:bg-[#1A1A1D] flex items-center justify-center text-xs font-bold text-[#0D0D0D] dark:text-white">
                      {s.collabName.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </div>
                    <span className="text-sm text-[#0D0D0D] dark:text-white">{s.collabName}</span>
                  </div>
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                    Missing
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          collabs={collabs}
          onClose={() => setShowUpload(false)}
          onDone={(periods) => {
            setShowUpload(false);
            if (periods.length > 0) {
              setYear(periods[0].year);
              setMonth(periods[0].month);
            } else {
              load();
            }
          }}
        />
      )}
    </div>
  );
}
