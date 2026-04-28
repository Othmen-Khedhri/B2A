import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Users, Clock, TrendingUp, TrendingDown,
  CheckCircle2, AlertTriangle, XCircle, Bell, RefreshCw,
  ChevronDown, ChevronUp, Calendar,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, TooltipProps,
} from "recharts";
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

interface TimesheetEntry {
  clientName: string;
  mission: string;
  prestation: string;
  date: string;
  hours: number;
  detail: string;
  collabName?: string;
}

interface ClientMonthData {
  month: number;
  consumed: number;
  collabs: string[];
  entries: TimesheetEntry[];
}

interface PaceMonth {
  month: number;
  monthName: string;
  internalHours: number;
  clientHours: number;
  consumed: number;
  internalGain: number;
  clientGain: number;
  paceRatio: number;
  cumulativeConsumed: number | null;
  cumulativeBilled: number | null;
  cumulativeSurplus: number | null;
  status: "good" | "warning" | "over";
  isPast: boolean;
  isCurrent: boolean;
  isFuture: boolean;
}

interface ProfitPrediction {
  projectedYearEnd: number;
  totalClientHours: number;
  surplusHours: number;
  surplusPct: number;
  surplusTND: number | null;
  isProfitable: boolean;
}

interface PaceData {
  clientName: string;
  year: number;
  internalHours: number;
  clientHours: number;
  avgPace: number;
  health: "green" | "yellow" | "red";
  ytdConsumed: number;
  ytdInternalGain: number;
  ytdClientGain: number;
  projectedYearEnd: number;
  totalBudgetHours: number;
  totalClientHours: number;
  profitPrediction: ProfitPrediction;
  totalCostConsumed: number;
  collabCosts: { name: string; hours: number; cost: number }[];
  months: PaceMonth[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 0) {
  return n.toLocaleString("fr-TN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function HealthDot({ health }: { health: "green" | "yellow" | "red" }) {
  const cls = health === "green" ? "bg-green-500" : health === "yellow" ? "bg-amber-500" : "bg-red-500";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${cls}`} />;
}

function StatusBadge({ status, size = "sm" }: { status: "good" | "warning" | "over"; size?: "sm" | "xs" }) {
  const map = {
    good:    { label: "Good",    cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
    warning: { label: "Warning", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
    over:    { label: "Over",    cls: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  };
  const { label, cls } = map[status];
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full font-semibold whitespace-nowrap ${size === "xs" ? "text-[10px]" : "text-xs"} ${cls}`}>
      {label}
    </span>
  );
}

// ─── Missions Tab ─────────────────────────────────────────────────────────────

function MissionsTab({ clientName, year }: { clientName: string; year: number }) {
  const [data, setData]         = useState<ClientMonthData[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const { toast }               = useToast();

  useEffect(() => {
    setLoading(true);
    api.get<ClientMonthData[]>(`/timesheets/client/${encodeURIComponent(clientName)}/${year}`)
      .then((r) => setData(r.data))
      .catch(() => toast("Failed to load timesheet data.", "error"))
      .finally(() => setLoading(false));
  }, [clientName, year, toast]);

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-6 h-6 border-4 border-[#CACAC4] border-t-[#FFD600] rounded-full animate-spin" />
    </div>
  );

  if (data.length === 0) return (
    <div className="flex flex-col items-center gap-3 py-16 text-[#9E9EA3]">
      <Clock className="w-10 h-10 opacity-30" />
      <p className="text-sm font-medium">No timesheet data found for this client</p>
    </div>
  );

  const allEntries = data.flatMap((m) => m.entries);
  const missionMap = new Map<string, TimesheetEntry[]>();
  for (const e of allEntries) {
    const key = e.mission || "General";
    if (!missionMap.has(key)) missionMap.set(key, []);
    missionMap.get(key)!.push(e);
  }

  return (
    <div className="space-y-4">
      {Array.from(missionMap.entries()).map(([mission, entries]) => {
        const totalHrs  = entries.reduce((s, e) => s + e.hours, 0);
        const collabSet = new Set(entries.map((e) => e.collabName || "Unknown"));
        const isOpen    = expanded === mission;

        return (
          <div key={mission} className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#FFD600]/5 transition"
              onClick={() => setExpanded(isOpen ? null : mission)}>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 rounded-xl bg-[#FFD600]/10 shrink-0">
                  <Clock className="w-4 h-4 text-[#FFD600]" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[#0D0D0D] dark:text-white text-sm truncate">{mission}</p>
                  <p className="text-xs text-[#9E9EA3] mt-0.5">
                    {Array.from(collabSet).join(", ")} · {entries.length} entries
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <p className="font-bold text-[#0D0D0D] dark:text-white">{fmt(totalHrs, 1)}h</p>
                  <p className="text-xs text-[#9E9EA3]">total</p>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-[#9E9EA3]" /> : <ChevronDown className="w-4 h-4 text-[#9E9EA3]" />}
              </div>
            </div>

            {isOpen && (
              <div className="border-t border-[#CACAC4] dark:border-white/[0.06] overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="bg-[#F2F2F2] dark:bg-[#1A1A1D]">
                      {["Collab","Date","Hours","Prestation","Detail"].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[#9E9EA3]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, i) => (
                      <tr key={i} className="border-t border-[#CACAC4]/40 dark:border-white/[0.04] hover:bg-[#FFD600]/5 transition">
                        <td className="px-4 py-2.5 text-[#0D0D0D] dark:text-white font-medium">{e.collabName || "—"}</td>
                        <td className="px-4 py-2.5 text-[#6B6B6F] dark:text-[#9E9EA3] whitespace-nowrap">
                          {new Date(e.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-[#0D0D0D] dark:text-white">{e.hours}h</td>
                        <td className="px-4 py-2.5 text-[#6B6B6F] dark:text-[#9E9EA3]">{e.prestation || "—"}</td>
                        <td className="px-4 py-2.5 text-[#6B6B6F] dark:text-[#9E9EA3] max-w-[200px] truncate">{e.detail || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Pace Index Tab ───────────────────────────────────────────────────────────

function PaceTab({ clientName, year }: { clientName: string; year: number }) {
  const [data, setData]     = useState<PaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { toast }             = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api.get<PaceData>(`/pace-index/${year}/${encodeURIComponent(clientName)}`)
      .then((r) => setData(r.data))
      .catch(() => toast("Failed to load pace data.", "error"))
      .finally(() => setLoading(false));
  }, [clientName, year, toast]);

  useEffect(() => { load(); }, [load]);

  const sendReminder = async () => {
    setSending(true);
    try {
      const { data: alertRes } = await api.post<{ recipients: string[] }>("/notifications/pace-alert", {
        clientName,
        year,
        avgPace:     data?.avgPace,
        ytdConsumed: data?.ytdConsumed,
        health:      data?.health,
      });
      toast(`Alert sent to: ${alertRes.recipients?.join(", ") ?? "responsible collabs"}`, "success");
    } catch {
      toast("Failed to send alert.", "error");
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-6 h-6 border-4 border-[#CACAC4] border-t-[#FFD600] rounded-full animate-spin" />
    </div>
  );

  if (!data) return null;

  const healthColor = data.health === "green" ? "text-green-600 dark:text-green-400" : data.health === "yellow" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
  const healthBg    = data.health === "green" ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : data.health === "yellow" ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className={`rounded-2xl border p-5 ${healthBg}`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <HealthDot health={data.health} />
            <div>
              <p className={`text-lg font-bold ${healthColor}`}>
                {data.health === "green" ? "On Track" : data.health === "yellow" ? "At Risk" : "Over Budget"}
              </p>
              <p className="text-xs text-[#9E9EA3]">Overall health for {year}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-6">
            {[
              { label: "Avg Pace",         value: `${(data.avgPace * 100).toFixed(0)}%`, cls: healthColor },
              { label: "YTD Consumed",     value: `${fmt(data.ytdConsumed, 1)}h`,        cls: "text-[#0D0D0D] dark:text-white" },
              { label: "YTD Client Gain",  value: `${data.ytdClientGain >= 0 ? "+" : ""}${fmt(data.ytdClientGain, 1)}h`, cls: data.ytdClientGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400" },
              { label: "Year-end proj.",   value: `${fmt(data.projectedYearEnd, 1)}h`,   cls: "text-[#0D0D0D] dark:text-white" },
            ].map(({ label, value, cls }) => (
              <div key={label} className="text-center">
                <p className="text-xs text-[#9E9EA3]">{label}</p>
                <p className={`font-bold text-lg ${cls}`}>{value}</p>
              </div>
            ))}
          </div>
          <button onClick={sendReminder} disabled={sending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0D0D0D] dark:bg-white text-white dark:text-[#0D0D0D] text-sm font-semibold hover:opacity-80 transition disabled:opacity-50">
            {sending ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Bell className="w-4 h-4" />}
            Send Reminder
          </button>
        </div>
      </div>

      {/* Profit prediction */}
      {data.profitPrediction && (() => {
        const pp = data.profitPrediction;
        const bg = pp.isProfitable
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
          : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
        const cls = pp.isProfitable ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
        return (
          <div className={`rounded-2xl border p-4 ${bg}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9E9EA3] mb-2">
              Year-end profit prediction — based on pace so far
            </p>
            <div className="flex flex-wrap gap-6 items-center">
              <div>
                <p className="text-xs text-[#9E9EA3]">Projected consumed</p>
                <p className={`font-bold text-lg ${cls}`}>{fmt(pp.projectedYearEnd, 1)}h</p>
              </div>
              <div>
                <p className="text-xs text-[#9E9EA3]">Billed to client</p>
                <p className="font-bold text-lg text-[#0D0D0D] dark:text-white">{fmt(pp.totalClientHours, 1)}h</p>
              </div>
              <div>
                <p className="text-xs text-[#9E9EA3]">Surplus hours</p>
                <p className={`font-bold text-lg ${cls}`}>
                  {pp.surplusHours >= 0 ? "+" : ""}{fmt(pp.surplusHours, 1)}h ({pp.surplusHours >= 0 ? "+" : ""}{pp.surplusPct.toFixed(1)}%)
                </p>
              </div>
              {pp.surplusTND !== null && (
                <div>
                  <p className="text-xs text-[#9E9EA3]">Est. financial impact</p>
                  <p className={`font-bold text-lg ${cls}`}>
                    {pp.surplusTND >= 0 ? "+" : ""}{pp.surplusTND.toLocaleString()} TND
                  </p>
                </div>
              )}
              <div className="ml-auto">
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                  pp.isProfitable
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                }`}>
                  {pp.isProfitable ? "Profitable" : "At a Loss"}
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Monthly timeline */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[#0D0D0D] dark:text-white uppercase tracking-wide">Monthly Breakdown</h3>
        {data.months.filter((m) => !m.isFuture).map((m) => {
          const clientPct   = m.clientHours   > 0 ? Math.min((m.consumed / m.clientHours)   * 100, 110) : 0;
          const internalPct = m.internalHours > 0 ? Math.min((m.consumed / m.internalHours) * 100, 110) : 0;
          const paceColor   = m.paceRatio > 1 ? "text-red-600 dark:text-red-400" : m.paceRatio > 0.85 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400";

          return (
            <div key={m.month}
              className={`bg-white dark:bg-[#2A2A2E] rounded-2xl border overflow-hidden ${
                m.isCurrent ? "border-[#FFD600] shadow-md" : "border-[#CACAC4] dark:border-white/[0.06]"
              }`}>
              <div className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#9E9EA3]" />
                    <span className="font-semibold text-[#0D0D0D] dark:text-white text-sm">{m.monthName}</span>
                    {m.isCurrent && <span className="text-[10px] font-bold bg-[#FFD600] text-[#0D0D0D] px-2 py-0.5 rounded-full">Current</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${paceColor}`}>
                      Pace {(m.paceRatio * 100).toFixed(0)}%
                    </span>
                    <StatusBadge status={m.status} size="xs" />
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  {[
                    { label: `vs Internal (${m.internalHours}h)`, pct: internalPct, gain: m.internalGain },
                    { label: `vs Client (${m.clientHours}h)`,     pct: clientPct,   gain: m.clientGain },
                  ].map(({ label, pct, gain }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#9E9EA3]">{label}</span>
                        <span className={`font-semibold ${gain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                          {gain >= 0 ? "+" : ""}{fmt(gain, 1)}h
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#F2F2F2] dark:bg-[#1A1A1D] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct > 100 ? "bg-red-500 dark:bg-red-600" : pct > 85 ? "bg-amber-400 dark:bg-amber-500" : "bg-green-500 dark:bg-green-600"}`}
                          style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Consumed",       value: `${fmt(m.consumed, 1)}h`,   cls: "text-[#0D0D0D] dark:text-white" },
                    { label: "Internal saved", value: `${m.internalGain >= 0 ? "+" : ""}${fmt(m.internalGain, 1)}h`, cls: m.internalGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500" },
                    { label: "Client gain",    value: `${m.clientGain >= 0 ? "+" : ""}${fmt(m.clientGain, 1)}h`,    cls: m.clientGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500" },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className="bg-[#F2F2F2] dark:bg-[#1A1A1D] rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-[#9E9EA3]">{label}</p>
                      <p className={`font-bold text-xs ${cls}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Cumulative running total */}
                {m.cumulativeSurplus !== null && (
                  <div className={`mt-3 flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border ${
                    m.cumulativeSurplus >= 0
                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
                      : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"
                  }`}>
                    <span>Running total (Jan → {m.monthName})</span>
                    <span>
                      {fmt(m.cumulativeConsumed!, 1)}h consumed &nbsp;·&nbsp; {fmt(m.cumulativeBilled!, 1)}h billed &nbsp;·&nbsp;
                      <span className="font-black">
                        {m.cumulativeSurplus >= 0 ? "+" : ""}{fmt(m.cumulativeSurplus, 1)}h
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Financial Tab ────────────────────────────────────────────────────────────

const COLLAB_COLORS = ["#FFD600","#0D0D0D","#6366f1","#10b981","#f59e0b","#ef4444","#3b82f6","#8b5cf6"];

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-[#2A2A2E] border border-[#CACAC4] dark:border-white/[0.08] rounded-xl px-3 py-2 shadow-lg text-xs">
      {label && <p className="font-bold text-[#0D0D0D] dark:text-white mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === "number" ? `${p.value.toLocaleString()}${String(p.name).includes("TND") ? " TND" : "h"}` : p.value}
        </p>
      ))}
    </div>
  );
}

function FinancialTab({ client, paceData }: { client: BudgetClient; paceData: PaceData | null }) {
  if (!paceData) return (
    <div className="flex flex-col items-center gap-3 py-16 text-[#9E9EA3]">
      <TrendingUp className="w-10 h-10 opacity-30" />
      <p className="text-sm">No financial data available</p>
    </div>
  );

  const elapsedMonths     = new Date().getMonth() + 1;
  const totalBilled       = client.clientHours * elapsedMonths;
  const totalConsumed     = paceData.ytdConsumed;
  const profitHours       = totalBilled - totalConsumed;
  const profitPct         = totalBilled > 0 ? (profitHours / totalBilled) * 100 : 0;
  const yearBilled        = client.clientHours * 12;
  const totalCostConsumed = paceData.totalCostConsumed;
  const costVsBudgetPct   = client.financialBudget > 0 ? (totalCostConsumed / client.financialBudget) * 100 : 0;

  // Chart data — monthly consumed vs billed
  const monthlyData = paceData.months
    .filter((m) => !m.isFuture)
    .map((m) => ({
      month:    m.monthName.slice(0, 3),
      Consumed: m.consumed,
      Billed:   m.clientHours,
      Surplus:  m.cumulativeSurplus ?? 0,
    }));

  // Pie data — collab cost share
  const pieData = paceData.collabCosts.map((c) => ({ name: c.name, value: c.cost }));

  return (
    <div className="space-y-5">

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Annual Budget",       value: `${fmt(client.financialBudget)} TND`, sub: "total contract value", cls: "text-[#0D0D0D] dark:text-white" },
          { label: "YTD Billed (hrs)",    value: `${fmt(totalBilled, 1)}h`,            sub: `${elapsedMonths}mo × ${client.clientHours}h`, cls: "text-[#0D0D0D] dark:text-white" },
          { label: "Cost Consumed (TND)", value: `${totalCostConsumed.toLocaleString()} TND`, sub: `${fmt(costVsBudgetPct, 1)}% of annual budget`, cls: costVsBudgetPct > 100 ? "text-red-600 dark:text-red-400" : "text-[#0D0D0D] dark:text-white" },
          { label: "YTD Profit (hrs)",    value: `${profitHours >= 0 ? "+" : ""}${fmt(profitHours, 1)}h`, sub: `${fmt(Math.abs(profitPct), 1)}% of billed`, cls: profitHours >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400" },
        ].map(({ label, value, sub, cls }) => (
          <div key={label} className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] p-5">
            <p className="text-xs text-[#9E9EA3] font-medium uppercase tracking-wide mb-2">{label}</p>
            <p className={`text-2xl font-bold ${cls}`}>{value}</p>
            <p className="text-xs text-[#9E9EA3] mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Bar chart — consumed vs billed per month */}
        <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] p-5">
          <p className="text-xs font-bold text-[#9E9EA3] uppercase tracking-wider mb-4">Monthly consumed vs billed (h)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E2DC" strokeOpacity={0.5} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9E9EA3" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9E9EA3" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Billed"   fill="#E2E2DC" radius={[4,4,0,0]} />
              <Bar dataKey="Consumed" fill="#FFD600" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Area chart — cumulative surplus */}
        <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] p-5">
          <p className="text-xs font-bold text-[#9E9EA3] uppercase tracking-wider mb-4">Cumulative surplus (h)</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="surplusGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="surplusGradRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E2DC" strokeOpacity={0.5} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9E9EA3" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9E9EA3" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone" dataKey="Surplus" name="Surplus"
                stroke={monthlyData.at(-1)?.Surplus ?? 0 >= 0 ? "#10b981" : "#ef4444"}
                fill={monthlyData.at(-1)?.Surplus ?? 0 >= 0 ? "url(#surplusGrad)" : "url(#surplusGradRed)"}
                strokeWidth={2} dot={{ r: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Collab cost donut + table */}
      {paceData.collabCosts.length > 0 && (
        <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] p-5">
          <p className="text-xs font-bold text-[#9E9EA3] uppercase tracking-wider mb-4">Cost consumed by collaborator</p>
          <div className="flex flex-col lg:flex-row items-center gap-6">

            {/* Donut */}
            <div className="shrink-0">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                    dataKey="value" paddingAngle={3}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLLAB_COLORS[i % COLLAB_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v.toLocaleString()} TND`, ""]} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend + table */}
            <div className="flex-1 w-full space-y-2">
              {paceData.collabCosts.map((c, i) => {
                const pct = totalCostConsumed > 0 ? (c.cost / totalCostConsumed) * 100 : 0;
                return (
                  <div key={c.name} className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLLAB_COLORS[i % COLLAB_COLORS.length] }} />
                    <span className="text-xs font-medium text-[#0D0D0D] dark:text-white flex-1 truncate">{c.name}</span>
                    <span className="text-xs text-[#9E9EA3] shrink-0">{fmt(c.hours, 1)}h</span>
                    <span className="text-xs font-bold text-[#0D0D0D] dark:text-white shrink-0 w-24 text-right">{c.cost.toLocaleString()} TND</span>
                    <span className="text-xs text-[#9E9EA3] shrink-0 w-10 text-right">{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-2 border-t border-[#CACAC4] dark:border-white/[0.06] text-xs font-bold text-[#0D0D0D] dark:text-white">
                <span>Total</span>
                <span>{totalCostConsumed.toLocaleString()} TND</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Year-end projection */}
      <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] p-5">
        <h3 className="text-sm font-bold text-[#0D0D0D] dark:text-white mb-4">Year-end Projection</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total client hrs (12mo)",   value: `${fmt(yearBilled)}h` },
            { label: "Projected year-end cons.",  value: `${fmt(paceData.projectedYearEnd, 1)}h` },
            { label: "Projected year-end gain",   value: `${yearBilled - paceData.projectedYearEnd >= 0 ? "+" : ""}${fmt(yearBilled - paceData.projectedYearEnd, 1)}h`, colored: true, positive: yearBilled - paceData.projectedYearEnd >= 0 },
            { label: "Internal vs client gap/mo", value: `${fmt(client.clientHours - client.internalHours, 1)}h` },
          ].map(({ label, value, colored, positive }) => (
            <div key={label}>
              <p className="text-xs text-[#9E9EA3] mb-1">{label}</p>
              <p className={`font-bold ${colored ? (positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400") : "text-[#0D0D0D] dark:text-white"}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "missions" | "pace" | "financial";

export default function ProjectDetail() {
  const { id }          = useParams<{ id: string }>();
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const { toast }       = useToast();

  const clientName = id ? decodeURIComponent(id) : "";
  const year       = Number(searchParams.get("year")) || new Date().getFullYear();

  const [client, setClient]     = useState<BudgetClient | null>(null);
  const [paceData, setPaceData] = useState<PaceData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<Tab>("missions");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [clientRes, paceRes] = await Promise.all([
        api.get<BudgetClient>(`/budget/${year}/${encodeURIComponent(clientName)}`),
        api.get<PaceData>(`/pace-index/${year}/${encodeURIComponent(clientName)}`).catch(() => ({ data: null })),
      ]);
      setClient(clientRes.data);
      setPaceData(paceRes.data);
    } catch {
      toast("Failed to load client data.", "error");
    } finally {
      setLoading(false);
    }
  }, [clientName, year, toast]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-4 border-[#CACAC4] border-t-[#FFD600] rounded-full animate-spin" />
    </div>
  );

  if (!client) return (
    <div className="flex flex-col items-center gap-3 py-20 text-[#9E9EA3]">
      <XCircle className="w-10 h-10 opacity-40" />
      <p className="text-sm font-medium">Client not found</p>
      <button onClick={() => navigate("/dashboard/projects")} className="text-sm text-[#FFD600] hover:underline">
        Back to projects
      </button>
    </div>
  );

  const health = paceData?.health ?? "green";

  const tabs: { key: Tab; label: string }[] = [
    { key: "missions",  label: "Missions" },
    { key: "pace",      label: "Pace Index" },
    { key: "financial", label: "Financial" },
  ];

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <button onClick={() => navigate("/dashboard/projects")}
            className="p-2 rounded-xl border border-[#CACAC4] dark:border-white/[0.06] text-[#9E9EA3] hover:text-[#0D0D0D] dark:hover:text-white hover:bg-[#F2F2F2] dark:hover:bg-white/[0.04] transition mt-0.5">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-[#0D0D0D] dark:text-white">{client.clientName}</h1>
              <HealthDot health={health} />
              <span className="text-sm text-[#9E9EA3]">{year}</span>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-[#9E9EA3]">
              {client.primaryCollab && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{client.primaryCollab}</span>}
              {client.secondaryCollab && <span>· {client.secondaryCollab}</span>}
            </div>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          {[
            { label: "Internal/mo", value: `${client.internalHours}h` },
            { label: "Client/mo",   value: `${client.clientHours}h` },
            { label: "Budget",      value: `${fmt(client.financialBudget)} TND` },
            ...(paceData ? [{ label: "YTD Gain", value: `${paceData.ytdClientGain >= 0 ? "+" : ""}${fmt(paceData.ytdClientGain, 1)}h`, colored: true, positive: paceData.ytdClientGain >= 0 }] : []),
          ].map(({ label, value, colored, positive }: { label: string; value: string; colored?: boolean; positive?: boolean }) => (
            <div key={label} className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] px-4 py-2.5 text-center">
              <p className="text-[10px] text-[#9E9EA3] uppercase tracking-wide">{label}</p>
              <p className={`font-bold ${colored ? (positive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400") : "text-[#0D0D0D] dark:text-white"}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#F2F2F2] dark:bg-[#1A1A1D] rounded-xl w-fit">
        {tabs.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key ? "bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white shadow-sm" : "text-[#9E9EA3] hover:text-[#0D0D0D] dark:hover:text-white"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "missions"  && <MissionsTab  clientName={clientName} year={year} />}
      {tab === "pace"      && <PaceTab      clientName={clientName} year={year} />}
      {tab === "financial" && <FinancialTab client={client} paceData={paceData} />}

      {/* Suppress unused import warnings */}
      {false && <><CheckCircle2 /><AlertTriangle /><TrendingDown /><RefreshCw /></>}
    </div>
  );
}
