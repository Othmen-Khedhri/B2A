import { useState } from "react";
import { GitBranch, AlertTriangle, CalendarOff, Info } from "lucide-react";
import { ALL_PROJECTS, HEURES_COLLAB } from "../overview/dashboardData";
import type { Project, HeuresCollab } from "../overview/dashboardData";
import { PROJECT_ASSIGNMENTS } from "../projects/projectsData";
import { CONGES, getTotalConges, getCongesByType } from "./congesData";
import type { Conge } from "./congesData";

const STATUS_OPTIONS = ["All", "En cours", "Terminé", "En attente"];

// Reference date: use end of 2025 data period for "currently on leave" display
// Since our data covers 2025, we show a period picker to simulate any date
const DATA_PERIODS = [
  "2025-01", "2025-02", "2025-03", "2025-04",
  "2025-05", "2025-06", "2025-07", "2025-08",
  "2025-09", "2025-10", "2025-11", "2025-12",
];

/** Return congés that overlap the given month (YYYY-MM) */
function getCongesForMonth(name: string, period: string): Conge[] {
  const [y, m] = period.split("-").map(Number);
  const monthStart = new Date(y, m - 1, 1).getTime();
  const monthEnd   = new Date(y, m, 0).getTime(); // last day of month
  return CONGES.filter(c =>
    c.expertName === name &&
    c.approved &&
    new Date(c.dateStart).getTime() <= monthEnd &&
    new Date(c.dateEnd).getTime() >= monthStart
  );
}

function NiveauBadge({ niveau }: { niveau: string }) {
  const cls =
    niveau === "Manager"
      ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
      : niveau === "Senior"
      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
      : "bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-[#9E9EA3]";
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${cls}`}>
      {niveau}
    </span>
  );
}

function CongeBadge({ type }: { type: string }) {
  const cls =
    type === "Maladie"
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
      : type === "Exceptionnel"
      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
      : "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300";
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${cls}`}>
      <CalendarOff className="w-2.5 h-2.5" />
      {type}
    </span>
  );
}

function WorkloadBar({ pct }: { pct: number }) {
  const barCls =
    pct < 60
      ? "bg-green-500"
      : pct <= 75
      ? "bg-amber-500"
      : "bg-red-500";
  return (
    <div className="w-full bg-[#CACAC4]/30 dark:bg-white/[0.06] rounded-full h-1.5">
      <div
        className={`h-1.5 rounded-full transition-all ${barCls}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

export default function Assignments() {
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("En cours");
  const [showAll, setShowAll]         = useState(false);
  const [period, setPeriod]           = useState("2025-07");

  // Filter projects
  const filteredProjects = ALL_PROJECTS.filter((p: Project) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.id.toLowerCase().includes(q) ||
      p.client.toLowerCase().includes(q);

    const effectiveStatus = showAll ? "All" : statusFilter;
    const matchStatus =
      effectiveStatus === "All" || p.status === effectiveStatus;

    return matchSearch && matchStatus;
  });

  const collabs: HeuresCollab[] = HEURES_COLLAB;

  function countProjectsForCollab(name: string): number {
    return Object.values(PROJECT_ASSIGNMENTS).filter((names) =>
      names.includes(name)
    ).length;
  }

  function isBurnoutRisk(c: HeuresCollab): boolean {
    return c.tsNonRemplis > 40 || c.anomalies > 80;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-[#FFD600]/20">
          <GitBranch className="w-6 h-6 text-[#FFD600]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#0D0D0D] dark:text-white">
            Affectations
          </h1>
          <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">
            Matrice d'affectation collaborateurs / projets — congés intégrés
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Rechercher par ID ou client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 text-sm rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white placeholder:text-[#6B6B6F] dark:placeholder:text-[#9E9EA3] focus:outline-none focus:ring-2 focus:ring-[#FFD600]/50"
        />
        {!showAll && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFD600]/50"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "Tous les statuts" : s}
              </option>
            ))}
          </select>
        )}
        <button
          onClick={() => setShowAll((v) => !v)}
          className={`px-3 py-2 text-sm rounded-xl border transition-colors font-semibold ${
            showAll
              ? "bg-[#FFD600] border-[#FFD600] text-[#0D0D0D]"
              : "bg-white dark:bg-[#2A2A2E] border-[#CACAC4] dark:border-white/[0.06] text-[#6B6B6F] dark:text-[#9E9EA3] hover:border-[#FFD600]"
          }`}
        >
          {showAll ? "Afficher En cours seulement" : "Afficher tous"}
        </button>

        {/* Period selector for congé display */}
        <div className="flex items-center gap-2">
          <CalendarOff className="w-4 h-4 text-teal-500" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFD600]/50"
          >
            {DATA_PERIODS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">
        {filteredProjects.length} projet{filteredProjects.length !== 1 ? "s" : ""} affiché
        {filteredProjects.length !== 1 ? "s" : ""}
      </p>

      {/* Assignment matrix */}
      <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#CACAC4] dark:border-white/[0.06]">
                {/* Sticky first column header */}
                <th className="sticky left-0 z-10 bg-white dark:bg-[#2A2A2E] px-4 py-3 text-left font-semibold text-[#6B6B6F] dark:text-[#9E9EA3] min-w-[220px] border-r border-[#CACAC4] dark:border-white/[0.06]">
                  Collaborateur
                </th>
                {filteredProjects.map((p: Project) => (
                  <th
                    key={p.id}
                    className="px-3 py-3 text-center font-semibold text-[#6B6B6F] dark:text-[#9E9EA3] min-w-[80px]"
                    title={`${p.id} — ${p.client}`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="font-mono text-[10px]">{p.id}</span>
                      <span
                        className="text-[10px] max-w-[72px] truncate"
                        title={p.client}
                      >
                        {p.client}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {collabs.map((c: HeuresCollab) => {
                const activeConges = getCongesForMonth(c.name, period);
                const onLeave = activeConges.length > 0;
                return (
                  <tr
                    key={c.name}
                    className={`border-b border-[#CACAC4]/50 dark:border-white/[0.04] last:border-0 transition-colors ${
                      onLeave
                        ? "bg-teal-50/60 dark:bg-teal-900/10 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                        : "hover:bg-[#FFD600]/5"
                    }`}
                  >
                    {/* Sticky collab cell */}
                    <td className={`sticky left-0 z-10 px-4 py-2.5 border-r border-[#CACAC4] dark:border-white/[0.06] ${
                      onLeave
                        ? "bg-teal-50/60 dark:bg-teal-900/10"
                        : "bg-white dark:bg-[#2A2A2E]"
                    }`}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isBurnoutRisk(c) && (
                            <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
                          )}
                          <span className="text-sm font-semibold text-[#0D0D0D] dark:text-white truncate">
                            {c.name}
                          </span>
                          <NiveauBadge niveau={c.niveau} />
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <p className="text-[10px] text-[#6B6B6F] dark:text-[#9E9EA3]">
                            {c.txFacturable}% facturable
                          </p>
                          {onLeave && activeConges.map((cg, i) => (
                            <CongeBadge key={i} type={cg.type} />
                          ))}
                        </div>
                      </div>
                    </td>

                    {/* Assignment dots — greyed out if on leave */}
                    {filteredProjects.map((p: Project) => {
                      const assigned = (PROJECT_ASSIGNMENTS[p.id] ?? []).includes(c.name);
                      return (
                        <td key={p.id} className="px-3 py-2.5 text-center">
                          {assigned ? (
                            onLeave ? (
                              // Assigned but on leave — striped yellow/teal
                              <div
                                title="Affecté — en congé"
                                className="w-3 h-3 mx-auto rounded-full border-2 border-teal-400 bg-[#FFD600]/40"
                              />
                            ) : (
                              <div className="bg-[#FFD600] rounded-full w-3 h-3 mx-auto" />
                            )
                          ) : (
                            <div className="border border-[#CACAC4] dark:border-white/[0.06] rounded-full w-3 h-3 mx-auto opacity-50" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Congés summary for selected period */}
      <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2">
          <CalendarOff className="w-5 h-5 text-teal-500" />
          <h3 className="text-base font-bold text-[#0D0D0D] dark:text-white">
            Congés — {period}
          </h3>
        </div>
        {(() => {
          const rows = collabs
            .map((c) => ({ c, conges: getCongesForMonth(c.name, period) }))
            .filter((x) => x.conges.length > 0);
          if (rows.length === 0) {
            return (
              <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">
                Aucun congé enregistré pour cette période.
              </p>
            );
          }
          return (
            <div className="space-y-3">
              {rows.map(({ c, conges }) => (
                <div
                  key={c.name}
                  className="flex flex-wrap items-start justify-between gap-3 p-3 rounded-xl bg-teal-50 dark:bg-teal-900/10 border border-teal-200 dark:border-teal-800/40"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-[#0D0D0D] dark:text-white">
                      {c.name}
                    </span>
                    <NiveauBadge niveau={c.niveau} />
                    {conges.map((cg, i) => (
                      <CongeBadge key={i} type={cg.type} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">
                    {conges.map((cg, i) => (
                      <span key={i} className="bg-white dark:bg-[#2A2A2E] px-2 py-0.5 rounded border border-[#CACAC4] dark:border-white/[0.06]">
                        {cg.dateStart} → {cg.dateEnd} ({cg.days}j)
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Workload summary */}
      <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-[#0D0D0D] dark:text-white">
            Charge par collaborateur
          </h3>
          <span className="flex items-center gap-1 text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">
            <Info className="w-3.5 h-3.5" />
            Total congés 2025
          </span>
        </div>
        <div className="space-y-4">
          {collabs.map((c: HeuresCollab) => {
            const nbProjets    = countProjectsForCollab(c.name);
            const risk         = isBurnoutRisk(c);
            const totalConges  = getTotalConges(c.name);
            const byType       = getCongesByType(c.name);
            return (
              <div key={c.name} className="space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {risk && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                        <AlertTriangle className="w-3 h-3" />
                        Alerte burnout
                      </span>
                    )}
                    <span className="text-sm font-semibold text-[#0D0D0D] dark:text-white">
                      {c.name}
                    </span>
                    <NiveauBadge niveau={c.niveau} />
                    {/* Congé breakdown badges */}
                    {Object.entries(byType).map(([type, days]) => (
                      <span
                        key={type}
                        className="text-[10px] text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/20 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800/40"
                      >
                        {type}: {days}j
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">
                    <span>
                      <span className="font-semibold text-[#0D0D0D] dark:text-white">
                        {nbProjets}
                      </span>{" "}
                      projet{nbProjets !== 1 ? "s" : ""}
                    </span>
                    <span>
                      <span className="font-semibold text-[#0D0D0D] dark:text-white">
                        {c.txFacturable}%
                      </span>{" "}
                      facturable
                    </span>
                    <span>
                      <span className="font-semibold text-red-500">{c.anomalies}</span>{" "}
                      anomalie{c.anomalies !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarOff className="w-3 h-3 text-teal-500" />
                      <span className="font-semibold text-teal-600 dark:text-teal-400">
                        {totalConges}j
                      </span>{" "}
                      congé
                    </span>
                  </div>
                </div>
                <WorkloadBar pct={c.txFacturable} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
