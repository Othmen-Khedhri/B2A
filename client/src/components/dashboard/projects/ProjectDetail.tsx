import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, CheckCircle, Calendar, User, Tag, Hash, FileText } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LineChart, Line,
} from "recharts";
import api from "../../../services/api";

// ─── Shapes ───────────────────────────────────────────────────────────────────

interface DBProject {
  _id: string;
  name: string;
  clientName: string;
  type: string;
  segment: string;
  status: string;
  budgetHours: number;
  budgetCost: number;
  hoursConsumed: number;
  costConsumed: number;
  invoicedAmount: number;
  grossMargin: number;
  marginPercent: number;
  paceIndexHours: number;
  paceIndexCost: number;
  effectiveCostPerHour: number;
  responsiblePartnerName: string;
  externalId: string;
  notes: string;
  collaboratorsRaw: string;
  validatedByManager: boolean;
  startDate: string;
  endDate: string;
  createdAt: string;
}

interface StaffHour {
  _id: string;
  expertName: string;
  totalHours: number;
}

interface MonthlyHour {
  _id: string; // "YYYY-MM"
  hours: number;
}

interface ProjectDetailResponse {
  project: DBProject;
  timeEntries: unknown[];
  staffHours: StaffHour[];
  monthlyHours: MonthlyHour[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_FR: Record<string, string> = {
  active:    "En cours",
  completed: "Terminé",
  "on-hold": "En attente",
  cancelled: "Annulé",
};

function fmt(n: number) {
  return n.toLocaleString("fr-TN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-TN", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "active"
      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
      : status === "completed"
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      : status === "cancelled"
      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
      : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {STATUS_FR[status] ?? status}
    </span>
  );
}

function PaceBadge({ paceIndex }: { paceIndex: number }) {
  if (paceIndex <= 1.0)  return <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">On Track</span>;
  if (paceIndex <= 1.25) return <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">At Risk</span>;
  return <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Burning</span>;
}

function ProgressBar({ pct, className }: { pct: number; className?: string }) {
  const barColor = pct < 80 ? "bg-green-500" : pct <= 100 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className={`w-full bg-[#CACAC4]/30 dark:bg-white/[0.06] rounded-full h-2 ${className ?? ""}`}>
      <div
        className={`h-2 rounded-full transition-all ${barColor}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[#CACAC4]/30 dark:border-white/[0.04] last:border-0">
      <div className="p-1.5 rounded-lg bg-[#FFD600]/10 shrink-0">
        <Icon className="w-3.5 h-3.5 text-[#FFD600]" />
      </div>
      <span className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3] min-w-[130px] shrink-0">{label}</span>
      <span className="text-sm font-medium text-[#0D0D0D] dark:text-white flex-1">{value || "—"}</span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject]           = useState<DBProject | null>(null);
  const [staffHours, setStaffHours]     = useState<StaffHour[]>([]);
  const [monthlyHours, setMonthlyHours] = useState<MonthlyHour[]>([]);
  const [loading, setLoading]           = useState(true);
  const [notFound, setNotFound]         = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get<ProjectDetailResponse>(`/projects/${id}`)
      .then(({ data }) => {
        setProject(data.project);
        setStaffHours(data.staffHours ?? []);
        setMonthlyHours(data.monthlyHours ?? []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-4 border-[#CACAC4] border-t-[#FFD600] rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !project) {
    return (
      <div className="flex flex-col items-center gap-4 text-center py-16">
        <p className="text-lg font-semibold text-[#0D0D0D] dark:text-white">Projet introuvable</p>
        <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">
          L'identifiant <span className="font-mono">{id}</span> ne correspond à aucun projet.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFD600] text-[#0D0D0D] font-semibold text-sm hover:bg-[#e6c000] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>
      </div>
    );
  }

  const hRatio      = project.budgetHours > 0 ? (project.hoursConsumed / project.budgetHours) * 100 : 0;
  const budgetRatio = project.budgetCost > 0   ? (project.costConsumed  / project.budgetCost)  * 100 : 0;
  const overBudget  = project.paceIndexHours > 1;

  const burnData = [
    { label: "H Budget",  value: project.budgetHours,   fill: "#94a3b8" },
    { label: "H Réelles", value: project.hoursConsumed, fill: hRatio > 100 ? "#ef4444" : "#FFD600" },
  ];
  const costData = [
    { label: "Budget (TND)", value: project.budgetCost,     fill: "#94a3b8" },
    { label: "Coût Réel",   value: project.costConsumed,   fill: budgetRatio > 100 ? "#ef4444" : "#22c55e" },
    { label: "Facturé",     value: project.invoicedAmount,  fill: "#6366f1" },
  ];

  // Format monthly data for the line chart
  const monthlyData = monthlyHours.map((m) => ({
    month: m._id,
    heures: m.hours,
  }));

  // Max hours for staff bar widths
  const maxStaffHours = staffHours.length > 0 ? staffHours[0].totalHours : 1;

  return (
    <div className="space-y-6">

      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-[#6B6B6F] dark:text-[#9E9EA3] hover:text-[#0D0D0D] dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux projets
      </button>

      {/* Header card */}
      <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {project.externalId && (
                <span className="font-mono text-sm font-bold text-[#0D0D0D] dark:text-white bg-[#F2F2F2] dark:bg-[#1A1A1D] px-2 py-0.5 rounded-lg">
                  {project.externalId}
                </span>
              )}
              <StatusBadge status={project.status} />
              <PaceBadge paceIndex={project.paceIndexHours} />
            </div>
            <h2 className="text-2xl font-bold text-[#0D0D0D] dark:text-white leading-tight">{project.name}</h2>
            <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">
              {project.clientName && <>Client : <span className="font-semibold text-[#0D0D0D] dark:text-white">{project.clientName}</span></>}
              {project.clientName && project.responsiblePartnerName && <span className="mx-2 opacity-40">·</span>}
              {project.responsiblePartnerName && <>Manager : <span className="font-semibold text-[#0D0D0D] dark:text-white">{project.responsiblePartnerName}</span></>}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {overBudget ? (
              <div className="flex items-center gap-1 text-red-600 dark:text-red-400 text-sm font-semibold">
                <AlertTriangle className="w-4 h-4" />
                Dépassement budgétaire
              </div>
            ) : (
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-semibold">
                <CheckCircle className="w-4 h-4" />
                Dans le budget
              </div>
            )}
            {project.validatedByManager && (
              <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-1 rounded-full">
                ✓ Validé manager
              </span>
            )}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6F] dark:text-[#9E9EA3]">Heures</p>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-[#0D0D0D] dark:text-white">{fmt(project.hoursConsumed)}</span>
            <span className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">/ {fmt(project.budgetHours)} h</span>
          </div>
          <ProgressBar pct={hRatio} />
          <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">{hRatio.toFixed(1)}% du budget consommé</p>
        </div>

        <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6F] dark:text-[#9E9EA3]">Budget / Coût</p>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-[#0D0D0D] dark:text-white">{fmt(project.costConsumed)}</span>
            <span className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">/ {fmt(project.budgetCost)} TND</span>
          </div>
          <ProgressBar pct={budgetRatio} />
          <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">{budgetRatio.toFixed(1)}% du budget utilisé</p>
        </div>

        <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6F] dark:text-[#9E9EA3]">Marge brute</p>
          <span className={`text-2xl font-bold ${project.grossMargin >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {fmt(project.grossMargin)} TND
          </span>
          <p className={`text-sm font-semibold ${project.marginPercent >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            Rentabilité : {project.marginPercent.toFixed(1)}%
          </p>
        </div>

        <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6F] dark:text-[#9E9EA3]">Facturé</p>
          <span className="text-2xl font-bold text-[#0D0D0D] dark:text-white">
            {fmt(project.invoicedAmount)} TND
          </span>
          <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">
            Coût/h effectif : {project.effectiveCostPerHour.toFixed(1)} TND
          </p>
        </div>
      </div>

      {/* Details + Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Project info */}
        <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-6">
          <h3 className="text-base font-bold text-[#0D0D0D] dark:text-white mb-4">Informations projet</h3>
          <InfoRow icon={Tag}      label="Type de mission"  value={project.type} />
          <InfoRow icon={Tag}      label="Segment"          value={project.segment} />
          <InfoRow icon={Calendar} label="Début"            value={project.startDate ? fmtDate(project.startDate) : "—"} />
          <InfoRow icon={Calendar} label="Fin prévue"       value={project.endDate   ? fmtDate(project.endDate)   : "—"} />
          <InfoRow icon={User}     label="Manager"          value={project.responsiblePartnerName} />
          <InfoRow icon={Hash}     label="Code Sage"        value={project.externalId} />
          {project.collaboratorsRaw && (
            <InfoRow icon={User} label="Collaborateurs" value={project.collaboratorsRaw} />
          )}
          {project.notes && (
            <InfoRow icon={FileText} label="Notes" value={project.notes} />
          )}
        </div>

        {/* Hours chart */}
        <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-6 space-y-4">
          <h3 className="text-base font-bold text-[#0D0D0D] dark:text-white">Heures — Budget vs Réel</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={burnData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.12)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(255,214,0,0.08)" }}
                contentStyle={{ backgroundColor: "var(--color-bg-sidebar)", border: "1px solid var(--color-border-default)", borderRadius: "10px", fontSize: "12px" }}
                formatter={(v) => [`${v} h`, ""]}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {burnData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <h3 className="text-base font-bold text-[#0D0D0D] dark:text-white pt-2">Coûts (TND)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={costData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.12)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(255,214,0,0.08)" }}
                contentStyle={{ backgroundColor: "var(--color-bg-sidebar)", border: "1px solid var(--color-border-default)", borderRadius: "10px", fontSize: "12px" }}
                formatter={(v) => [`${Number(v).toLocaleString("fr-TN")} TND`, ""]}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {costData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly hours trend + Staff breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Monthly trend */}
        {monthlyData.length > 0 && (
          <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-[#0D0D0D] dark:text-white">Heures par mois</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.12)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-text-tertiary)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ stroke: "rgba(255,214,0,0.3)" }}
                  contentStyle={{ backgroundColor: "var(--color-bg-sidebar)", border: "1px solid var(--color-border-default)", borderRadius: "10px", fontSize: "12px" }}
                  formatter={(v) => [`${v} h`, "Heures"]}
                />
                <Line type="monotone" dataKey="heures" stroke="#FFD600" strokeWidth={2} dot={{ fill: "#FFD600", r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Staff hours breakdown */}
        {staffHours.length > 0 && (
          <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-6">
            <h3 className="text-base font-bold text-[#0D0D0D] dark:text-white mb-4">Heures par collaborateur</h3>
            <div className="space-y-3">
              {staffHours.map((s) => {
                const pct = (s.totalHours / maxStaffHours) * 100;
                return (
                  <div key={s._id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[#0D0D0D] dark:text-white truncate max-w-[200px]">
                        {s.expertName || "Inconnu"}
                      </span>
                      <span className="text-sm font-semibold text-[#0D0D0D] dark:text-white shrink-0 ml-3">
                        {fmt(s.totalHours)} h
                      </span>
                    </div>
                    <div className="w-full bg-[#CACAC4]/30 dark:bg-white/[0.06] rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-[#FFD600] transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
