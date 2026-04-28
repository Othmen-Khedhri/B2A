import { useState, useEffect, useCallback, useRef } from "react";
import {
  Grid3X3, Users, RefreshCw, Search, ChevronDown, UserCheck,
} from "lucide-react";
import api from "../../../services/api";
import { useToast } from "../../../context/ToastContext";
import { useLanguage } from "../../../context/LanguageContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimesheetEntry {
  clientName: string;
  mission: string;
  prestation: string;
  date: string;
  hours: number;
  detail: string;
}

interface Timesheet {
  _id: string;
  collabId: string;
  collabName: string;
  month: number;
  year: number;
  entries: TimesheetEntry[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CURRENT_YEAR  = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

function fmt(n: number, d = 1) {
  return n.toLocaleString("fr-TN", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const AVATAR_COLORS = [
  "bg-amber-400","bg-sky-400","bg-teal-400","bg-purple-400","bg-rose-400","bg-indigo-400",
];
function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function getMonthName(month: number, lang: string, format: "long" | "short" = "long"): string {
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-US", { month: format })
    .format(new Date(2024, month - 1, 1));
}

// ─── Custom Dropdown ──────────────────────────────────────────────────────────

function Dropdown<T extends string | number>({
  value, options, onChange,
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (v: T) => void;
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
              key={String(o.value)}
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

// Workload heatmap cell color
function cellColor(hours: number, maxHours: number): string {
  if (hours === 0) return "bg-[#F2F2F2] dark:bg-[#1A1A1D] text-transparent";
  const pct = hours / Math.max(maxHours, 1);
  if (pct >= 0.75) return "bg-[#FFD600] text-[#0D0D0D] font-bold";
  if (pct >= 0.5)  return "bg-amber-200 dark:bg-amber-800/60 text-amber-900 dark:text-amber-200";
  if (pct >= 0.25) return "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300";
  return "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400";
}

// ─── Matrix View ──────────────────────────────────────────────────────────────

function MatrixView({ sheets }: { sheets: Timesheet[] }) {
  const { t } = useLanguage();
  const collabs = Array.from(new Set(sheets.map((s) => s.collabName))).sort();
  const clients = Array.from(
    new Set(sheets.flatMap((s) => s.entries.map((e) => e.clientName)))
  ).filter(Boolean).sort();

  if (collabs.length === 0) return (
    <div className="flex flex-col items-center gap-3 py-12 text-[#9E9EA3]">
      <Grid3X3 className="w-10 h-10 opacity-30" />
      <p className="text-sm">{t("assign.no_ts_data")}</p>
    </div>
  );

  const matrix: Record<string, Record<string, number>> = {};
  const collabTotals: Record<string, number> = {};
  const clientTotals: Record<string, number> = {};

  for (const sheet of sheets) {
    if (!matrix[sheet.collabName]) matrix[sheet.collabName] = {};
    for (const e of sheet.entries) {
      if (!e.clientName) continue;
      matrix[sheet.collabName][e.clientName] = (matrix[sheet.collabName][e.clientName] || 0) + e.hours;
      collabTotals[sheet.collabName] = (collabTotals[sheet.collabName] || 0) + e.hours;
      clientTotals[e.clientName]     = (clientTotals[e.clientName] || 0) + e.hours;
    }
  }

  const maxHours = Math.max(...Object.values(collabTotals), 1);

  return (
    <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] overflow-x-auto">
      <table className="w-full text-xs" style={{ minWidth: `${(clients.length + 2) * 90}px` }}>
        <thead>
          <tr className="bg-[#F2F2F2] dark:bg-[#1A1A1D] border-b border-[#CACAC4] dark:border-white/[0.06]">
            <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-[#9E9EA3] sticky left-0 bg-[#F2F2F2] dark:bg-[#1A1A1D] z-10 min-w-[140px]">
              Collab
            </th>
            {clients.map((c) => (
              <th key={c} className="px-2 py-3 text-center font-semibold text-[#6B6B6F] dark:text-[#9E9EA3] max-w-[80px]">
                <span className="block truncate">{c}</span>
                <span className="block text-[10px] font-normal text-[#9E9EA3] mt-0.5">{fmt(clientTotals[c] || 0)}h</span>
              </th>
            ))}
            <th className="px-4 py-3 text-center font-bold text-[#0D0D0D] dark:text-white uppercase tracking-wide">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {collabs.map((collab) => {
            const total = collabTotals[collab] || 0;
            const loadPct = Math.min((total / 160) * 100, 100);
            return (
              <tr key={collab} className="border-b border-[#CACAC4]/40 dark:border-white/[0.04] hover:bg-[#FFD600]/5 transition">
                <td className="px-4 py-3 sticky left-0 bg-white dark:bg-[#2A2A2E] z-10">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full ${avatarColor(collab)} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                      {initials(collab)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#0D0D0D] dark:text-white truncate max-w-[90px]">{collab}</p>
                      <div className="h-1 bg-[#F2F2F2] dark:bg-[#1A1A1D] rounded-full mt-1 w-full overflow-hidden">
                        <div className={`h-full rounded-full ${loadPct > 90 ? "bg-red-500 dark:bg-red-600" : loadPct > 70 ? "bg-amber-400 dark:bg-amber-500" : "bg-green-500 dark:bg-green-600"}`}
                          style={{ width: `${loadPct}%` }} />
                      </div>
                    </div>
                  </div>
                </td>
                {clients.map((c) => {
                  const h = matrix[collab]?.[c] || 0;
                  return (
                    <td key={c} className="px-2 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded-lg text-xs font-semibold min-w-[40px] ${cellColor(h, maxHours)}`}>
                        {h > 0 ? `${fmt(h)}h` : "—"}
                      </span>
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-center">
                  <span className="font-bold text-[#0D0D0D] dark:text-white">{fmt(total)}h</span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-[#F2F2F2] dark:bg-[#1A1A1D] border-t border-[#CACAC4] dark:border-white/[0.06]">
            <td className="px-4 py-3 font-bold text-xs uppercase tracking-wide text-[#9E9EA3] sticky left-0 bg-[#F2F2F2] dark:bg-[#1A1A1D] z-10">
              Total
            </td>
            {clients.map((c) => (
              <td key={c} className="px-2 py-3 text-center font-bold text-[#0D0D0D] dark:text-white">
                {fmt(clientTotals[c] || 0)}h
              </td>
            ))}
            <td className="px-4 py-3 text-center font-bold text-[#FFD600]">
              {fmt(Object.values(collabTotals).reduce((a, b) => a + b, 0))}h
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Workload View ────────────────────────────────────────────────────────────

function WorkloadView({ sheets }: { sheets: Timesheet[] }) {
  const { t } = useLanguage();
  const collabMap = new Map<string, number>();
  for (const sheet of sheets) {
    const total = sheet.entries.reduce((s, e) => s + e.hours, 0);
    collabMap.set(sheet.collabName, (collabMap.get(sheet.collabName) || 0) + total);
  }

  const sorted = Array.from(collabMap.entries()).sort((a, b) => b[1] - a[1]);
  const maxHours = sorted[0]?.[1] || 160;

  if (sorted.length === 0) return (
    <div className="flex flex-col items-center gap-3 py-12 text-[#9E9EA3]">
      <Users className="w-10 h-10 opacity-30" />
      <p className="text-sm">{t("assign.no_data_period")}</p>
    </div>
  );

  return (
    <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] p-5 space-y-3">
      {sorted.map(([name, hours]) => {
        const pct = Math.min((hours / 160) * 100, 100);
        const barPct = (hours / maxHours) * 100;
        const isOver = hours > 160;
        return (
          <div key={name} className="flex items-center gap-4">
            <div className={`w-8 h-8 rounded-full ${avatarColor(name)} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
              {initials(name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-[#0D0D0D] dark:text-white truncate">{name}</span>
                <span className={`text-xs font-bold ml-2 ${isOver ? "text-red-600 dark:text-red-400" : "text-[#0D0D0D] dark:text-white"}`}>
                  {fmt(hours)}h {isOver && `(${t("assign.overloaded")})`}
                </span>
              </div>
              <div className="h-2 bg-[#F2F2F2] dark:bg-[#1A1A1D] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pct > 100 ? "bg-red-500 dark:bg-red-600" : pct > 80 ? "bg-amber-400 dark:bg-amber-500" : "bg-green-500 dark:bg-green-600"}`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
              <p className="text-[10px] text-[#9E9EA3] mt-0.5">{pct.toFixed(0)}% {t("assign.capacity")}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Heatmap View ─────────────────────────────────────────────────────────────

function HeatmapView({ year, collabSheets }: { year: number; collabSheets: Map<string, Map<number, number>> }) {
  const { t, lang } = useLanguage();
  const collabs = Array.from(collabSheets.keys()).sort();

  if (collabs.length === 0) return (
    <div className="flex flex-col items-center gap-3 py-12 text-[#9E9EA3]">
      <Grid3X3 className="w-10 h-10 opacity-30" />
      <p className="text-sm">{t("assign.no_data_available")}</p>
    </div>
  );

  const allValues = collabs.flatMap((c) => Array.from(collabSheets.get(c)!.values()));
  const maxVal = Math.max(...allValues, 1);

  return (
    <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] overflow-x-auto">
      <table className="w-full text-xs" style={{ minWidth: "800px" }}>
        <thead>
          <tr className="bg-[#F2F2F2] dark:bg-[#1A1A1D] border-b border-[#CACAC4] dark:border-white/[0.06]">
            <th className="px-4 py-3 text-left font-bold uppercase tracking-wide text-[#9E9EA3] sticky left-0 bg-[#F2F2F2] dark:bg-[#1A1A1D] z-10 min-w-[140px]">Collab</th>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <th key={m} className={`px-2 py-3 text-center font-semibold text-[#9E9EA3] ${m === CURRENT_MONTH && year === CURRENT_YEAR ? "text-[#FFD600]" : ""}`}>
                {getMonthName(m, lang, "short")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {collabs.map((collab) => (
            <tr key={collab} className="border-b border-[#CACAC4]/40 dark:border-white/[0.04]">
              <td className="px-4 py-3 sticky left-0 bg-white dark:bg-[#2A2A2E] z-10">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full ${avatarColor(collab)} flex items-center justify-center text-[10px] font-bold text-white`}>
                    {initials(collab)}
                  </div>
                  <span className="font-semibold text-[#0D0D0D] dark:text-white truncate max-w-[90px]">{collab}</span>
                </div>
              </td>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const h = collabSheets.get(collab)?.get(m) || 0;
                const intensity = h / maxVal;
                const bg = h === 0
                  ? "bg-[#F2F2F2] dark:bg-[#1A1A1D]"
                  : intensity >= 0.75 ? "bg-[#FFD600]"
                  : intensity >= 0.5  ? "bg-amber-300 dark:bg-amber-700"
                  : intensity >= 0.25 ? "bg-green-200 dark:bg-green-800"
                  : "bg-green-100 dark:bg-green-900/40";
                return (
                  <td key={m} className="px-1 py-2 text-center">
                    <div className={`mx-auto w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                      <span className={`text-[10px] font-bold ${h === 0 ? "text-transparent" : h >= maxVal * 0.75 ? "text-[#0D0D0D]" : "text-[#0D0D0D] dark:text-white"}`}>
                        {h > 0 ? `${Math.round(h)}h` : ""}
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Client color palette ─────────────────────────────────────────────────────

const CLIENT_PALETTE = [
  "#FFD600", "#3B82F6", "#10B981", "#8B5CF6",
  "#F97316", "#EC4899", "#14B8A6", "#EF4444",
];

function buildClientColors(clients: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  clients.forEach((c, i) => { map[c] = CLIENT_PALETTE[i % CLIENT_PALETTE.length]; });
  return map;
}

// ─── Collab Detail Card ───────────────────────────────────────────────────────

function CollabCard({ collab, sheets }: { collab: string; sheets: Timesheet[] }) {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);

  const collabSheets = sheets.filter((s) => s.collabName === collab);
  const allEntries   = collabSheets.flatMap((s) => s.entries);
  const totalHours   = allEntries.reduce((s, e) => s + e.hours, 0);

  const clientDist = new Map<string, number>();
  for (const e of allEntries) {
    clientDist.set(e.clientName, (clientDist.get(e.clientName) || 0) + e.hours);
  }

  const sortedClients = Array.from(clientDist.entries()).sort((a, b) => b[1] - a[1]);
  const clientColors  = buildClientColors(sortedClients.map(([c]) => c));

  const byDate = new Map<string, TimesheetEntry[]>();
  for (const e of allEntries) {
    const d = new Date(e.date).toISOString().split("T")[0];
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(e);
  }
  const sortedDates = Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b));

  const locale = lang === "fr" ? "fr-FR" : "en-GB";

  return (
    <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm overflow-hidden transition-shadow hover:shadow-md">

      {/* ── Header row ── */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none hover:bg-[#FFD600]/[0.04] dark:hover:bg-white/[0.02] transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-11 h-11 rounded-xl ${avatarColor(collab)} flex items-center justify-center font-bold text-white text-sm shrink-0`}>
            {initials(collab)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[#0D0D0D] dark:text-white truncate">{collab}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-[#9E9EA3]">{clientDist.size} clients</span>
              <span className="text-[#CACAC4] dark:text-white/20">·</span>
              <span className="text-xs text-[#9E9EA3]">{allEntries.length} entries</span>
              {/* Mini client dots */}
              <div className="flex items-center gap-0.5 ml-1">
                {sortedClients.slice(0, 5).map(([c]) => (
                  <span key={c} className="w-2 h-2 rounded-full" style={{ backgroundColor: clientColors[c] }} />
                ))}
                {sortedClients.length > 5 && (
                  <span className="text-[10px] text-[#9E9EA3] ml-0.5">+{sortedClients.length - 5}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Inline mini bar showing top 3 clients */}
          {!open && sortedClients.length > 0 && (
            <div className="hidden sm:flex items-center gap-1 w-32">
              <div className="flex-1 h-2 rounded-full overflow-hidden bg-[#F2F2F2] dark:bg-[#1A1A1D]">
                <div className="h-full flex rounded-full overflow-hidden">
                  {sortedClients.slice(0, 4).map(([c, h]) => (
                    <div
                      key={c}
                      style={{
                        width: `${(h / totalHours) * 100}%`,
                        backgroundColor: clientColors[c],
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="text-right">
            <p className="text-lg font-bold text-[#0D0D0D] dark:text-white tabular-nums">{fmt(totalHours)}h</p>
          </div>
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center bg-[#F2F2F2] dark:bg-[#1A1A1D] transition-transform ${open ? "rotate-180" : ""}`}>
            <ChevronDown className="w-4 h-4 text-[#9E9EA3]" />
          </div>
        </div>
      </div>

      {/* ── Expanded body ── */}
      {open && (
        <div className="border-t border-[#CACAC4] dark:border-white/[0.06]">
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[#CACAC4]/40 dark:divide-white/[0.04]">

            {/* Left panel — Hours by client */}
            <div className="p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#9E9EA3] mb-4">
                {t("assign.hours_by_client")}
              </p>
              <div className="space-y-3">
                {sortedClients.map(([c, h]) => {
                  const pct = (h / totalHours) * 100;
                  const color = clientColors[c];
                  return (
                    <div key={c}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-sm font-medium text-[#0D0D0D] dark:text-white truncate">{c}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <span className="text-sm font-bold tabular-nums text-[#0D0D0D] dark:text-white">{fmt(h)}h</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#F2F2F2] dark:bg-[#1A1A1D] text-[#6B6B6F] dark:text-[#9E9EA3] tabular-nums">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-[#F2F2F2] dark:bg-[#1A1A1D] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Stacked total bar */}
              {sortedClients.length > 1 && (
                <div className="mt-5 pt-4 border-t border-[#CACAC4]/40 dark:border-white/[0.04]">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#9E9EA3] mb-2">Distribution</p>
                  <div className="h-4 rounded-full overflow-hidden flex gap-px">
                    {sortedClients.map(([c, h]) => (
                      <div
                        key={c}
                        className="h-full first:rounded-l-full last:rounded-r-full"
                        style={{ width: `${(h / totalHours) * 100}%`, backgroundColor: clientColors[c] }}
                        title={`${c}: ${fmt(h)}h`}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                    {sortedClients.map(([c]) => (
                      <div key={c} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: clientColors[c] }} />
                        <span className="text-[10px] text-[#9E9EA3] truncate max-w-[100px]">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right panel — Daily log timeline */}
            <div className="p-5 max-h-[420px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:#CACAC4_transparent] dark:[scrollbar-color:#3A3A3E_transparent]">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#9E9EA3] mb-4">
                {t("assign.daily_log")}
              </p>
              <div className="relative">
                {/* Vertical timeline spine */}
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#CACAC4]/50 dark:bg-white/[0.07]" />

                <div className="space-y-5">
                  {sortedDates.map(([d, entries]) => {
                    const date = new Date(d + "T12:00:00");
                    const dayLabel = date.toLocaleDateString(locale, { weekday: "short", day: "2-digit", month: "short" });
                    const dayTotal = entries.reduce((s, e) => s + e.hours, 0);
                    return (
                      <div key={d} className="pl-6 relative">
                        {/* Timeline dot */}
                        <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-[#FFD600] border-2 border-white dark:border-[#2A2A2E] z-10 shadow-sm" />

                        {/* Date header */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#0D0D0D] dark:text-white capitalize">{dayLabel}</span>
                          <span className="text-xs font-semibold tabular-nums text-[#9E9EA3]">{fmt(dayTotal)}h</span>
                        </div>

                        {/* Entry pills */}
                        <div className="space-y-1.5">
                          {entries.map((e, i) => {
                            const color = clientColors[e.clientName] ?? "#FFD600";
                            return (
                              <div
                                key={i}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F8F8F6] dark:bg-[#1A1A1D] border border-[#EAEAE4] dark:border-white/[0.04] hover:border-[#CACAC4] dark:hover:border-white/[0.08] transition-colors"
                              >
                                <div className="w-1 h-5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                <span className="text-xs font-bold tabular-nums shrink-0" style={{ color }}>
                                  {e.hours}h
                                </span>
                                <span className="text-xs font-semibold text-[#0D0D0D] dark:text-white shrink-0 truncate max-w-[80px]">
                                  {e.clientName}
                                </span>
                                {(e.detail || e.prestation) && (
                                  <>
                                    <span className="text-[#CACAC4] dark:text-white/20 shrink-0">·</span>
                                    <span className="text-xs text-[#9E9EA3] truncate">{e.detail || e.prestation}</span>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Supervisors View ─────────────────────────────────────────────────────────

interface BudgetClient {
  _id: string;
  clientName: string;
  primaryCollab: string;
  secondaryCollab: string;
  internalHours: number;
  clientHours: number;
}

function SupervisorsView({ clients, search }: { clients: BudgetClient[]; search: string }) {
  const { t } = useLanguage();
  const filtered = clients.filter((c) =>
    !search ||
    c.clientName.toLowerCase().includes(search.toLowerCase()) ||
    c.primaryCollab.toLowerCase().includes(search.toLowerCase()) ||
    c.secondaryCollab.toLowerCase().includes(search.toLowerCase())
  );

  if (filtered.length === 0) return (
    <div className="flex flex-col items-center gap-3 py-16 text-[#9E9EA3]">
      <UserCheck className="w-10 h-10 opacity-30" />
      <p className="text-sm">{t("assign.no_supervisor_data")}</p>
    </div>
  );

  return (
    <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-[#CACAC4] dark:border-white/[0.06] bg-[#F2F2F2] dark:bg-[#1A1A1D]">
          <tr>
            {[t("assign.col_client"), t("assign.col_primary_sup"), t("assign.col_secondary_sup")].map((h) => (
              <th key={h} className="px-4 py-3 text-xs font-semibold text-[#6B6B6F] dark:text-[#9E9EA3] uppercase tracking-wide text-left">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#CACAC4]/40 dark:divide-white/[0.04]">
          {filtered.map((c) => (
            <tr key={c._id} className="hover:bg-[#F2F2F2] dark:hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-3.5">
                <span className="font-semibold text-[#0D0D0D] dark:text-white">{c.clientName}</span>
              </td>
              <td className="px-4 py-3.5 text-[#0D0D0D] dark:text-white">
                {c.primaryCollab || <span className="text-[#9E9EA3]">—</span>}
              </td>
              <td className="px-4 py-3.5 text-[#0D0D0D] dark:text-white">
                {c.secondaryCollab || <span className="text-[#9E9EA3]">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-3 border-t border-[#CACAC4]/40 dark:border-white/[0.04]">
        <p className="text-xs text-[#9E9EA3]">{filtered.length} client{filtered.length !== 1 ? "s" : ""}</p>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type ViewMode = "matrix" | "workload" | "heatmap" | "collabs" | "supervisors";

export default function Assignments() {
  const { toast } = useToast();
  const { t, lang } = useLanguage();

  const [year, setYear]   = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [search, setSearch] = useState("");
  const [view, setView]   = useState<ViewMode>("matrix");
  const [sheets, setSheets]       = useState<Timesheet[]>([]);
  const [allSheets, setAllSheets] = useState<Timesheet[]>([]);
  const [budgetClients, setBudgetClients] = useState<BudgetClient[]>([]);
  const [loading, setLoading]     = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<Timesheet[]>(`/timesheets/${year}/${month}`);
      setSheets(data);
    } catch {
      toast("Failed to load assignments.", "error");
    } finally {
      setLoading(false);
    }
  }, [year, month, toast]);

  const loadAllYear = useCallback(async () => {
    try {
      const results = await Promise.all(
        Array.from({ length: 12 }, (_, i) =>
          api.get<Timesheet[]>(`/timesheets/${year}/${i + 1}`).then((r) => r.data).catch(() => [] as Timesheet[])
        )
      );
      setAllSheets(results.flat());
    } catch { /* ignore */ }
  }, [year]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (view === "heatmap") loadAllYear(); }, [view, loadAllYear]);
  useEffect(() => {
    if (view === "supervisors")
      api.get<BudgetClient[]>(`/budget/${year}`)
        .then((r) => setBudgetClients(r.data))
        .catch(() => {});
  }, [view, year]);

  const collabHeatmap = new Map<string, Map<number, number>>();
  for (const sheet of allSheets) {
    if (!collabHeatmap.has(sheet.collabName)) collabHeatmap.set(sheet.collabName, new Map());
    const monthMap = collabHeatmap.get(sheet.collabName)!;
    const h = sheet.entries.reduce((s, e) => s + e.hours, 0);
    monthMap.set(sheet.month, (monthMap.get(sheet.month) || 0) + h);
  }

  const filteredSheets = sheets.filter((s) =>
    !search || s.collabName.toLowerCase().includes(search.toLowerCase())
  );

  const collabs = Array.from(new Set(filteredSheets.map((s) => s.collabName))).sort();
  const totalHours = sheets.reduce((s, sh) => s + sh.entries.reduce((a, e) => a + e.hours, 0), 0);
  const totalClients = new Set(sheets.flatMap((sh) => sh.entries.map((e) => e.clientName))).size;

  const views: { key: ViewMode; label: string }[] = [
    { key: "matrix",      label: t("assign.view_matrix") },
    { key: "workload",    label: t("assign.view_workload") },
    { key: "heatmap",     label: t("assign.view_heatmap") },
    { key: "collabs",     label: t("assign.view_collabs") },
    { key: "supervisors", label: t("assign.view_supervisors") },
  ];

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    label: getMonthName(i + 1, lang),
    value: i + 1,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#FFD600]/20">
            <Grid3X3 className="w-6 h-6 text-[#FFD600]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0D0D0D] dark:text-white">{t("assign.title")}</h1>
            <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">
              {getMonthName(month, lang)} {year} · {sheets.length} collabs · {fmt(totalHours)}h total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dropdown
            value={year}
            options={[CURRENT_YEAR - 1, CURRENT_YEAR].map((y) => ({ label: String(y), value: y }))}
            onChange={setYear}
          />
          <Dropdown
            value={month}
            options={monthOptions}
            onChange={setMonth}
          />
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#CACAC4] dark:border-white/[0.06] text-sm text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#F2F2F2] dark:hover:bg-white/[0.04] transition disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] p-4">
          <p className="text-xs text-[#9E9EA3] uppercase tracking-wide mb-1">{t("assign.collabs_active")}</p>
          <p className="text-2xl font-bold text-[#0D0D0D] dark:text-white">{sheets.length}</p>
        </div>
        <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] p-4">
          <p className="text-xs text-[#9E9EA3] uppercase tracking-wide mb-1">{t("assign.total_hours")}</p>
          <p className="text-2xl font-bold text-[#FFD600]">{fmt(totalHours)}h</p>
        </div>
        <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] p-4">
          <p className="text-xs text-[#9E9EA3] uppercase tracking-wide mb-1">{t("assign.clients_served")}</p>
          <p className="text-2xl font-bold text-[#0D0D0D] dark:text-white">{totalClients}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {view !== "heatmap" && (
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9EA3]" />
            <input type="text" placeholder={t("assign.search_ph")} value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white placeholder:text-[#9E9EA3] focus:outline-none focus:ring-2 focus:ring-[#FFD600]/50" />
          </div>
        )}
        <div className="flex gap-1 p-1 bg-[#F2F2F2] dark:bg-[#1A1A1D] rounded-xl">
          {views.map(({ key, label }) => (
            <button key={key} onClick={() => setView(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                view === key ? "bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white shadow-sm" : "text-[#9E9EA3] hover:text-[#0D0D0D] dark:hover:text-white"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-4 border-[#CACAC4] border-t-[#FFD600] rounded-full animate-spin" />
        </div>
      ) : view === "matrix" ? (
        <MatrixView sheets={filteredSheets} />
      ) : view === "workload" ? (
        <WorkloadView sheets={filteredSheets} />
      ) : view === "heatmap" ? (
        <HeatmapView year={year} collabSheets={collabHeatmap} />
      ) : view === "supervisors" ? (
        <SupervisorsView clients={budgetClients} search={search} />
      ) : (
        <div className="space-y-4">
          {collabs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-[#9E9EA3]">
              <Users className="w-10 h-10 opacity-30" />
              <p className="text-sm">{t("assign.no_data_period")}</p>
            </div>
          ) : (
            collabs.map((c) => (
              <CollabCard key={c} collab={c} sheets={filteredSheets} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
