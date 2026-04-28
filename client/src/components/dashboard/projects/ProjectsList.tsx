import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  FolderKanban, Upload, X, FileSpreadsheet,
  Search, RefreshCw, Users, Clock, TrendingUp,
  CheckCircle2, AlertCircle, AlertTriangle, ChevronDown,
} from "lucide-react";
import api from "../../../services/api";
import { useToast } from "../../../context/ToastContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BudgetClient {
  _id: string;
  year: number;
  clientName: string;
  primaryCollab: string;
  secondaryCollab: string;
  financialBudget: number;
  internalHours: number;
  clientHours: number;
}

interface PaceSummary {
  clientName: string;
  health: "green" | "yellow" | "red";
  avgPace: number;
  totalConsumed: number;
  ytdClientGain: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("fr-TN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function HealthBadge({ health }: { health: "green" | "yellow" | "red" }) {
  const map = {
    green:  { label: "On Track",  cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
    yellow: { label: "At Risk",   cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
    red:    { label: "Over Budget", cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  };
  const { label, cls } = map[health];
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

// ─── Custom Dropdown ──────────────────────────────────────────────────────────

function Dropdown({ value, options, onChange }: {
  value: number;
  options: { label: string; value: number }[];
  onChange: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white hover:bg-[#F2F2F2] dark:hover:bg-white/[0.04] transition focus:outline-none"
      >
        {selected?.label}
        <ChevronDown className={`w-3.5 h-3.5 text-[#9E9EA3] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 min-w-full z-50 bg-white dark:bg-[#2A2A2E] border border-[#CACAC4] dark:border-white/[0.08] rounded-xl shadow-lg overflow-hidden">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                o.value === value
                  ? "bg-[#FFD600]/10 text-[#0D0D0D] dark:text-white font-semibold"
                  : "text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#F2F2F2] dark:hover:bg-white/[0.04]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Import Budget Modal ──────────────────────────────────────────────────────

interface ImportResult { upserted: number; modified: number; total: number; }

function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile]         = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult]     = useState<ImportResult | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post<ImportResult>("/budget/import", fd);
      setResult(data);
      toast(`Budget imported — ${data.upserted} added, ${data.modified} updated.`, "success");
      onDone();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Import failed.";
      toast(msg, "error");
    } finally {
      setImporting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden">

        <div className="flex items-center justify-between px-6 py-5 border-b border-[#CACAC4] dark:border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#FFD600]/20">
              <FileSpreadsheet className="w-5 h-5 text-[#FFD600]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0D0D0D] dark:text-white">Import Annual Budget</h2>
              <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3] mt-0.5">Upload liste des budgets.xlsx</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#9E9EA3] hover:text-[#0D0D0D] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {!result ? (
            <>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                  dragging ? "border-[#FFD600] bg-[#FFD600]/5" : "border-[#CACAC4] dark:border-white/[0.10] hover:border-[#FFD600]/60 hover:bg-[#FFD600]/5"
                }`}
              >
                <Upload className={`w-8 h-8 transition-colors ${dragging ? "text-[#FFD600]" : "text-[#9E9EA3]"}`} />
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#0D0D0D] dark:text-white">
                    {file ? file.name : "Drop file here or click to browse"}
                  </p>
                  <p className="text-xs text-[#9E9EA3] mt-1">.xlsx accepted</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
              </div>

              <div className="rounded-xl border border-[#CACAC4] dark:border-white/[0.06] overflow-hidden">
                <div className="bg-[#F2F2F2] dark:bg-[#1A1A1D] px-4 py-2 border-b border-[#CACAC4] dark:border-white/[0.06]">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#6B6B6F] dark:text-[#9E9EA3]">Expected columns</p>
                </div>
                {[["Client","Client name"],["Annee","Year"],["Budget","Financial budget"],["Collaborateur","Primary collab"],["CollaborateursSecondaires","Secondary collab"],["Budgethoraireestime","Internal hours/month"],["Budgetenvaleur","Client billed hours/month"]].map(([col, desc]) => (
                  <div key={col} className="flex items-center px-4 py-2 gap-3 border-b last:border-0 border-[#CACAC4]/40 dark:border-white/[0.04]">
                    <code className="text-xs font-mono text-[#0D0D0D] dark:text-white shrink-0 w-[200px]">{col}</code>
                    <span className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">{desc}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">{result.upserted}</p>
                  <p className="text-xs text-green-600 font-medium mt-0.5">Added</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{result.modified}</p>
                  <p className="text-xs text-blue-600 font-medium mt-0.5">Updated</p>
                </div>
                <div className="bg-[#F2F2F2] dark:bg-[#1A1A1D] border border-[#CACAC4] dark:border-white/[0.06] rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#0D0D0D] dark:text-white">{result.total}</p>
                  <p className="text-xs text-[#6B6B6F] font-medium mt-0.5">Total rows</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#F2F2F2] dark:bg-[#1A1A1D]">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <p className="text-sm text-[#0D0D0D] dark:text-white">Budget imported successfully</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#CACAC4] dark:border-white/[0.06] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-[#CACAC4] dark:border-white/[0.06] text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#F2F2F2] dark:hover:bg-white/[0.04] transition">
            {result ? "Close" : "Cancel"}
          </button>
          {!result && (
            <button onClick={handleImport} disabled={!file || importing}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-[#0D0D0D] dark:bg-white text-white dark:text-[#0D0D0D] hover:opacity-80 transition disabled:opacity-40 disabled:cursor-not-allowed">
              {importing ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? "Importing…" : "Import"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();

export default function ProjectsList() {
  const navigate  = useNavigate();
  const { toast } = useToast();

  const [year, setYear]           = useState(CURRENT_YEAR);
  const [clients, setClients]     = useState<BudgetClient[]>([]);
  const [paceMap, setPaceMap]     = useState<Record<string, PaceSummary>>({});
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [showImport, setShowImport] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [budgetRes, paceRes] = await Promise.all([
        api.get<BudgetClient[]>(`/budget/${year}`),
        api.get<{ clients: PaceSummary[] }>(`/pace-index/overview/${year}`),
      ]);
      setClients(budgetRes.data);
      const map: Record<string, PaceSummary> = {};
      for (const c of paceRes.data.clients) {
        map[c.clientName] = c;
      }
      setPaceMap(map);
    } catch {
      toast("Failed to load annual budget.", "error");
    } finally {
      setLoading(false);
    }
  }, [year, toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.clientName.toLowerCase().includes(q) || c.primaryCollab.toLowerCase().includes(q);
  });

  // Summary stats
  const greenCount  = filtered.filter((c) => (paceMap[c.clientName]?.health ?? "green") === "green").length;
  const yellowCount = filtered.filter((c) => (paceMap[c.clientName]?.health ?? "green") === "yellow").length;
  const redCount    = filtered.filter((c) => (paceMap[c.clientName]?.health ?? "green") === "red").length;
  const totalGain   = filtered.reduce((s, c) => s + (paceMap[c.clientName]?.ytdClientGain ?? 0), 0);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#FFD600]/20">
            <FolderKanban className="w-6 h-6 text-[#FFD600]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0D0D0D] dark:text-white">Annual Budget</h1>
            <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">
              {clients.length} active client{clients.length !== 1 ? "s" : ""} — {year}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dropdown
            value={year}
            options={[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => ({ label: String(y), value: y }))}
            onChange={setYear}
          />
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#CACAC4] dark:border-white/[0.06] text-sm text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#F2F2F2] dark:hover:bg-white/[0.04] transition disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFD600] text-[#0D0D0D] text-sm font-semibold hover:bg-[#e6c200] transition shadow-sm">
            <Upload className="w-4 h-4" />
            Import Budget
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] p-4">
          <p className="text-xs text-[#9E9EA3] font-medium uppercase tracking-wide mb-1">On Track</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{greenCount}</p>
        </div>
        <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] p-4">
          <p className="text-xs text-[#9E9EA3] font-medium uppercase tracking-wide mb-1">At Risk</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{yellowCount}</p>
        </div>
        <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] p-4">
          <p className="text-xs text-[#9E9EA3] font-medium uppercase tracking-wide mb-1">Over Budget</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{redCount}</p>
        </div>
        <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] p-4">
          <p className="text-xs text-[#9E9EA3] font-medium uppercase tracking-wide mb-1">YTD Gain (hrs)</p>
          <p className={`text-2xl font-bold ${totalGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {fmt(Math.round(totalGain))}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9EA3]" />
        <input type="text" placeholder="Search client or collab…" value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white placeholder:text-[#9E9EA3] focus:outline-none focus:ring-2 focus:ring-[#FFD600]/50" />
      </div>

      {/* Client grid */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-4 border-[#CACAC4] border-t-[#FFD600] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-[#9E9EA3]">
          <FolderKanban className="w-10 h-10 opacity-30" />
          <p className="text-sm font-medium">No clients found</p>
          <button onClick={() => setShowImport(true)} className="text-sm text-[#FFD600] hover:underline font-medium">
            Import budget from Excel →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const pace = paceMap[c.clientName];
            const health = pace?.health ?? "green";
            const consumed = pace?.totalConsumed ?? 0;
            const gain = pace?.ytdClientGain ?? 0;
            const currentMonth = new Date().getMonth() + 1;
            const expectedSoFar = c.clientHours * currentMonth;
            const consumedPct = expectedSoFar > 0 ? Math.min((consumed / expectedSoFar) * 100, 120) : 0;

            return (
              <div
                key={c._id}
                onClick={() => navigate(`/dashboard/projects/${encodeURIComponent(c.clientName)}?year=${year}`)}
                className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] p-5 cursor-pointer hover:shadow-md hover:border-[#FFD600]/40 transition-all group"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#0D0D0D] dark:text-white truncate group-hover:text-[#FFD600] transition-colors">
                      {c.clientName}
                    </p>
                    <p className="text-xs text-[#9E9EA3] mt-0.5 truncate">{year}</p>
                  </div>
                  <HealthBadge health={health} />
                </div>

                {/* Hours info */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-[#F2F2F2] dark:bg-[#1A1A1D] rounded-xl p-3">
                    <p className="text-xs text-[#9E9EA3] mb-0.5">Internal hrs/mo</p>
                    <p className="font-bold text-[#0D0D0D] dark:text-white">{c.internalHours}h</p>
                  </div>
                  <div className="bg-[#F2F2F2] dark:bg-[#1A1A1D] rounded-xl p-3">
                    <p className="text-xs text-[#9E9EA3] mb-0.5">Client hrs/mo</p>
                    <p className="font-bold text-[#0D0D0D] dark:text-white">{c.clientHours}h</p>
                  </div>
                </div>

                {/* YTD progress bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[#9E9EA3]">YTD consumed vs billed</span>
                    <span className="text-xs font-semibold text-[#0D0D0D] dark:text-white">{consumed.toFixed(1)}h</span>
                  </div>
                  <div className="h-2 bg-[#F2F2F2] dark:bg-[#1A1A1D] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${health === "red" ? "bg-red-500 dark:bg-red-600" : health === "yellow" ? "bg-amber-400 dark:bg-amber-500" : "bg-green-500 dark:bg-green-600"}`}
                      style={{ width: `${Math.min(consumedPct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Collab + gain */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-[#9E9EA3]">
                    <Users className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[120px]">{c.primaryCollab || "—"}</span>
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-semibold ${gain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    <TrendingUp className="w-3.5 h-3.5" />
                    {gain >= 0 ? "+" : ""}{gain.toFixed(1)}h
                  </div>
                </div>

                {/* Budget */}
                <div className="mt-3 pt-3 border-t border-[#CACAC4]/40 dark:border-white/[0.04] flex items-center gap-1.5 text-xs text-[#9E9EA3]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Budget: {fmt(c.financialBudget)} TND</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); load(); }}
        />
      )}

      {/* Suppress unused import warnings */}
      {false && <><AlertCircle /><AlertTriangle /></>}
    </div>
  );
}
