import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, CheckCircle } from "lucide-react";
import { ALL_PROJECTS } from "../overview/dashboardData";
import type { Project } from "../overview/dashboardData";
import { PROJECT_MONTHLY_HOURS, PROJECT_STAFF_HOURS } from "./projectsData";

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "En cours"
      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
      : status === "Terminé"
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {status}
    </span>
  );
}

function ComplexityBadge({ complexity }: { complexity: string }) {
  const cls =
    complexity === "Faible"
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      : complexity === "Moyenne"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
      : complexity === "Élevée"
      ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {complexity}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
      {type}
    </span>
  );
}

function ProgressBar({ pct, className }: { pct: number; className?: string }) {
  const barColor =
    pct < 80
      ? "bg-green-500"
      : pct <= 100
      ? "bg-amber-500"
      : "bg-red-500";
  return (
    <div className={`w-full bg-[#CACAC4]/30 dark:bg-white/[0.06] rounded-full h-2 ${className ?? ""}`}>
      <div
        className={`h-2 rounded-full transition-all ${barColor}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const project: Project | undefined = ALL_PROJECTS.find((p) => p.id === id);

  if (!project) {
    return (
      <div className="p-6 flex flex-col items-center gap-4 text-center">
        <p className="text-lg font-semibold text-[#0D0D0D] dark:text-white">
          Projet introuvable
        </p>
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

  const hRatio = project.hBudget > 0 ? (project.hReal / project.hBudget) * 100 : 0;
  const budgetRatio =
    project.budgetHT > 0 ? (project.coutReel / project.budgetHT) * 100 : 0;

  const paceLabel =
    hRatio < 80 ? "On Track" : hRatio <= 100 ? "At Risk" : "Over Budget";
  const paceCls =
    hRatio < 80
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      : hRatio <= 100
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";

  const monthlyData = PROJECT_MONTHLY_HOURS[project.id] ?? [];
  const maxMonthly = Math.max(...monthlyData.map((m) => m.hours), 1);

  const staffData = [...(PROJECT_STAFF_HOURS[project.id] ?? [])].sort(
    (a, b) => b.hours - a.hours
  );
  const maxStaff = Math.max(...staffData.map((s) => s.hours), 1);

  return (
    <div className="p-6 space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-[#6B6B6F] dark:text-[#9E9EA3] hover:text-[#0D0D0D] dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Retour aux projets
      </button>

      {/* Header card */}
      <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-lg font-bold text-[#0D0D0D] dark:text-white">
                {project.id}
              </span>
              <TypeBadge type={project.type} />
              <StatusBadge status={project.status} />
              <ComplexityBadge complexity={project.complexity} />
            </div>
            <h2 className="text-2xl font-bold text-[#0D0D0D] dark:text-white">
              {project.client}
            </h2>
            <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">
              Secteur : <span className="font-semibold text-[#0D0D0D] dark:text-white">{project.sector}</span>
              &nbsp;&middot;&nbsp;Manager :{" "}
              <span className="font-semibold text-[#0D0D0D] dark:text-white">{project.manager}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`text-base font-bold px-4 py-2 rounded-xl ${paceCls}`}>
              {paceLabel}
            </span>
            {project.overBudget ? (
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
          </div>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Hours */}
        <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6F] dark:text-[#9E9EA3]">
            Heures
          </p>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-[#0D0D0D] dark:text-white">
              {project.hReal}
            </span>
            <span className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">
              / {project.hBudget} h budget
            </span>
          </div>
          <ProgressBar pct={hRatio} />
          <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">
            {hRatio.toFixed(1)}% du budget consommé
          </p>
        </div>

        {/* Budget */}
        <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6F] dark:text-[#9E9EA3]">
            Budget
          </p>
          <div className="flex items-end justify-between">
            <span className="text-2xl font-bold text-[#0D0D0D] dark:text-white">
              {project.coutReel.toLocaleString("fr-TN")}
            </span>
            <span className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">
              / {project.budgetHT.toLocaleString("fr-TN")} TND
            </span>
          </div>
          <ProgressBar pct={budgetRatio} />
          <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">
            {budgetRatio.toFixed(1)}% du budget HT utilisé
          </p>
        </div>

        {/* Marge */}
        <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6F] dark:text-[#9E9EA3]">
            Marge
          </p>
          <span
            className={`text-2xl font-bold ${
              project.marge >= 0
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {project.marge.toLocaleString("fr-TN")} TND
          </span>
          <p
            className={`text-sm font-semibold ${
              project.rentPct >= 0
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            Rentabilité : {project.rentPct}%
          </p>
        </div>

        {/* Info card */}
        <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#6B6B6F] dark:text-[#9E9EA3]">
            Infos
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">Complexité</span>
              <ComplexityBadge complexity={project.complexity} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">Secteur</span>
              <span className="text-sm font-semibold text-[#0D0D0D] dark:text-white text-right max-w-[130px] truncate">
                {project.sector}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">Statut</span>
              <StatusBadge status={project.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Monthly hours bar chart */}
      <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-6 space-y-4">
        <h3 className="text-base font-bold text-[#0D0D0D] dark:text-white">
          Heures mensuelles
        </h3>
        {monthlyData.length === 0 ? (
          <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">Aucune donnée mensuelle disponible.</p>
        ) : (
          <div className="flex items-end gap-2 overflow-x-auto pb-2">
            {monthlyData.map((m) => {
              const heightPct = (m.hours / maxMonthly) * 100;
              return (
                <div key={m.periode} className="flex flex-col items-center gap-1 flex-shrink-0" style={{ minWidth: 48 }}>
                  <span className="text-xs font-semibold text-[#0D0D0D] dark:text-white">
                    {m.hours}
                  </span>
                  <div
                    className="w-9 rounded-t-md bg-[#FFD600]"
                    style={{ height: `${Math.max(heightPct * 1.2, 4)}px` }}
                  />
                  <span className="text-[10px] text-[#6B6B6F] dark:text-[#9E9EA3] rotate-0 text-center leading-tight">
                    {m.periode.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Staff hours breakdown */}
      <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-6 space-y-4">
        <h3 className="text-base font-bold text-[#0D0D0D] dark:text-white">
          Heures par collaborateur
        </h3>
        {staffData.length === 0 ? (
          <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">Aucune donnée collaborateur disponible.</p>
        ) : (
          <div className="space-y-3">
            {staffData.map((s) => {
              const pct = (s.hours / maxStaff) * 100;
              return (
                <div key={s.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#0D0D0D] dark:text-white font-medium">
                      {s.name}
                    </span>
                    <span className="text-[#6B6B6F] dark:text-[#9E9EA3] font-semibold">
                      {s.hours} h
                    </span>
                  </div>
                  <div className="w-full bg-[#CACAC4]/30 dark:bg-white/[0.06] rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-[#FFD600] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
