import { useEffect, useState, useCallback } from "react";
import {
  AlertTriangle, Flame, CheckCircle2, Clock, Mail, RefreshCw,
  TrendingUp, TrendingDown, Minus, CalendarClock, Send,
} from "lucide-react";
import api from "../../../services/api";
import { useToast } from "../../../context/ToastContext";

// ─── Types ─────────────────────────────────────────────────────────────────────

type PaceLabel = "On Track" | "At Risk" | "Burning";

interface PaceEntry {
  _id: string;
  name: string;
  clientName: string;
  responsiblePartnerName: string;
  budgetHours: number;
  hoursConsumed: number;
  startDate: string;
  endDate: string;
  status: string;
  hoursProgress: number;
  timeProgress: number;
  paceRatio: number;
  paceLabel: PaceLabel;
  estimatedFinishDate: string | null;
  daysToDeadline: number;
  estimatedOverrunDays: number;
  managerEmail?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const PACE_CONFIG: Record<PaceLabel, {
  bg: string; text: string; border: string;
  icon: React.ReactNode; label: string;
}> = {
  "On Track": {
    bg: "bg-green-50 dark:bg-green-900/20",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    label: "On Track",
  },
  "At Risk": {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    label: "At Risk",
  },
  "Burning": {
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    icon: <Flame className="w-3.5 h-3.5" />,
    label: "Burning",
  },
};

function PaceBadge({ label }: { label: PaceLabel }) {
  const cfg = PACE_CONFIG[label];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-1.5 bg-[#CACAC4]/30 dark:bg-white/[0.06] rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-TN", { day: "2-digit", month: "short", year: "numeric" });
}

function PaceArrow({ ratio }: { ratio: number }) {
  if (ratio <= 1.0)  return <TrendingDown className="w-4 h-4 text-green-500" />;
  if (ratio <= 1.25) return <Minus className="w-4 h-4 text-amber-500" />;
  return <TrendingUp className="w-4 h-4 text-red-500" />;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function ProjectPace() {
  const { toast } = useToast();
  const [data, setData]           = useState<PaceEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState<Set<string>>(new Set());
  const [sendingAll, setSendingAll] = useState(false);
  const [filter, setFilter]       = useState<"all" | PaceLabel>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: report } = await api.get<PaceEntry[]>("/projects/pace");
      // Sort: Burning first, then At Risk, then On Track
      const order: Record<PaceLabel, number> = { Burning: 0, "At Risk": 1, "On Track": 2 };
      report.sort((a, b) => order[a.paceLabel] - order[b.paceLabel]);
      setData(report);
    } catch {
      toast("Impossible de charger le rapport de rythme.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const notify = async (ids: string[], label: string) => {
    const isAll = ids.length > 1;
    if (isAll) setSendingAll(true);
    else setSending((s) => new Set(s).add(ids[0]));

    try {
      const { data: result } = await api.post<{ sentCount: number }>("/projects/pace/notify", { projectIds: ids });
      toast(
        result.sentCount > 0
          ? `${result.sentCount} alerte(s) envoyée(s) pour ${label}.`
          : `Aucune alerte à envoyer — tous les projets sont On Track.`,
        result.sentCount > 0 ? "success" : "info"
      );
    } catch {
      toast("Échec de l'envoi des alertes.", "error");
    } finally {
      if (isAll) setSendingAll(false);
      else setSending((s) => { const n = new Set(s); n.delete(ids[0]); return n; });
    }
  };

  // ── Derived stats ──────────────────────────────────────────────────────────

  const total    = data.length;
  const atRisk   = data.filter((d) => d.paceLabel === "At Risk").length;
  const burning  = data.filter((d) => d.paceLabel === "Burning").length;
  const onTrack  = data.filter((d) => d.paceLabel === "On Track").length;

  const filtered = filter === "all" ? data : data.filter((d) => d.paceLabel === filter);
  const atRiskIds = data.filter((d) => d.paceLabel !== "On Track").map((d) => d._id);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0D0D0D] dark:text-white">Suivi du Rythme Projets</h1>
          <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3] mt-0.5">
            Projets actifs · Consommation des heures vs avancement contractuel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#CACAC4] dark:border-white/[0.06] text-sm text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#E2E2DC] dark:hover:bg-white/[0.04] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </button>
          {atRiskIds.length > 0 && (
            <button
              onClick={() => notify(atRiskIds, "tous les projets à risque")}
              disabled={sendingAll}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0D0D0D] dark:bg-white text-white dark:text-[#0D0D0D] text-sm font-semibold hover:opacity-80 transition-all disabled:opacity-50"
            >
              {sendingAll
                ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <Send className="w-4 h-4" />}
              Notifier tous les projets à risque
            </button>
          )}
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Projets actifs",   value: total,   icon: <Clock className="w-5 h-5 text-[#FFD600]" />,          border: "border-l-[#FFD600]",   click: "all"      },
          { label: "On Track",         value: onTrack,  icon: <CheckCircle2 className="w-5 h-5 text-green-500" />,   border: "border-l-green-500",   click: "On Track" },
          { label: "At Risk",          value: atRisk,   icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,  border: "border-l-amber-500",   click: "At Risk"  },
          { label: "Burning 🔴",       value: burning,  icon: <Flame className="w-5 h-5 text-red-500" />,            border: "border-l-red-500",     click: "Burning"  },
        ].map(({ label, value, icon, border, click }) => (
          <button
            key={label}
            onClick={() => setFilter(click as "all" | PaceLabel)}
            className={`bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] border-l-4 ${border} shadow-sm p-5 flex items-start gap-4 hover:-translate-y-1 hover:shadow-md transition-all text-left ${filter === click ? "ring-2 ring-[#FFD600]" : ""}`}
          >
            <div className="mt-0.5 shrink-0">{icon}</div>
            <div>
              <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3] mb-0.5">{label}</p>
              <p className="text-2xl font-bold text-[#0D0D0D] dark:text-white">{value}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Filter pills ── */}
      {filter !== "all" && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">Filtre actif :</span>
          <PaceBadge label={filter as PaceLabel} />
          <button
            onClick={() => setFilter("all")}
            className="text-xs text-[#9E9EA3] hover:text-[#0D0D0D] dark:hover:text-white underline transition-colors"
          >
            Effacer
          </button>
        </div>
      )}

      {/* ── Table ── */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-4 border-[#CACAC4] border-t-[#FFD600] rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-[#9E9EA3]">
          <CheckCircle2 className="w-12 h-12 opacity-30" />
          <p className="text-sm font-medium">Aucun projet dans cette catégorie.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#CACAC4] dark:border-white/[0.06] bg-[#F2F2F2] dark:bg-[#1A1A1D]">
                  {["Projet / Client", "Responsable", "Heures", "Temps écoulé", "Rythme", "Fin estimée", "Échéance", "Action"].map((h, i) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-[#6B6B6F] dark:text-[#9E9EA3] whitespace-nowrap ${i > 1 ? "text-right" : "text-left"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CACAC4]/50 dark:divide-white/[0.04]">
                {filtered.map((p) => {
                  const isOverdue = p.daysToDeadline < 0;
                  const isSending = sending.has(p._id);

                  return (
                    <tr
                      key={p._id}
                      className={`hover:bg-[#F2F2F2] dark:hover:bg-white/[0.02] transition-colors ${p.paceLabel === "Burning" ? "bg-red-50/40 dark:bg-red-900/10" : p.paceLabel === "At Risk" ? "bg-amber-50/40 dark:bg-amber-900/10" : ""}`}
                    >
                      {/* Project / Client */}
                      <td className="px-4 py-3.5 min-w-[200px]">
                        <p className="font-semibold text-[#0D0D0D] dark:text-white truncate max-w-[200px]">{p.name}</p>
                        <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3] truncate max-w-[200px] mt-0.5">{p.clientName}</p>
                      </td>

                      {/* Manager */}
                      <td className="px-4 py-3.5 min-w-[150px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#0D0D0D] dark:text-white truncate max-w-[140px]">{p.responsiblePartnerName || "—"}</span>
                        </div>
                        {p.managerEmail && (
                          <p className="text-xs text-[#9E9EA3] truncate max-w-[140px] mt-0.5">{p.managerEmail}</p>
                        )}
                      </td>

                      {/* Hours */}
                      <td className="px-4 py-3.5 text-right min-w-[140px]">
                        <p className="font-semibold text-[#0D0D0D] dark:text-white">
                          {p.hoursConsumed}h
                          <span className="text-xs font-normal text-[#6B6B6F] dark:text-[#9E9EA3]"> / {p.budgetHours}h</span>
                        </p>
                        <div className="mt-1.5">
                          <ProgressBar
                            value={p.hoursConsumed}
                            max={p.budgetHours}
                            color={p.paceLabel === "Burning" ? "bg-red-500" : p.paceLabel === "At Risk" ? "bg-amber-400" : "bg-green-500"}
                          />
                          <p className={`text-xs mt-0.5 font-medium text-right ${p.paceLabel === "Burning" ? "text-red-500" : p.paceLabel === "At Risk" ? "text-amber-500" : "text-green-600 dark:text-green-400"}`}>
                            {p.hoursProgress.toFixed(1)}%
                          </p>
                        </div>
                      </td>

                      {/* Time progress */}
                      <td className="px-4 py-3.5 text-right min-w-[120px]">
                        <p className="font-semibold text-[#0D0D0D] dark:text-white">{p.timeProgress.toFixed(1)}%</p>
                        <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3] mt-0.5">du contrat écoulé</p>
                      </td>

                      {/* Pace */}
                      <td className="px-4 py-3.5 text-right min-w-[120px]">
                        <div className="flex flex-col items-end gap-1.5">
                          <PaceBadge label={p.paceLabel} />
                          <div className="flex items-center gap-1 text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">
                            <PaceArrow ratio={p.paceRatio} />
                            {p.paceRatio.toFixed(2)}×
                          </div>
                        </div>
                      </td>

                      {/* Estimated finish */}
                      <td className="px-4 py-3.5 text-right min-w-[130px]">
                        <div className="flex items-center justify-end gap-1">
                          <CalendarClock className="w-3.5 h-3.5 text-[#9E9EA3] shrink-0" />
                          <span className="text-[#0D0D0D] dark:text-white font-medium">{fmtDate(p.estimatedFinishDate)}</span>
                        </div>
                        {p.estimatedOverrunDays > 0 && (
                          <p className="text-xs text-red-500 font-semibold mt-0.5">
                            +{Math.round(p.estimatedOverrunDays)}j de dépassement
                          </p>
                        )}
                      </td>

                      {/* Deadline */}
                      <td className="px-4 py-3.5 text-right min-w-[130px]">
                        <span className={`font-medium ${isOverdue ? "text-red-600 dark:text-red-400" : "text-[#0D0D0D] dark:text-white"}`}>
                          {fmtDate(p.endDate)}
                        </span>
                        <p className={`text-xs mt-0.5 font-medium ${isOverdue ? "text-red-500" : "text-[#6B6B6F] dark:text-[#9E9EA3]"}`}>
                          {isOverdue
                            ? `En retard de ${Math.abs(Math.round(p.daysToDeadline))}j`
                            : `Dans ${Math.round(p.daysToDeadline)}j`}
                        </p>
                      </td>

                      {/* Notify button */}
                      <td className="px-4 py-3.5 text-right">
                        {p.paceLabel !== "On Track" ? (
                          <button
                            onClick={() => notify([p._id], p.name)}
                            disabled={isSending}
                            title={p.managerEmail ? `Notifier ${p.managerEmail}` : "Notifier les admins"}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0D0D0D] dark:bg-white text-white dark:text-[#0D0D0D] hover:opacity-80 transition-all disabled:opacity-50"
                          >
                            {isSending
                              ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              : <Mail className="w-3.5 h-3.5" />}
                            Notifier
                          </button>
                        ) : (
                          <span className="text-xs text-[#9E9EA3]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="px-4 py-3 border-t border-[#CACAC4]/50 dark:border-white/[0.04] flex items-center justify-between">
            <p className="text-xs text-[#9E9EA3]">
              {filtered.length} projet(s) affiché(s)
            </p>
            <p className="text-xs text-[#9E9EA3]">
              Ratio &gt; 1 = consomme les heures plus vite que prévu
            </p>
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-5">
        <p className="text-xs font-bold uppercase tracking-widest text-[#6B6B6F] dark:text-[#9E9EA3] mb-4">Légende du rythme</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(["On Track", "At Risk", "Burning"] as PaceLabel[]).map((label) => {
            const cfg = PACE_CONFIG[label];
            const desc = label === "On Track"
              ? "Ratio ≤ 1.0 — les heures sont consommées au même rythme ou moins vite que le temps écoulé."
              : label === "At Risk"
              ? "Ratio 1.0 – 1.25 — légère sur-consommation, surveillance recommandée."
              : "Ratio > 1.25 — consommation critique, risque de dépassement du budget heures.";
            return (
              <div key={label} className={`flex items-start gap-3 p-4 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                <span className={`mt-0.5 ${cfg.text}`}>{cfg.icon}</span>
                <div>
                  <p className={`text-sm font-semibold ${cfg.text}`}>{label}</p>
                  <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3] mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
