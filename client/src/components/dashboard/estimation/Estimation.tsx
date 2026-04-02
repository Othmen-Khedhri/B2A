import { useState } from "react";
import {
  Brain, ChevronRight, TrendingUp, Banknote, FolderOpen,
  Sparkles, Users, Gauge, CalendarClock, Layers, Building2, Info,
} from "lucide-react";
import {
  HISTORICAL_PROJECTS, PROJECT_TYPES, CLIENT_SECTORS,
  COMPLEXITY_LEVELS, HOURLY_RATES,
} from "./historicalData";
import type { ComplexityLevel } from "./historicalData";

/* ── helpers ─────────────────────────────────────────────────────────────── */

const percentile = (arr: number[], p: number): number => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo));
};

const median = (arr: number[]) => percentile(arr, 50);

/* ── Core estimation engine ──────────────────────────────────────────────── */

interface EstimationResult {
  hoursMin: number;
  hoursLikely: number;
  hoursMax: number;
  costMin: number;
  costMax: number;
  avgMarginPct: number;
  overBudgetRate: number;
  confidence: "high" | "medium" | "low";
  matchLevel: "exact" | "type+complexity" | "type only";
  similarCount: number;
  similarProjects: {
    name: string; type: string; sector: string;
    actualHours: number; budgetHours: number; overBudget: boolean; rentPct: number;
  }[];
}

function runEstimation(
  projectType: string,
  sector: string,
  complexity: ComplexityLevel,
  juniorPct: number,
  midPct: number,
  seniorPct: number,
  hasDeadline: boolean,
): EstimationResult {
  // 1 — Try exact match: same type + sector + complexity
  let pool = HISTORICAL_PROJECTS.filter(
    p => p.type === projectType && p.sector === sector && p.complexity === complexity
  );
  let matchLevel: EstimationResult["matchLevel"] = "exact";

  // 2 — Relax sector if not enough
  if (pool.length < 3) {
    pool = HISTORICAL_PROJECTS.filter(
      p => p.type === projectType && p.complexity === complexity
    );
    matchLevel = "type+complexity";
  }

  // 3 — Relax complexity too
  if (pool.length < 3) {
    pool = HISTORICAL_PROJECTS.filter(p => p.type === projectType);
    matchLevel = "type only";
  }

  const hours = pool.map(p => p.hReal);
  const hoursMin    = percentile(hours, 10);
  const hoursLikely = median(hours);
  const hoursMax    = percentile(hours, 90);

  // Deadline risk buffer: +10% on max
  const maxWithBuffer = hasDeadline ? Math.round(hoursMax * 1.1) : hoursMax;

  // Weighted avg hourly rate from staff mix
  const avgRate =
    (juniorPct / 100) * HOURLY_RATES.Junior +
    (midPct    / 100) * HOURLY_RATES.Senior +  // mid mapped to Senior rate
    (seniorPct / 100) * HOURLY_RATES.Manager;

  const costMin = Math.round(hoursMin    * avgRate);
  const costMax = Math.round(maxWithBuffer * avgRate);

  const avgMarginPct = pool.length > 0
    ? Math.round(pool.reduce((s, p) => s + p.rentPct, 0) / pool.length * 10) / 10
    : 0;

  const overBudgetRate = pool.length > 0
    ? Math.round((pool.filter(p => p.overBudget).length / pool.length) * 100)
    : 0;

  const confidence: EstimationResult["confidence"] =
    pool.length >= 6 ? "high" :
    pool.length >= 3 ? "medium" : "low";

  // Show up to 5 most relevant similar projects
  const similarProjects = pool.slice(0, 5).map(p => ({
    name: p.client,
    type: p.type,
    sector: p.sector,
    actualHours: p.hReal,
    budgetHours: p.hBudget,
    overBudget: p.overBudget,
    rentPct: p.rentPct,
  }));

  return {
    hoursMin, hoursLikely, hoursMax: maxWithBuffer,
    costMin, costMax,
    avgMarginPct, overBudgetRate,
    confidence, matchLevel,
    similarCount: pool.length,
    similarProjects,
  };
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

const SectionLabel = ({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) => (
  <div className="flex items-center gap-2 mb-3">
    <Icon className="w-3.5 h-3.5 text-[#9E9EA3]" />
    <p className="text-xs font-bold text-[#9E9EA3] uppercase tracking-wider">{children}</p>
  </div>
);

const ConfidenceBadge = ({ level }: { level: "high" | "medium" | "low" }) => {
  const map = {
    high:   { label: "High confidence",   cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
    medium: { label: "Medium confidence", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
    low:    { label: "Low confidence",    cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${map[level].cls}`}>
      {map[level].label}
    </span>
  );
};

const ResultPanel = ({ result }: { result: EstimationResult }) => (
  <div className="space-y-4">

    {/* Match info banner */}
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FFD600]/10 border border-[#FFD600]/30 text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">
      <Info className="w-3.5 h-3.5 text-[#FFD600] shrink-0" />
      Based on <span className="font-bold text-[#0D0D0D] dark:text-white mx-1">{result.similarCount} completed projects</span>
      — match level: <span className="font-semibold ml-1">{result.matchLevel}</span>
    </div>

    {/* Hours */}
    <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#E2E2DC] dark:bg-white/[0.06] flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-[#6B6B6F] dark:text-[#9E9EA3]" />
          </div>
          <span className="font-bold text-[#0D0D0D] dark:text-white text-sm">Hours Estimate</span>
        </div>
        <ConfidenceBadge level={result.confidence} />
      </div>

      <div className="flex items-end gap-2 mb-4">
        <span className="text-4xl font-black text-[#0D0D0D] dark:text-white tracking-tight">{result.hoursMin}</span>
        <span className="text-2xl font-bold text-[#9E9EA3] mb-0.5">–</span>
        <span className="text-4xl font-black text-[#0D0D0D] dark:text-white tracking-tight">{result.hoursMax}</span>
        <span className="text-[#9E9EA3] mb-1.5 ml-1 text-sm">hours</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Optimistic",  value: result.hoursMin,    cls: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
          { label: "Most likely", value: result.hoursLikely, cls: "text-[#FFD600]",                          bg: "bg-[#FFD600]/10" },
          { label: "Pessimistic", value: result.hoursMax,    cls: "text-orange-600 dark:text-orange-400",   bg: "bg-orange-50 dark:bg-orange-900/20" },
        ].map(({ label, value, cls, bg }) => (
          <div key={label} className={`${bg} rounded-lg py-3 text-center`}>
            <p className={`text-xl font-black ${cls}`}>{value}h</p>
            <p className="text-xs text-[#9E9EA3] mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </div>

    {/* Cost + Profitability */}
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
            <Banknote className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <span className="font-bold text-[#0D0D0D] dark:text-white text-xs">Cost Estimate</span>
        </div>
        <p className="text-xl font-black text-[#0D0D0D] dark:text-white tracking-tight">
          {result.costMin.toLocaleString()} <span className="text-sm font-semibold text-[#9E9EA3]">–</span> {result.costMax.toLocaleString()}
        </p>
        <p className="text-xs text-[#9E9EA3] mt-1">TND (based on staff mix rates)</p>
      </div>

      <div className={`rounded-xl border p-4 ${
        result.overBudgetRate >= 50
          ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40"
          : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40"
      }`}>
        <p className="text-xs font-bold text-[#9E9EA3] uppercase tracking-wider mb-2">Overrun Risk</p>
        <p className={`text-2xl font-black ${result.overBudgetRate >= 50 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
          {result.overBudgetRate}%
        </p>
        <p className="text-xs text-[#9E9EA3] mt-1">
          of similar projects exceeded budget
        </p>
        <p className="text-xs font-semibold mt-1 text-[#6B6B6F] dark:text-[#9E9EA3]">
          Avg margin: <span className={result.avgMarginPct < 0 ? "text-red-500" : "text-emerald-500"}>{result.avgMarginPct}%</span>
        </p>
      </div>
    </div>

    {/* Similar projects table */}
    <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#CACAC4] dark:border-white/[0.06] flex items-center gap-2">
        <FolderOpen className="w-4 h-4 text-[#9E9EA3]" />
        <span className="text-sm font-semibold text-[#6B6B6F] dark:text-[#9E9EA3]">
          Similar completed projects
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#CACAC4] dark:border-white/[0.06] bg-[#E2E2DC] dark:bg-[#1A1A1D]">
            {["Client", "Sector", "Hours", "Margin", "Budget"].map(h => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-[#9E9EA3] uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.similarProjects.map((p, i) => (
            <tr key={i} className="border-b border-[#CACAC4] dark:border-white/[0.06] last:border-0 hover:bg-[#E2E2DC] dark:hover:bg-white/[0.03] transition-colors">
              <td className="px-4 py-2.5 font-semibold text-[#0D0D0D] dark:text-white max-w-[120px] truncate">{p.name}</td>
              <td className="px-4 py-2.5 text-[#6B6B6F] dark:text-[#9E9EA3] text-xs">{p.sector}</td>
              <td className="px-4 py-2.5 text-[#6B6B6F] dark:text-[#9E9EA3]">{p.actualHours}h</td>
              <td className="px-4 py-2.5">
                <span className={`font-semibold text-xs ${p.rentPct < 0 ? "text-red-500" : "text-emerald-500"}`}>
                  {p.rentPct > 0 ? "+" : ""}{p.rentPct}%
                </span>
              </td>
              <td className="px-4 py-2.5">
                <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                  p.overBudget
                    ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                }`}>
                  {p.overBudget ? "Over" : "On track"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

/* ── Main ────────────────────────────────────────────────────────────────── */

const Estimation = () => {
  const [projectType, setProjectType] = useState(PROJECT_TYPES[0]);
  const [sector, setSector]           = useState(CLIENT_SECTORS[0]);
  const [complexity, setComplexity]   = useState<ComplexityLevel>("Moyenne");
  const [juniorPct, setJuniorPct]     = useState(40);
  const [midPct, setMidPct]           = useState(40);
  const [hasDeadline, setHasDeadline] = useState(false);
  const [result, setResult]           = useState<EstimationResult | null>(null);
  const [loading, setLoading]         = useState(false);

  const seniorPct = Math.max(0, 100 - juniorPct - midPct);

  const handleJunior = (v: number) => { setJuniorPct(v); if (v + midPct > 100) setMidPct(100 - v); };
  const handleMid    = (v: number) => { setMidPct(v);    if (juniorPct + v > 100) setJuniorPct(100 - v); };

  const handleEstimate = () => {
    setLoading(true);
    // Small delay for UX feedback
    setTimeout(() => {
      setResult(runEstimation(projectType, sector, complexity, juniorPct, midPct, seniorPct, hasDeadline));
      setLoading(false);
    }, 400);
  };

  const complexityColors: Record<ComplexityLevel, string> = {
    Faible:   "bg-emerald-500 border-emerald-500 text-white",
    Moyenne:  "bg-amber-500 border-amber-500 text-white",
    Élevée:   "bg-orange-500 border-orange-500 text-white",
    Critique: "bg-red-500 border-red-500 text-white",
  };
  const inactiveBtn = "border-[#CACAC4] dark:border-white/[0.06] text-[#6B6B6F] dark:text-[#9E9EA3] hover:border-[#9E9EA3] dark:hover:border-white/20 bg-transparent";

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-[#0D0D0D] dark:bg-[#FFD600] flex items-center justify-center shadow-sm shrink-0">
          <Brain className="w-5 h-5 text-white dark:text-[#0D0D0D]" />
        </div>
        <div>
          <h1 className="text-lg font-black text-[#0D0D0D] dark:text-white tracking-tight">Budget Estimation</h1>
          <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">
            Based on {HISTORICAL_PROJECTS.length} completed projects — real data
          </p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 shrink-0">
          <Sparkles className="w-3 h-3" />
          Live — {HISTORICAL_PROJECTS.length} projects
        </span>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* LEFT: Parameters */}
        <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] p-6 space-y-6">

          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#9E9EA3]" />
            <h2 className="font-bold text-[#0D0D0D] dark:text-white text-sm tracking-tight">Project Parameters</h2>
          </div>

          {/* Project type */}
          <div>
            <SectionLabel icon={FolderOpen}>Mission Type</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              {PROJECT_TYPES.map(t => (
                <button key={t} onClick={() => { setProjectType(t); setResult(null); }}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all text-left ${
                    projectType === t
                      ? "bg-[#FFD600] border-[#FFD600] text-[#0D0D0D]"
                      : inactiveBtn
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Sector */}
          <div>
            <SectionLabel icon={Building2}>Client Sector</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {CLIENT_SECTORS.map(s => (
                <button key={s} onClick={() => { setSector(s); setResult(null); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    sector === s
                      ? "bg-[#FFD600] border-[#FFD600] text-[#0D0D0D]"
                      : inactiveBtn
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Complexity */}
          <div>
            <SectionLabel icon={Gauge}>Complexity</SectionLabel>
            <div className="flex gap-2">
              {COMPLEXITY_LEVELS.map(c => (
                <button key={c} onClick={() => { setComplexity(c); setResult(null); }}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold border transition-all hover:opacity-90 ${
                    complexity === c ? complexityColors[c] : inactiveBtn
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Staff mix */}
          <div>
            <SectionLabel icon={Users}>Staff Mix</SectionLabel>
            <div className="space-y-4">
              {[
                { label: "Junior",  pct: juniorPct, onChange: handleJunior, color: "#FFD600", disabled: false },
                { label: "Senior",  pct: midPct,    onChange: handleMid,    color: "#9E9EA3", disabled: false },
                { label: "Manager", pct: seniorPct, onChange: () => {},     color: "#0D0D0D", disabled: true  },
              ].map(({ label, pct, onChange, color, disabled }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs font-semibold mb-1.5">
                    <span className="text-[#6B6B6F] dark:text-[#9E9EA3]">{label}</span>
                    <span className="text-[#0D0D0D] dark:text-white tabular-nums">{pct}%</span>
                  </div>
                  <div className="relative h-2 bg-[#E2E2DC] dark:bg-white/[0.06] rounded-full mb-2">
                    <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-200"
                      style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <input type="range" min={0} max={100} value={pct}
                    onChange={e => { onChange(Number(e.target.value)); setResult(null); }}
                    disabled={disabled}
                    style={{ accentColor: color }}
                    className="w-full h-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Deadline toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#E2E2DC] dark:bg-[#1A1A1D] border border-[#CACAC4] dark:border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#2A2A2E] flex items-center justify-center shadow-sm">
                <CalendarClock className="w-4 h-4 text-[#6B6B6F] dark:text-[#9E9EA3]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0D0D0D] dark:text-white">Strict deadline?</p>
                <p className="text-xs text-[#9E9EA3]">Adds a 10% buffer to pessimistic hours</p>
              </div>
            </div>
            <button
              onClick={() => { setHasDeadline(!hasDeadline); setResult(null); }}
              className={`w-11 h-6 rounded-full relative transition-colors duration-200 focus:outline-none ${
                hasDeadline ? "bg-[#FFD600]" : "bg-[#CACAC4] dark:bg-white/20"
              }`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
                hasDeadline ? "left-6" : "left-1"
              }`} />
            </button>
          </div>

          {/* Generate button */}
          <button
            onClick={handleEstimate}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#0D0D0D] dark:bg-white hover:bg-[#2A2A2E] dark:hover:bg-[#E2E2DC] text-white dark:text-[#0D0D0D] font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Brain className="w-4 h-4" />
                Generate Estimate
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* RIGHT: Result */}
        <div className="bg-[#E2E2DC] dark:bg-[#1A1A1D] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] min-h-[520px] overflow-auto">
          {result ? (
            <div className="p-5"><ResultPanel result={result} /></div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-10 py-20 space-y-4">
              <div className="w-14 h-14 rounded-xl bg-white dark:bg-[#2A2A2E] border border-[#CACAC4] dark:border-white/[0.06] flex items-center justify-center shadow-sm">
                <Brain className="w-7 h-7 text-[#9E9EA3]" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-[#0D0D0D] dark:text-white">Ready to estimate</p>
                <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3] leading-relaxed">
                  Select a mission type, sector and complexity,<br />then click{" "}
                  <span className="font-semibold text-[#0D0D0D] dark:text-white">Generate Estimate</span>
                </p>
              </div>
              <p className="text-xs text-[#9E9EA3]">
                Powered by {HISTORICAL_PROJECTS.length} real completed projects
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Estimation;
