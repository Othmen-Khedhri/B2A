import { useState, useEffect, useCallback } from "react";
import {
  Search, TrendingUp, TrendingDown, FolderKanban, Users,
  AlertTriangle, BarChart2, Clock, Bell, Activity, ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react";
import api from "../../../services/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TopProject {
  _id: string;
  name: string;
  clientName: string;
  paceIndexHours: number;
  budgetHours: number;
  hoursConsumed: number;
  status: string;
}

interface RentableProject {
  _id: string;
  name: string;
  clientName: string;
  type: string;
  responsiblePartnerName: string;
  budgetCost: number;
  costConsumed: number;
  grossMargin: number;
  marginPercent: number;
}

interface DepassementProject {
  _id: string;
  name: string;
  clientName: string;
  type: string;
  responsiblePartnerName: string;
  budgetCost: number;
  costConsumed: number;
  budgetHours: number;
  hoursConsumed: number;
  paceIndexHours: number;
}

interface ManagerRent {
  manager: string;
  nbProjets: number;
  budgetTotal: number;
  coutTotal: number;
  margeTotal: number;
  projetsDepassement: number;
  rentMoy: number;
  tauxDep: number;
}

interface HeureCollab {
  _id: string;
  expertName: string;
  level: string;
  department: string;
  totalHours: number;
  validatedHours: number;
  pendingCount: number;
  rejectedCount: number;
  txValidation: number;
}

interface PendingAlert {
  _id: string;
  expertName: string;
  nbPeriods: number;
  totalPending: number;
  periods: string[];
  department: string;
}

interface AnomalyEntry {
  _id: string;
  expertName: string;
  projectName: string;
  date: string;
  hours: number;
  validationStatus: string;
}

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  overBudgetProjects: number;
  atRiskProjects: number;
  totalStaff: number;
  burnoutRiskCount: number;
  projectsByStatus: { status: string; count: number }[];
  topByPaceIndex: TopProject[];
  hoursPerMonth: { _id: string; totalHours: number }[];
  top10Rentable: RentableProject[];
  top10Depassement: DepassementProject[];
  rentByManager: ManagerRent[];
  heuresCollab: HeureCollab[];
  pendingAlerts: PendingAlert[];
  anomalies: AnomalyEntry[];
}

interface ProjectSearchResult {
  _id: string;
  name: string;
  clientName: string;
  type: string;
  responsiblePartnerName: string;
  status: string;
  budgetCost: number;
  budgetHours: number;
  hoursConsumed: number;
  costConsumed: number;
  grossMargin: number;
  marginPercent: number;
  paceIndexHours: number;
  externalId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 0) {
  return n.toLocaleString("fr-TN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function paceColor(ratio: number) {
  if (ratio <= 1.0)  return "bg-green-500";
  if (ratio <= 1.25) return "bg-amber-400";
  return "bg-red-500";
}

function paceTextColor(ratio: number) {
  if (ratio <= 1.0)  return "text-green-600 dark:text-green-400";
  if (ratio <= 1.25) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function PaceBar({ value, max, ratio }: { value: number; max: number; ratio: number }) {
  const pct = Math.min((value / Math.max(max, 1)) * 100, 100);
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1 text-[#6B6B6F] dark:text-[#9E9EA3]">
        <span>{fmt(value, 0)}</span>
        <span>{fmt(max, 0)}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-[#CACAC4]/40 dark:bg-white/10 overflow-hidden">
        <div className={`h-2 rounded-full ${paceColor(ratio)}`} style={{ width: `${pct}%` }} />
      </div>
      <div className={`text-right text-xs mt-0.5 font-medium ${paceTextColor(ratio)}`}>
        {fmt(ratio * 100, 1)}%
      </div>
    </div>
  );
}

function EmptyRow({ cols, label = "Aucune donnée" }: { cols: number; label?: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-3 py-8 text-center text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">
        {label}
      </td>
    </tr>
  );
}

// ─── Shared layout ────────────────────────────────────────────────────────────

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-3 py-2.5 text-xs font-semibold text-[#6B6B6F] dark:text-[#9E9EA3] whitespace-nowrap ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <td className={`px-3 py-2.5 text-sm text-[#0D0D0D] dark:text-white whitespace-nowrap ${right ? "text-right" : ""}`}>
      {children}
    </td>
  );
}

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-[#CACAC4] dark:border-white/[0.06]">
        {icon}
        <h2 className="text-base font-semibold text-[#0D0D0D] dark:text-white">{title}</h2>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

// ─── A. Project Pace Checker ──────────────────────────────────────────────────

function ProjectPaceChecker() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProjectSearchResult[]>([]);
  const [selected, setSelected] = useState<ProjectSearchResult | null>(null);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const { data } = await api.get<ProjectSearchResult[]>("/projects", { params: { search: q } });
      setResults(data.slice(0, 10));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  function select(p: ProjectSearchResult) {
    setSelected(p);
    setQuery(p.name + (p.clientName ? " – " + p.clientName : ""));
    setOpen(false);
  }

  // Use raw ratios for the progress bars (shows absolute consumption vs budget)
  const hRatio = selected ? selected.hoursConsumed / Math.max(selected.budgetHours, 1) : 0;
  const cRatio = selected ? selected.costConsumed / Math.max(selected.budgetCost, 1) : 0;
  // Use time-adjusted pace index for the status badge (matches server-side classification)
  const paceBadgeRatio = selected ? (selected.paceIndexHours ?? hRatio) : 0;

  function PaceBadge({ ratio }: { ratio: number }) {
    if (ratio <= 1.0)
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">On Track</span>;
    if (ratio <= 1.25)
      return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">At Risk</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Over Budget</span>;
  }

  const statusMap: Record<string, string> = {
    active: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    "on-hold": "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };

  return (
    <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Search size={18} className="text-[#FFD600]" />
        <h2 className="text-base font-semibold text-[#0D0D0D] dark:text-white">Project Pace Checker</h2>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6F] dark:text-[#9E9EA3]" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); if (!e.target.value) setSelected(null); }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher un projet par nom ou client…"
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[#CACAC4] dark:border-white/10 bg-[#E2E2DC] dark:bg-[#1A1A1E] text-[#0D0D0D] dark:text-white text-sm placeholder-[#6B6B6F] dark:placeholder-[#9E9EA3] focus:outline-none focus:ring-2 focus:ring-[#FFD600]/60"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border-2 border-[#FFD600] border-t-transparent rounded-full animate-spin" />
        )}
        {open && results.length > 0 && (
          <ul className="absolute z-20 left-0 right-0 mt-1 rounded-xl border border-[#CACAC4] dark:border-white/10 bg-white dark:bg-[#2A2A2E] shadow-lg overflow-hidden">
            {results.map((p) => (
              <li
                key={p._id}
                className="px-4 py-2.5 cursor-pointer hover:bg-[#E2E2DC] dark:hover:bg-white/5 text-sm text-[#0D0D0D] dark:text-white flex justify-between items-center"
                onMouseDown={() => select(p)}
              >
                <span>
                  <span className="font-medium">{p.name}</span>
                  {p.clientName && <span className="text-[#6B6B6F] dark:text-[#9E9EA3]"> – {p.clientName}</span>}
                </span>
                <span className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">{p.type}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <div className="mt-2 rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-[#E2E2DC]/50 dark:bg-[#1A1A1E]/50 p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusMap[selected.status] ?? statusMap["on-hold"]}`}>
                {selected.status}
              </span>
              <PaceBadge ratio={paceBadgeRatio} />
            </div>
            <div>
              <p className="text-lg font-semibold text-[#0D0D0D] dark:text-white leading-tight">{selected.name}</p>
              {selected.clientName && <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">{selected.clientName}</p>}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">Type</p>
                <p className="font-medium text-[#0D0D0D] dark:text-white">{selected.type || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">Manager</p>
                <p className="font-medium text-[#0D0D0D] dark:text-white">{selected.responsiblePartnerName || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">Marge</p>
                <p className={`font-semibold ${selected.marginPercent >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {fmt(selected.marginPercent, 1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">Pace Index</p>
                <p className={`font-semibold ${paceTextColor(selected.paceIndexHours)}`}>
                  {fmt(selected.paceIndexHours, 2)}
                </p>
              </div>
            </div>
          </div>
          <div className="space-y-5">
            <div>
              <p className="text-xs font-medium text-[#6B6B6F] dark:text-[#9E9EA3] mb-1.5">Heures — Réel / Budget</p>
              <PaceBar value={selected.hoursConsumed} max={selected.budgetHours} ratio={hRatio} />
            </div>
            <div>
              <p className="text-xs font-medium text-[#6B6B6F] dark:text-[#9E9EA3] mb-1.5">Budget — Coût Réel / Budget (TND)</p>
              <PaceBar value={selected.costConsumed} max={selected.budgetCost} ratio={cRatio} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── B. KPI Row ───────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, accentClass = "", borderClass = "border-l-[#FFD600]" }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; accentClass?: string; borderClass?: string;
}) {
  return (
    <div className={`bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] border-l-4 ${borderClass} shadow-sm p-5 flex items-start gap-4 hover:-translate-y-1 hover:shadow-md transition-all`}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3] mb-0.5">{label}</p>
        <p className={`text-2xl font-bold ${accentClass || "text-[#0D0D0D] dark:text-white"}`}>{value}</p>
        {sub && <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function KpiRow({ stats }: { stats: DashboardStats }) {
  const completedCount = stats.projectsByStatus.find((s) => s.status === "completed")?.count ?? 0;
  const onHoldCount = stats.projectsByStatus.find((s) => s.status === "on-hold")?.count ?? 0;
  const overPct = stats.totalProjects > 0 ? Math.round((stats.overBudgetProjects / stats.totalProjects) * 100) : 0;
  const rentableProjects = stats.top10Rentable;
  const avgMargin = rentableProjects.length > 0
    ? rentableProjects.reduce((s, p) => s + p.marginPercent, 0) / rentableProjects.length
    : 0;

  return (
    <div className="stagger-children grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        icon={<FolderKanban size={20} className="text-[#FFD600]" />}
        label="Projets — Total / Actifs / Terminés / En attente"
        value={String(stats.totalProjects)}
        sub={`Actifs: ${stats.activeProjects} · Terminés: ${completedCount} · En attente: ${onHoldCount}`}
        borderClass="border-l-[#FFD600]"
      />
      <KpiCard
        icon={<AlertTriangle size={20} className="text-red-500" />}
        label="Projets en dépassement de budget"
        value={String(stats.overBudgetProjects)}
        sub={`${overPct}% du portefeuille`}
        accentClass="text-red-600 dark:text-red-400"
        borderClass="border-l-red-500"
      />
      <KpiCard
        icon={<Users size={20} className="text-blue-500" />}
        label="Collaborateurs actifs"
        value={String(stats.totalStaff)}
        sub={stats.burnoutRiskCount > 0 ? `${stats.burnoutRiskCount} à risque burnout` : undefined}
        borderClass="border-l-blue-500"
      />
      <KpiCard
        icon={<TrendingUp size={20} className="text-green-500" />}
        label="Marge moy. (top projets rentables)"
        value={`${fmt(avgMargin, 1)}%`}
        accentClass="text-green-600 dark:text-green-400"
        borderClass="border-l-green-500"
      />
    </div>
  );
}

// ─── C. Top 10 Rentables ──────────────────────────────────────────────────────

function Top10RentableTable({ data }: { data: RentableProject[] }) {
  return (
    <SectionCard icon={<TrendingUp size={18} className="text-green-500" />} title="Top 10 Projets les plus rentables">
      <table className="w-full">
        <thead className="bg-[#E2E2DC]/60 dark:bg-white/[0.03]">
          <tr>
            <Th>Rang</Th>
            <Th>Projet</Th>
            <Th>Client</Th>
            <Th>Type Mission</Th>
            <Th>Manager</Th>
            <Th right>Budget (TND)</Th>
            <Th right>Coût Réel</Th>
            <Th right>Marge TND</Th>
            <Th right>Rentabilité %</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#CACAC4]/40 dark:divide-white/[0.04]">
          {data.length === 0 ? (
            <EmptyRow cols={9} />
          ) : (
            data.map((r, i) => (
              <tr key={r._id} className="hover:bg-[#E2E2DC]/30 dark:hover:bg-white/[0.02]">
                <Td><span className="font-bold text-[#FFD600]">#{i + 1}</span></Td>
                <Td><span className="font-medium">{r.name}</span></Td>
                <Td>{r.clientName}</Td>
                <Td>{r.type}</Td>
                <Td>{r.responsiblePartnerName || "—"}</Td>
                <Td right>{fmt(r.budgetCost)}</Td>
                <Td right>{fmt(r.costConsumed)}</Td>
                <Td right><span className="text-green-600 dark:text-green-400 font-medium">{fmt(r.grossMargin)}</span></Td>
                <Td right><span className="text-green-600 dark:text-green-400 font-semibold">{fmt(r.marginPercent, 1)}%</span></Td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </SectionCard>
  );
}

// ─── D. Top 10 Dépassement ────────────────────────────────────────────────────

function Top10DepTable({ data }: { data: DepassementProject[] }) {
  return (
    <SectionCard icon={<TrendingDown size={18} className="text-red-500" />} title="Top 10 Projets en dépassement de budget">
      <table className="w-full">
        <thead className="bg-[#E2E2DC]/60 dark:bg-white/[0.03]">
          <tr>
            <Th>Rang</Th>
            <Th>Projet</Th>
            <Th>Client</Th>
            <Th>Manager</Th>
            <Th right>Budget (TND)</Th>
            <Th right>Coût Réel</Th>
            <Th right>Écart Heures</Th>
            <Th right>H Budget</Th>
            <Th right>H Réel</Th>
            <Th right>Pace Index</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#CACAC4]/40 dark:divide-white/[0.04]">
          {data.length === 0 ? (
            <EmptyRow cols={10} />
          ) : (
            data.map((r, i) => {
              const ecartHeures = r.hoursConsumed - r.budgetHours;
              return (
                <tr key={r._id} className="hover:bg-[#E2E2DC]/30 dark:hover:bg-white/[0.02]">
                  <Td><span className="font-bold text-red-500">#{i + 1}</span></Td>
                  <Td><span className="font-medium">{r.name}</span></Td>
                  <Td>{r.clientName}</Td>
                  <Td>{r.responsiblePartnerName || "—"}</Td>
                  <Td right>{fmt(r.budgetCost)}</Td>
                  <Td right>{fmt(r.costConsumed)}</Td>
                  <Td right>
                    <span className={ecartHeures > 0 ? "text-red-600 dark:text-red-400 font-medium" : "text-amber-600 dark:text-amber-400 font-medium"}>
                      {ecartHeures > 0 ? "+" : ""}{fmt(ecartHeures, 0)}h
                    </span>
                  </Td>
                  <Td right>{fmt(r.budgetHours, 0)}h</Td>
                  <Td right>{fmt(r.hoursConsumed, 0)}h</Td>
                  <Td right><span className="text-red-600 dark:text-red-400 font-semibold">{fmt(r.paceIndexHours, 2)}</span></Td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </SectionCard>
  );
}

// ─── E. Heures Collab ─────────────────────────────────────────────────────────

function txValidationClass(tx: number) {
  if (tx < 60) return "text-red-600 dark:text-red-400";
  if (tx < 80) return "text-amber-600 dark:text-amber-400";
  return "text-green-600 dark:text-green-400";
}

function HeuresCollabTable({ data }: { data: HeureCollab[] }) {
  return (
    <SectionCard icon={<Clock size={18} className="text-blue-500" />} title="Heures saisies par collaborateur">
      <table className="w-full">
        <thead className="bg-[#E2E2DC]/60 dark:bg-white/[0.03]">
          <tr>
            <Th>Collaborateur</Th>
            <Th>Niveau</Th>
            <Th>Département</Th>
            <Th right>H Totales</Th>
            <Th right>H Validées</Th>
            <Th right>En attente</Th>
            <Th right>Rejetées</Th>
            <Th right>Tx Validation %</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#CACAC4]/40 dark:divide-white/[0.04]">
          {data.length === 0 ? (
            <EmptyRow cols={8} />
          ) : (
            data.map((c) => (
              <tr key={c._id} className="hover:bg-[#E2E2DC]/30 dark:hover:bg-white/[0.02]">
                <Td><span className="font-medium">{c.expertName}</span></Td>
                <Td>{c.level}</Td>
                <Td>{c.department || "—"}</Td>
                <Td right>{fmt(c.totalHours, 1)}</Td>
                <Td right>{fmt(c.validatedHours, 1)}</Td>
                <Td right>
                  {c.pendingCount > 0 ? (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      {c.pendingCount}
                    </span>
                  ) : <span className="text-[#6B6B6F] dark:text-[#9E9EA3]">0</span>}
                </Td>
                <Td right>
                  {c.rejectedCount > 0 ? (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                      {c.rejectedCount}
                    </span>
                  ) : <span className="text-[#6B6B6F] dark:text-[#9E9EA3]">0</span>}
                </Td>
                <Td right>
                  <span className={`font-semibold ${txValidationClass(c.txValidation)}`}>
                    {fmt(c.txValidation, 1)}%
                  </span>
                </Td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </SectionCard>
  );
}

// ─── F. Rentabilité par manager ───────────────────────────────────────────────

function RentManagerCards({ data }: { data: ManagerRent[] }) {
  const sorted = [...data].sort((a, b) => b.rentMoy - a.rentMoy);
  return (
    <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5 border-b border-[#CACAC4] dark:border-white/[0.06] pb-4">
        <BarChart2 size={18} className="text-[#FFD600]" />
        <h2 className="text-base font-semibold text-[#0D0D0D] dark:text-white">Rentabilité du portefeuille par manager</h2>
      </div>
      {sorted.length === 0 ? (
        <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3] text-center py-6">Aucune donnée</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {sorted.map((m) => (
            <div key={m.manager} className="rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-[#E2E2DC]/40 dark:bg-[#1A1A1E]/50 p-4 space-y-3">
              <p className="font-semibold text-sm text-[#0D0D0D] dark:text-white leading-tight">{m.manager}</p>
              <div className="text-center">
                <p className={`text-3xl font-bold ${m.rentMoy >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {fmt(m.rentMoy, 1)}%
                </p>
                <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">Rentabilité moy.</p>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
                <div>
                  <p className="text-[#6B6B6F] dark:text-[#9E9EA3]">Projets</p>
                  <p className="font-semibold text-[#0D0D0D] dark:text-white">{m.nbProjets}</p>
                </div>
                <div>
                  <p className="text-[#6B6B6F] dark:text-[#9E9EA3]">Dépassement</p>
                  <p className="font-semibold text-red-600 dark:text-red-400">{m.projetsDepassement}/{m.nbProjets}</p>
                </div>
                <div>
                  <p className="text-[#6B6B6F] dark:text-[#9E9EA3]">Budget total</p>
                  <p className="font-medium text-[#0D0D0D] dark:text-white">{fmt(m.budgetTotal)}</p>
                </div>
                <div>
                  <p className="text-[#6B6B6F] dark:text-[#9E9EA3]">Taux dep.</p>
                  <p className="font-medium text-amber-600 dark:text-amber-400">{fmt(m.tauxDep, 1)}%</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[#6B6B6F] dark:text-[#9E9EA3]">Marge totale</p>
                  <p className={`font-semibold ${m.margeTotal >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {fmt(m.margeTotal)} TND
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── G. Alertes — timesheets en attente ───────────────────────────────────────

function AlertesSection({ data }: { data: PendingAlert[] }) {
  const [showAll, setShowAll] = useState(false);
  const totalPending = data.reduce((s, a) => s + a.totalPending, 0);
  const displayed = showAll ? data : data.slice(0, 20);

  return (
    <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-[#CACAC4] dark:border-white/[0.06]">
        <Bell size={18} className="text-amber-500" />
        <h2 className="text-base font-semibold text-[#0D0D0D] dark:text-white">Timesheets en attente de validation</h2>
      </div>
      <div className="px-6 py-3 bg-[#E2E2DC]/40 dark:bg-[#1A1A1E]/40 border-b border-[#CACAC4] dark:border-white/[0.06] flex flex-wrap gap-4 text-sm">
        <span className="text-[#6B6B6F] dark:text-[#9E9EA3]">
          Collaborateurs concernés : <span className="font-bold text-[#0D0D0D] dark:text-white">{data.length}</span>
        </span>
        <span className="text-[#6B6B6F] dark:text-[#9E9EA3]">
          Total entrées en attente : <span className="font-bold text-amber-600 dark:text-amber-400">{totalPending}</span>
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#E2E2DC]/60 dark:bg-white/[0.03]">
            <tr>
              <Th>Collaborateur</Th>
              <Th>Département</Th>
              <Th>Périodes concernées</Th>
              <Th right>NB Périodes</Th>
              <Th right>Entrées en attente</Th>
              <Th>Priorité</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#CACAC4]/40 dark:divide-white/[0.04]">
            {displayed.length === 0 ? (
              <EmptyRow cols={6} label="Aucun timesheet en attente" />
            ) : (
              displayed.map((a) => (
                <tr key={a._id} className="hover:bg-[#E2E2DC]/30 dark:hover:bg-white/[0.02]">
                  <Td>{a.expertName}</Td>
                  <Td>{a.department || "—"}</Td>
                  <Td>
                    <span className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">
                      {[...a.periods].sort().slice(-3).join(", ")}
                      {a.periods.length > 3 ? ` +${a.periods.length - 3}` : ""}
                    </span>
                  </Td>
                  <Td right><span className="font-semibold">{a.nbPeriods}</span></Td>
                  <Td right><span className="font-semibold text-amber-600 dark:text-amber-400">{a.totalPending}</span></Td>
                  <Td>
                    {a.totalPending >= 10 ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">URGENT</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">NORMAL</span>
                    )}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {data.length > 20 && (
        <div className="px-6 py-3 border-t border-[#CACAC4] dark:border-white/[0.06] flex items-center justify-between text-sm">
          <span className="text-[#6B6B6F] dark:text-[#9E9EA3]">Affichage de {displayed.length} / {data.length}</span>
          <button onClick={() => setShowAll((v) => !v)} className="flex items-center gap-1.5 text-[#0D0D0D] dark:text-white font-medium hover:text-[#FFD600] transition-colors">
            {showAll ? <>Réduire <ChevronUp size={14} /></> : <>Tout afficher ({data.length}) <ChevronDown size={14} /></>}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── H. Anomalies — timesheets rejetés ───────────────────────────────────────

function AnomaliesSection({ data }: { data: AnomalyEntry[] }) {
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? data : data.slice(0, 20);

  return (
    <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-[#CACAC4] dark:border-white/[0.06]">
        <Activity size={18} className="text-red-500" />
        <h2 className="text-base font-semibold text-[#0D0D0D] dark:text-white">Timesheets rejetés</h2>
      </div>
      <div className="px-6 py-3 bg-[#E2E2DC]/40 dark:bg-[#1A1A1E]/40 border-b border-[#CACAC4] dark:border-white/[0.06] text-sm">
        <span className="text-[#6B6B6F] dark:text-[#9E9EA3]">
          Total rejetés : <span className="font-bold text-red-600 dark:text-red-400">{data.length}</span>
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#E2E2DC]/60 dark:bg-white/[0.03]">
            <tr>
              <Th>Collaborateur</Th>
              <Th>Projet</Th>
              <Th>Date</Th>
              <Th right>Heures</Th>
              <Th>Statut</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#CACAC4]/40 dark:divide-white/[0.04]">
            {displayed.length === 0 ? (
              <EmptyRow cols={5} label="Aucun timesheet rejeté" />
            ) : (
              displayed.map((a) => (
                <tr key={a._id} className="hover:bg-[#E2E2DC]/30 dark:hover:bg-white/[0.02]">
                  <Td>{a.expertName}</Td>
                  <Td>{a.projectName}</Td>
                  <Td>{new Date(a.date).toLocaleDateString("fr-TN")}</Td>
                  <Td right>{fmt(a.hours, 1)}h</Td>
                  <Td>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                      Rejeté
                    </span>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {data.length > 20 && (
        <div className="px-6 py-3 border-t border-[#CACAC4] dark:border-white/[0.06] flex items-center justify-between text-sm">
          <span className="text-[#6B6B6F] dark:text-[#9E9EA3]">Affichage de {displayed.length} / {data.length}</span>
          <button onClick={() => setShowAll((v) => !v)} className="flex items-center gap-1.5 text-[#0D0D0D] dark:text-white font-medium hover:text-[#FFD600] transition-colors">
            {showAll ? <>Réduire <ChevronUp size={14} /></> : <>Tout afficher ({data.length}) <ChevronDown size={14} /></>}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-40 rounded-xl bg-[#E2E2DC] dark:bg-white/[0.04]" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-[#E2E2DC] dark:bg-white/[0.04]" />)}
      </div>
      {[...Array(4)].map((_, i) => <div key={i} className="h-48 rounded-xl bg-[#E2E2DC] dark:bg-white/[0.04]" />)}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Overview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      // Rebuild hoursConsumed/costConsumed from TimeEntries & BillingEntries first
      await api.post("/projects/repair-data").catch(() => {/* non-blocking */});
      const { data } = await api.get<DashboardStats>("/dashboard/stats");
      setStats(data);
      setLastUpdated(new Date());
      setError(null);
    } catch {
      setError("Impossible de charger les données du tableau de bord.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!stats) return <Skeleton />;

  return (
    <div className="space-y-6 stagger-children">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#0D0D0D] dark:text-white">Vue d'ensemble</h1>
          {lastUpdated && (
            <p className="text-xs text-[#9E9EA3] mt-0.5">
              Mis à jour à {lastUpdated.toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          )}
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#CACAC4] dark:border-white/[0.06] text-sm font-semibold text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#E2E2DC] dark:hover:bg-white/[0.04] transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Actualisation…" : "Actualiser"}
        </button>
      </div>
      <ProjectPaceChecker />
      <KpiRow stats={stats} />
      <Top10RentableTable data={stats.top10Rentable} />
      <Top10DepTable data={stats.top10Depassement} />
      <HeuresCollabTable data={stats.heuresCollab} />
      <RentManagerCards data={stats.rentByManager} />
      <AlertesSection data={stats.pendingAlerts} />
      <AnomaliesSection data={stats.anomalies} />
    </div>
  );
}
