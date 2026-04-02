import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderKanban } from "lucide-react";
import { ALL_PROJECTS } from "../overview/dashboardData";
import type { Project } from "../overview/dashboardData";

const STATUS_OPTIONS = ["All", "En cours", "Terminé", "En attente"];

const uniqueTypes = Array.from(new Set(ALL_PROJECTS.map((p: Project) => p.type))).sort();
const TYPE_OPTIONS = ["All", ...uniqueTypes];

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "En cours"
      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
      : status === "Terminé"
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}
    >
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
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}
    >
      {complexity}
    </span>
  );
}

function OverBudgetBadge({ over }: { over: boolean }) {
  return over ? (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
      OUI
    </span>
  ) : (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
      NON
    </span>
  );
}

const TABLE_COLS = [
  "ID Projet",
  "Client",
  "Type Mission",
  "Manager",
  "Secteur",
  "Complexité",
  "H Budget",
  "H Réelles",
  "Budget HT",
  "Coût Réel",
  "Marge TND",
  "Rentabilité %",
  "Statut",
  "Dépassement",
];

export default function ProjectsList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");

  const filtered = ALL_PROJECTS.filter((p: Project) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.id.toLowerCase().includes(q) ||
      p.client.toLowerCase().includes(q);
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    const matchType = typeFilter === "All" || p.type === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-[#FFD600]/20">
          <FolderKanban className="w-6 h-6 text-[#FFD600]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#0D0D0D] dark:text-white">
            Projets
          </h1>
          <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">
            Vue d'ensemble de tous les projets
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Rechercher par ID ou client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 text-sm rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white placeholder:text-[#6B6B6F] dark:placeholder:text-[#9E9EA3] focus:outline-none focus:ring-2 focus:ring-[#FFD600]/50"
        />
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
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFD600]/50"
        >
          {TYPE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t === "All" ? "Tous les types" : t}
            </option>
          ))}
        </select>
      </div>

      {/* Summary */}
      <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">
        {filtered.length} projet{filtered.length !== 1 ? "s" : ""} affiché
        {filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Table */}
      <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[1300px]">
          <thead>
            <tr className="border-b border-[#CACAC4] dark:border-white/[0.06]">
              {TABLE_COLS.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left font-semibold text-[#6B6B6F] dark:text-[#9E9EA3] whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={TABLE_COLS.length}
                  className="px-4 py-8 text-center text-[#6B6B6F] dark:text-[#9E9EA3]"
                >
                  Aucun projet trouvé
                </td>
              </tr>
            ) : (
              filtered.map((p: Project) => (
                <tr
                  key={p.id}
                  onClick={() => navigate(`/dashboard/projects/${p.id}`)}
                  className="border-b border-[#CACAC4]/50 dark:border-white/[0.04] hover:bg-[#FFD600]/5 cursor-pointer transition-colors last:border-0"
                >
                  <td className="px-4 py-3 font-mono font-semibold text-[#0D0D0D] dark:text-white whitespace-nowrap">
                    {p.id}
                  </td>
                  <td className="px-4 py-3 text-[#0D0D0D] dark:text-white whitespace-nowrap">
                    {p.client}
                  </td>
                  <td className="px-4 py-3 text-[#6B6B6F] dark:text-[#9E9EA3] whitespace-nowrap">
                    {p.type}
                  </td>
                  <td className="px-4 py-3 text-[#6B6B6F] dark:text-[#9E9EA3] whitespace-nowrap">
                    {p.manager}
                  </td>
                  <td className="px-4 py-3 text-[#6B6B6F] dark:text-[#9E9EA3] whitespace-nowrap">
                    {p.sector}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <ComplexityBadge complexity={p.complexity} />
                  </td>
                  <td className="px-4 py-3 text-right text-[#0D0D0D] dark:text-white whitespace-nowrap">
                    {p.hBudget.toLocaleString("fr-TN")}
                  </td>
                  <td className="px-4 py-3 text-right text-[#0D0D0D] dark:text-white whitespace-nowrap">
                    {p.hReal.toLocaleString("fr-TN")}
                  </td>
                  <td className="px-4 py-3 text-right text-[#0D0D0D] dark:text-white whitespace-nowrap">
                    {p.budgetHT.toLocaleString("fr-TN")}
                  </td>
                  <td className="px-4 py-3 text-right text-[#0D0D0D] dark:text-white whitespace-nowrap">
                    {p.coutReel.toLocaleString("fr-TN")}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      p.marge >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {p.marge.toLocaleString("fr-TN")}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                      p.rentPct >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {p.rentPct}%
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <OverBudgetBadge over={p.overBudget} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
