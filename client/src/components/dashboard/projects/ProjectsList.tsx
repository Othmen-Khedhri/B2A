import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  FolderKanban, Upload, X, FileSpreadsheet,
  CheckCircle2, AlertCircle, AlertTriangle, Search, RefreshCw,
} from "lucide-react";
import api from "../../../services/api";
import { useToast } from "../../../context/ToastContext";

// ─── DB Project shape (from MongoDB) ──────────────────────────────────────────

interface DBProject {
  _id: string;
  name: string;
  clientName: string;
  type: string;
  responsiblePartnerName: string;
  status: string;          // "active" | "completed" | "on-hold" | "cancelled"
  budgetCost: number;
  budgetHours: number;
  hoursConsumed: number;
  costConsumed: number;
  grossMargin: number;
  marginPercent: number;
  paceIndexHours: number;
  segment: string;
  externalId: string;
  notes: string;
  validatedByManager: boolean;
  startDate: string;
  endDate: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_FR: Record<string, string> = {
  active:    "En cours",
  completed: "Terminé",
  "on-hold": "En attente",
  cancelled: "Annulé",
};

function statusFr(s: string) {
  return STATUS_FR[s] ?? s;
}

function fmt(n: number) {
  return n.toLocaleString("fr-TN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const label = statusFr(status);
  const cls =
    status === "active"
      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
      : status === "completed"
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      : status === "cancelled"
      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
      : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

function OverBudgetBadge({ over }: { over: boolean }) {
  return over ? (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">OUI</span>
  ) : (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">NON</span>
  );
}

// ─── Import result type ────────────────────────────────────────────────────────

interface ImportResult {
  created: number;
  updated: number;
  total: number;
  errors: string[];
  warnings: string[];
}

// ─── Import Modal ──────────────────────────────────────────────────────────────

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
      const { data } = await api.post<ImportResult>("/projects/import", fd);
      setResult(data);
      if (data.created + data.updated > 0) {
        toast(`Import réussi — ${data.created} créé(s), ${data.updated} mis à jour.`, "success");
        onDone(); // refresh the table
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Échec de l'import.";
      toast(msg, "error");
    } finally {
      setImporting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#CACAC4] dark:border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#FFD600]/20">
              <FileSpreadsheet className="w-5 h-5 text-[#FFD600]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0D0D0D] dark:text-white">Importer des projets</h2>
              <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3] mt-0.5">Format Excel (.xlsx / .xls) — mise à jour automatique de la base</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9E9EA3] hover:text-[#0D0D0D] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {!result ? (
            <>
              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                  dragging
                    ? "border-[#FFD600] bg-[#FFD600]/5"
                    : "border-[#CACAC4] dark:border-white/[0.10] hover:border-[#FFD600]/60 hover:bg-[#FFD600]/5"
                }`}
              >
                <Upload className={`w-8 h-8 transition-colors ${dragging ? "text-[#FFD600]" : "text-[#9E9EA3]"}`} />
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#0D0D0D] dark:text-white">
                    {file ? file.name : "Glissez votre fichier ici ou cliquez pour parcourir"}
                  </p>
                  <p className="text-xs text-[#9E9EA3] mt-1">.xlsx ou .xls acceptés</p>
                </div>
                {file && (
                  <span className="text-xs font-medium text-[#FFD600] bg-[#FFD600]/10 px-3 py-1 rounded-full">
                    {(file.size / 1024).toFixed(1)} Ko
                  </span>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }}
                />
              </div>

              {/* Column guide */}
              <div className="rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] overflow-hidden">
                <div className="bg-[#F2F2F2] dark:bg-[#1A1A1D] px-4 py-2.5 border-b border-[#CACAC4] dark:border-white/[0.06]">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#6B6B6F] dark:text-[#9E9EA3]">Colonnes attendues</p>
                </div>
                <div className="divide-y divide-[#CACAC4]/40 dark:divide-white/[0.04]">
                  {([
                    ["ID Nouveau Projet",    "Identifiant unique — sert de clé d'upsert",    true],
                    ["Code Sage Proposé",    "Référence Sage (optionnel)",                   false],
                    ["Client",              "Nom du client",                                false],
                    ["Segment",             "Segment d'activité",                           false],
                    ["Type de Mission",     "Audit, Conseil, Fiscal…",                      false],
                    ["Manager Proposé",     "Nom du responsable de projet",                 false],
                    ["Mois Début Prévu",    "ex : 01/2025  ou  Jan-25",                     false],
                    ["Mois Fin Prévu",      "ex : 12/2025  ou  Dec-25",                     false],
                    ["Durée (mois)",        "Informatif uniquement",                        false],
                    ["Budget Estimé (TND)", "Budget en dinars",                             false],
                    ["Heures Estimées",     "Heures budgétisées",                           false],
                    ["Collaborateurs",      "Noms séparés par des virgules",                false],
                    ["Notes",              "Commentaires libres",                          false],
                    ["Statut",             "En cours / Terminé / En attente / Annulé",     false],
                    ["Validé Par Manager", "Oui / Non",                                   false],
                  ] as [string, string, boolean][]).map(([col, desc, req]) => (
                    <div key={col} className="flex items-center px-4 py-2 gap-3">
                      <code className="text-xs font-mono text-[#0D0D0D] dark:text-white shrink-0 w-[185px]">{col}</code>
                      <span className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3] flex-1">{desc}</span>
                      {req && <span className="text-xs font-semibold text-red-500 shrink-0">requis</span>}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Result panel */
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">{result.created}</p>
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium mt-0.5">Créés</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{result.updated}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">Mis à jour</p>
                </div>
                <div className={`rounded-2xl p-4 text-center border ${result.errors.length > 0 ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : "bg-[#F2F2F2] dark:bg-[#1A1A1D] border-[#CACAC4] dark:border-white/[0.06]"}`}>
                  <p className={`text-2xl font-bold ${result.errors.length > 0 ? "text-red-600 dark:text-red-400" : "text-[#0D0D0D] dark:text-white"}`}>{result.errors.length}</p>
                  <p className={`text-xs font-medium mt-0.5 ${result.errors.length > 0 ? "text-red-600 dark:text-red-400" : "text-[#6B6B6F] dark:text-[#9E9EA3]"}`}>Erreurs</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#F2F2F2] dark:bg-[#1A1A1D]">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <p className="text-sm text-[#0D0D0D] dark:text-white">
                  <span className="font-semibold">{result.created + result.updated}</span> projet(s) traité(s) sur{" "}
                  <span className="font-semibold">{result.total}</span> lignes
                </p>
              </div>

              {result.warnings.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <p className="text-xs font-semibold">{result.warnings.length} avertissement(s)</p>
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1">
                    {result.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg">{w}</p>
                    ))}
                  </div>
                </div>
              )}

              {result.errors.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p className="text-xs font-semibold">{result.errors.length} erreur(s)</p>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1">
                    {result.errors.map((e, i) => (
                      <p key={i} className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-lg">{e}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#CACAC4] dark:border-white/[0.06] flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-xl border border-[#CACAC4] dark:border-white/[0.06] text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#F2F2F2] dark:hover:bg-white/[0.04] transition"
          >
            {result ? "Fermer" : "Annuler"}
          </button>
          {!result && (
            <button
              onClick={handleImport}
              disabled={!file || importing}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-[#0D0D0D] dark:bg-white text-white dark:text-[#0D0D0D] hover:opacity-80 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {importing
                ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <Upload className="w-4 h-4" />}
              {importing ? "Import en cours…" : "Importer"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

const TABLE_COLS = [
  "Projet / Code",
  "Client",
  "Type de Mission",
  "Manager",
  "Segment",
  "H Budget",
  "H Consommées",
  "Budget (TND)",
  "Coût Réel (TND)",
  "Marge (TND)",
  "Rentabilité %",
  "Statut",
  "Dépassement",
];

export default function ProjectsList() {
  const navigate  = useNavigate();
  const { toast } = useToast();

  const [projects, setProjects]   = useState<DBProject[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showImport, setShowImport] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<DBProject[]>("/projects");
      setProjects(data);
    } catch {
      toast("Impossible de charger les projets.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.clientName.toLowerCase().includes(q) ||
      p.externalId?.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const uniqueStatuses = Array.from(new Set(projects.map((p) => p.status)));

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#FFD600]/20">
            <FolderKanban className="w-6 h-6 text-[#FFD600]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0D0D0D] dark:text-white">Projets</h1>
            <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">
              {projects.length} projet{projects.length !== 1 ? "s" : ""} en base
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#CACAC4] dark:border-white/[0.06] text-sm text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#F2F2F2] dark:hover:bg-white/[0.04] transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFD600] text-[#0D0D0D] text-sm font-semibold hover:bg-[#e6c200] transition shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Importer Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9EA3]" />
          <input
            type="text"
            placeholder="Rechercher par nom, client, code Sage…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white placeholder:text-[#6B6B6F] dark:placeholder:text-[#9E9EA3] focus:outline-none focus:ring-2 focus:ring-[#FFD600]/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFD600]/50"
        >
          <option value="all">Tous les statuts</option>
          {uniqueStatuses.map((s) => (
            <option key={s} value={s}>{statusFr(s)}</option>
          ))}
        </select>
      </div>

      {/* Summary */}
      <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">
        {filtered.length} projet{filtered.length !== 1 ? "s" : ""} affiché{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-4 border-[#CACAC4] border-t-[#FFD600] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[1200px]">
            <thead>
              <tr className="border-b border-[#CACAC4] dark:border-white/[0.06] bg-[#F2F2F2] dark:bg-[#1A1A1D]">
                {TABLE_COLS.map((col) => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#6B6B6F] dark:text-[#9E9EA3] whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={TABLE_COLS.length} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-[#9E9EA3]">
                      <FolderKanban className="w-10 h-10 opacity-30" />
                      <p className="text-sm font-medium">Aucun projet trouvé</p>
                      <button
                        onClick={() => setShowImport(true)}
                        className="text-sm text-[#FFD600] hover:underline font-medium"
                      >
                        Importer depuis Excel →
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const overBudget = p.paceIndexHours > 1;
                  return (
                    <tr
                      key={p._id}
                      onClick={() => navigate(`/dashboard/projects/${p._id}`)}
                      className="border-b border-[#CACAC4]/50 dark:border-white/[0.04] hover:bg-[#FFD600]/5 cursor-pointer transition-colors last:border-0"
                    >
                      <td className="px-4 py-3 min-w-[180px]">
                        <p className="font-semibold text-[#0D0D0D] dark:text-white truncate max-w-[200px]">{p.name}</p>
                        {p.externalId && (
                          <p className="text-xs font-mono text-[#9E9EA3] mt-0.5">{p.externalId}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#0D0D0D] dark:text-white whitespace-nowrap">{p.clientName || "—"}</td>
                      <td className="px-4 py-3 text-[#6B6B6F] dark:text-[#9E9EA3] whitespace-nowrap">{p.type || "—"}</td>
                      <td className="px-4 py-3 text-[#6B6B6F] dark:text-[#9E9EA3] whitespace-nowrap">{p.responsiblePartnerName || "—"}</td>
                      <td className="px-4 py-3 text-[#6B6B6F] dark:text-[#9E9EA3] whitespace-nowrap">{p.segment || "—"}</td>
                      <td className="px-4 py-3 text-right text-[#0D0D0D] dark:text-white whitespace-nowrap">{fmt(p.budgetHours)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className={p.hoursConsumed > p.budgetHours ? "text-red-600 dark:text-red-400 font-semibold" : "text-[#0D0D0D] dark:text-white"}>
                          {fmt(p.hoursConsumed)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-[#0D0D0D] dark:text-white whitespace-nowrap">{fmt(p.budgetCost)}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className={p.costConsumed > p.budgetCost ? "text-red-600 dark:text-red-400 font-semibold" : "text-[#0D0D0D] dark:text-white"}>
                          {fmt(p.costConsumed)}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${p.grossMargin >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {fmt(p.grossMargin)}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${p.marginPercent >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {p.marginPercent.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={p.status} /></td>
                      <td className="px-4 py-3 whitespace-nowrap"><OverBudgetBadge over={overBudget} /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Import modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); load(); }}
        />
      )}
    </div>
  );
}
