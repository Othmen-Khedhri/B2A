import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp, TrendingDown, Users,
  AlertTriangle, BarChart2, Activity, ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react";
import api from "../../../services/api";
import { useLanguage } from "../../../context/LanguageContext";

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

interface ClientSummary {
  clientName: string;
  primaryCollab: string;
  secondaryCollab: string;
  internalHours: number;
  clientHours: number;
  financialBudget: number;
  totalConsumed: number;
  ytdClientGain: number;
  avgPace: number;
  health: "green" | "yellow" | "red";
}

interface SupervisorStats {
  supervisor: string;
  nbClients: number;
  totalClientHours: number;
  totalConsumed: number;
  totalYtdGain: number;
  clientsDepassement: number;
  avgPace: number;
  tauxDep: number;
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
  top10Rentable: ClientSummary[];
  top10Depassement: ClientSummary[];
  rentByManager: SupervisorStats[];
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 0) {
  return n.toLocaleString("fr-TN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}


function EmptyRow({ cols, label }: { cols: number; label?: string }) {
  const { t } = useLanguage();
  return (
    <tr>
      <td colSpan={cols} className="px-3 py-8 text-center text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">
        {label ?? t("overview.no_data")}
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
  const { t } = useLanguage();
  const overPct = stats.totalProjects > 0 ? Math.round((stats.overBudgetProjects / stats.totalProjects) * 100) : 0;
  const totalYtdGain = stats.top10Rentable.reduce((s, c) => s + c.ytdClientGain, 0);
  const totalDepLoss = stats.top10Depassement.reduce((s, c) => s + c.ytdClientGain, 0);

  return (
    <div className="stagger-children grid grid-cols-2 lg:grid-cols-3 gap-4">
<KpiCard
        icon={<Users size={20} className="text-blue-500" />}
        label={t("overview.kpi_active_collabs")}
        value={String(stats.totalStaff)}
        sub={stats.burnoutRiskCount > 0 ? `${stats.burnoutRiskCount} ${t("overview.kpi_burnout_sub")}` : undefined}
        borderClass="border-l-blue-500"
      />
      <KpiCard
        icon={<TrendingUp size={20} className="text-green-500" />}
        label={t("overview.kpi_ytd_gain")}
        value={`${totalYtdGain >= 0 ? "+" : ""}${fmt(totalYtdGain, 1)}h`}
        accentClass={totalYtdGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}
        borderClass="border-l-green-500"
      />
      <KpiCard
        icon={<TrendingDown size={20} className="text-red-500" />}
        label={t("overview.kpi_dep_loss")}
        value={`${fmt(totalDepLoss, 1)}h`}
        accentClass="text-red-600 dark:text-red-400"
        borderClass="border-l-red-500"
      />
    </div>
  );
}

// ─── C. Top 10 Rentables ──────────────────────────────────────────────────────

function Top10RentableTable({ data }: { data: ClientSummary[] }) {
  const { t } = useLanguage();
  return (
    <SectionCard icon={<TrendingUp size={18} className="text-green-500" />} title={t("overview.top10_rentable")}>
      <table className="w-full">
        <thead className="bg-[#E2E2DC]/60 dark:bg-white/[0.03]">
          <tr>
            <Th>{t("overview.col_rank")}</Th>
            <Th>Client</Th>
            <Th>{t("overview.col_supervisor")}</Th>
            <Th right>{t("overview.col_client_h_yr")}</Th>
            <Th right>{t("overview.col_consumed_ytd")}</Th>
            <Th right>{t("overview.col_gain_ytd")}</Th>
            <Th right>{t("overview.col_avg_pace")}</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#CACAC4]/40 dark:divide-white/[0.04]">
          {data.length === 0 ? (
            <EmptyRow cols={7} />
          ) : (
            data.map((r, i) => (
              <tr key={r.clientName} className="hover:bg-[#E2E2DC]/30 dark:hover:bg-white/[0.02]">
                <Td><span className="font-bold text-[#FFD600]">#{i + 1}</span></Td>
                <Td><span className="font-medium">{r.clientName}</span></Td>
                <Td>{r.primaryCollab || "—"}</Td>
                <Td right>{r.clientHours * 12}h</Td>
                <Td right>{fmt(r.totalConsumed, 1)}h</Td>
                <Td right>
                  <span className={r.ytdClientGain >= 0 ? "text-green-600 dark:text-green-400 font-semibold" : "text-red-600 dark:text-red-400 font-semibold"}>
                    {r.ytdClientGain >= 0 ? "+" : ""}{fmt(r.ytdClientGain, 1)}h
                  </span>
                </Td>
                <Td right>
                  <span className={r.avgPace > 1 ? "text-red-600 dark:text-red-400" : r.avgPace > 0.85 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}>
                    {(r.avgPace * 100).toFixed(0)}%
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

// ─── D. Top 10 Dépassement ────────────────────────────────────────────────────

function Top10DepTable({ data }: { data: ClientSummary[] }) {
  const { t } = useLanguage();
  return (
    <SectionCard icon={<TrendingDown size={18} className="text-red-500" />} title={t("overview.top10_dep")}>
      <table className="w-full">
        <thead className="bg-[#E2E2DC]/60 dark:bg-white/[0.03]">
          <tr>
            <Th>{t("overview.col_rank")}</Th>
            <Th>Client</Th>
            <Th>{t("overview.col_supervisor")}</Th>
            <Th right>{t("overview.col_client_h_mo")}</Th>
            <Th right>{t("overview.col_consumed_ytd")}</Th>
            <Th right>{t("overview.col_overrun")}</Th>
            <Th right>{t("overview.col_avg_pace")}</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#CACAC4]/40 dark:divide-white/[0.04]">
          {data.length === 0 ? (
            <EmptyRow cols={7} />
          ) : (
            data.map((r, i) => {
              const ecart = r.ytdClientGain;
              return (
                <tr key={r.clientName} className="hover:bg-[#E2E2DC]/30 dark:hover:bg-white/[0.02]">
                  <Td><span className="font-bold text-red-500">#{i + 1}</span></Td>
                  <Td><span className="font-medium">{r.clientName}</span></Td>
                  <Td>{r.primaryCollab || "—"}</Td>
                  <Td right>{r.clientHours}h</Td>
                  <Td right>{fmt(r.totalConsumed, 1)}h</Td>
                  <Td right>
                    <span className="text-red-600 dark:text-red-400 font-semibold">
                      {ecart >= 0 ? "+" : ""}{fmt(ecart, 1)}h
                    </span>
                  </Td>
                  <Td right>
                    <span className={r.avgPace > 1 ? "text-red-600 dark:text-red-400 font-semibold" : "text-amber-600 dark:text-amber-400 font-semibold"}>
                      {(r.avgPace * 100).toFixed(0)}%
                    </span>
                  </Td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </SectionCard>
  );
}


// ─── F. Rentabilité par manager ───────────────────────────────────────────────

function RentManagerCards({ data }: { data: SupervisorStats[] }) {
  const { t } = useLanguage();
  return (
    <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5 border-b border-[#CACAC4] dark:border-white/[0.06] pb-4">
        <BarChart2 size={18} className="text-[#FFD600]" />
        <h2 className="text-base font-semibold text-[#0D0D0D] dark:text-white">{t("overview.rent_manager_title")}</h2>
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3] text-center py-6">{t("overview.no_data")}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data.map((m) => {
            const gainPositive = m.totalYtdGain >= 0;
            return (
              <div key={m.supervisor} className="rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-[#F2F2F2]/60 dark:bg-[#1A1A1D]/60 p-4 space-y-3">
                <p className="font-semibold text-sm text-[#0D0D0D] dark:text-white truncate">{m.supervisor}</p>

                <div className="text-center">
                  <p className={`text-2xl font-bold ${gainPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {gainPositive ? "+" : ""}{fmt(m.totalYtdGain, 1)}h
                  </p>
                  <p className="text-xs text-[#9E9EA3]">{t("overview.ytd_gain_total")}</p>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-[#9E9EA3] mb-1">
                    <span>{t("overview.col_avg_pace")}</span>
                    <span className={m.avgPace > 1 ? "text-red-500" : m.avgPace > 0.85 ? "text-amber-500" : "text-green-500"}>
                      {(m.avgPace * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#E2E2DC] dark:bg-[#2A2A2E] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${m.avgPace > 1 ? "bg-red-500 dark:bg-red-600" : m.avgPace > 0.85 ? "bg-amber-400 dark:bg-amber-500" : "bg-green-500 dark:bg-green-600"}`}
                      style={{ width: `${Math.min(m.avgPace * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs">
                  <div>
                    <p className="text-[#9E9EA3]">Clients</p>
                    <p className="font-semibold text-[#0D0D0D] dark:text-white">{m.nbClients}</p>
                  </div>
                  <div>
                    <p className="text-[#9E9EA3]">{t("overview.clients_overrun")}</p>
                    <p className={`font-semibold ${m.clientsDepassement > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                      {m.clientsDepassement}/{m.nbClients}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#9E9EA3]">{t("overview.col_consumed_ytd")}</p>
                    <p className="font-medium text-[#0D0D0D] dark:text-white">{fmt(m.totalConsumed, 0)}h</p>
                  </div>
                  <div>
                    <p className="text-[#9E9EA3]">{t("overview.overrun_rate")}</p>
                    <p className={`font-medium ${m.tauxDep > 0 ? "text-amber-600 dark:text-amber-400" : "text-[#0D0D0D] dark:text-white"}`}>
                      {m.tauxDep}%
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
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

// ─── Annual Budget Panel ──────────────────────────────────────────────────────

interface BudgetStats {
  year: number;
  totalClients: number;
  totalInternalBudget: number;
  totalClientBudget: number;
  totalConsumedYTD: number;
  totalClientGainYTD: number;
  healthSummary: { green: number; yellow: number; red: number };
  currentMonth: {
    month: number;
    year: number;
    totalHours: number;
    submittedCount: number;
    totalCollabs: number;
    pendingTimesheets: string[];
  };
}

function BudgetStatsPanel() {
  const { t, lang } = useLanguage();
  const currentYear = new Date().getFullYear();
  const [data, setData] = useState<BudgetStats | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    api.get<BudgetStats>(`/dashboard/budget-stats/${currentYear}`)
      .then((r) => setData(r.data))
      .catch(() => { /* non-blocking */ });
  }, [currentYear]);

  if (!data) return null;

  const { healthSummary, currentMonth, totalConsumedYTD, totalClientGainYTD, totalClients } = data;
  const pendingCount = currentMonth.totalCollabs - currentMonth.submittedCount;
  const monthLabel = new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-US", { month: "long" })
    .format(new Date(2024, currentMonth.month - 1, 1));

  return (
    <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#CACAC4] dark:border-white/[0.06] cursor-pointer"
        onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#FFD600]" />
          <h2 className="text-sm font-bold text-[#0D0D0D] dark:text-white">{t("overview.annual_budget")} {currentYear}</h2>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-[#9E9EA3]" /> : <ChevronDown className="w-4 h-4 text-[#9E9EA3]" />}
      </div>
      {open && (
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#F2F2F2] dark:bg-[#1A1A1D] rounded-xl p-4">
              <p className="text-xs text-[#9E9EA3] uppercase tracking-wide mb-1">{t("overview.active_clients")}</p>
              <p className="text-2xl font-bold text-[#0D0D0D] dark:text-white">{totalClients}</p>
            </div>
            <div className="bg-[#F2F2F2] dark:bg-[#1A1A1D] rounded-xl p-4">
              <p className="text-xs text-[#9E9EA3] uppercase tracking-wide mb-1">{t("overview.ytd_consumed")}</p>
              <p className="text-2xl font-bold text-[#0D0D0D] dark:text-white">{fmt(totalConsumedYTD, 0)}h</p>
            </div>
            <div className="bg-[#F2F2F2] dark:bg-[#1A1A1D] rounded-xl p-4">
              <p className="text-xs text-[#9E9EA3] uppercase tracking-wide mb-1">{t("overview.ytd_client_gain")}</p>
              <p className={`text-2xl font-bold ${totalClientGainYTD >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {totalClientGainYTD >= 0 ? "+" : ""}{fmt(totalClientGainYTD, 0)}h
              </p>
            </div>
            <div className="bg-[#F2F2F2] dark:bg-[#1A1A1D] rounded-xl p-4">
              <p className="text-xs text-[#9E9EA3] uppercase tracking-wide mb-1">{t("overview.this_month_hours")}</p>
              <p className="text-2xl font-bold text-[#FFD600]">{fmt(currentMonth.totalHours, 0)}h</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#F2F2F2] dark:bg-[#1A1A1D] rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[#9E9EA3] mb-3">{t("overview.pace_health")}</p>
              <div className="flex gap-4">
                {[
                  { label: t("overview.on_track_badge"),    count: healthSummary.green,  cls: "text-green-600 dark:text-green-400" },
                  { label: t("overview.at_risk_badge"),     count: healthSummary.yellow, cls: "text-amber-600 dark:text-amber-400" },
                  { label: t("overview.over_budget_badge"), count: healthSummary.red,    cls: "text-red-600 dark:text-red-400" },
                ].map(({ label, count, cls }) => (
                  <div key={label} className="text-center flex-1">
                    <p className={`text-2xl font-bold ${cls}`}>{count}</p>
                    <p className="text-xs text-[#9E9EA3] mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#F2F2F2] dark:bg-[#1A1A1D] rounded-xl p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[#9E9EA3] mb-3">
                {monthLabel} — Timesheets
              </p>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-2 bg-white dark:bg-[#2A2A2E] rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${currentMonth.totalCollabs > 0 ? (currentMonth.submittedCount / currentMonth.totalCollabs) * 100 : 0}%` }} />
                </div>
                <span className="text-xs font-bold text-[#0D0D0D] dark:text-white">
                  {currentMonth.submittedCount}/{currentMonth.totalCollabs}
                </span>
              </div>
              {pendingCount > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  {pendingCount} {t("overview.pending_count")}: {currentMonth.pendingTimesheets.slice(0, 3).join(", ")}{currentMonth.pendingTimesheets.length > 3 ? "…" : ""}
                </p>
              )}
              {pendingCount === 0 && (
                <p className="text-xs text-green-600 dark:text-green-400 font-medium">{t("overview.all_submitted")}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Overview() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      await api.post("/projects/repair-data").catch(() => {/* non-blocking */});
      const { data } = await api.get<DashboardStats>("/dashboard/stats");
      setStats(data);
      setLastUpdated(new Date());
      setError(null);
    } catch {
      setError(t("overview.error_load"));
    } finally {
      setRefreshing(false);
    }
  }, [t]);

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
          <h1 className="text-xl font-bold text-[#0D0D0D] dark:text-white">{t("overview.page_title")}</h1>
          {lastUpdated && (
            <p className="text-xs text-[#9E9EA3] mt-0.5">
              {t("overview.updated_at")} {lastUpdated.toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
          )}
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#CACAC4] dark:border-white/[0.06] text-sm font-semibold text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#E2E2DC] dark:hover:bg-white/[0.04] transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? t("overview.refreshing") : t("overview.refresh")}
        </button>
      </div>
      <BudgetStatsPanel />
      <KpiRow stats={stats} />
      <Top10RentableTable data={stats.top10Rentable} />
      <Top10DepTable data={stats.top10Depassement} />
      <RentManagerCards data={stats.rentByManager} />
    </div>
  );
}
