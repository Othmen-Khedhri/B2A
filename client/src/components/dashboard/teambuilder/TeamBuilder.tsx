import { useEffect, useState } from "react";
import {
  Users, Search, CheckCircle2, Circle, Banknote,
  FolderOpen, Sparkles, ChevronDown, X,
} from "lucide-react";
import { PROJECT_TYPES } from "../estimation/historicalData";
import api from "../../../services/api";

/* ── Types ────────────────────────────────────────────────────────────────── */

interface Collaborator {
  _id: string;
  name: string;
  level: "Junior" | "Mid" | "Senior" | "Partner";
  coutHoraire: number;
  hasExperience: boolean;
  experienceCount: number;
}

/* ── Constants ───────────────────────────────────────────────────────────── */

const LEVEL_COLORS: Record<string, { badge: string; dot: string }> = {
  Junior:  { badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",         dot: "bg-sky-400" },
  Mid:     { badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", dot: "bg-violet-400" },
  Senior:  { badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",   dot: "bg-amber-400" },
  Partner: { badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", dot: "bg-orange-400" },
};

/* ── Sub-components ──────────────────────────────────────────────────────── */

const StatCard = ({
  label, value, sub, accent,
}: { label: string; value: string | number; sub?: string; accent?: boolean }) => (
  <div className={`rounded-xl border p-4 flex flex-col gap-1 ${
    accent
      ? "bg-[#FFD600]/10 border-[#FFD600]/30"
      : "bg-white dark:bg-[#2A2A2E] border-[#CACAC4] dark:border-white/[0.06]"
  }`}>
    <p className="text-[10px] font-bold text-[#9E9EA3] uppercase tracking-wider">{label}</p>
    <p className={`text-2xl font-black tracking-tight ${accent ? "text-[#0D0D0D] dark:text-white" : "text-[#0D0D0D] dark:text-white"}`}>{value}</p>
    {sub && <p className="text-[10px] text-[#9E9EA3]">{sub}</p>}
  </div>
);

/* ── Main ────────────────────────────────────────────────────────────────── */

const TeamBuilder = () => {
  const [projectType, setProjectType] = useState(PROJECT_TYPES[0]);
  const [typeOpen, setTypeOpen]       = useState(false);

  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading]             = useState(false);

  const [search, setSearch]           = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("All");
  const [filterExp, setFilterExp]     = useState<"all" | "experienced" | "new">("all");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /* fetch on type change */
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setSelectedIds(new Set());
      try {
        const { data } = await api.get<Collaborator[]>(
          `/estimations/collaborators-context?projectType=${encodeURIComponent(projectType)}`
        );
        setCollaborators(data);
      } catch {
        setCollaborators([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [projectType]);

  const toggle = (id: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectedCollabs = collaborators.filter(c => selectedIds.has(c._id));

  /* stats */
  const avgRate = selectedCollabs.length > 0
    ? selectedCollabs.reduce((s, c) => s + c.coutHoraire, 0) / selectedCollabs.length
    : 0;
  const withExp    = selectedCollabs.filter(c => c.hasExperience).length;
  const withoutExp = selectedCollabs.length - withExp;

  const levelCounts = (arr: Collaborator[]) =>
    ["Junior", "Mid", "Senior", "Partner"].map(l => ({
      level: l,
      count: arr.filter(c => c.level === l).length,
    })).filter(x => x.count > 0);

  /* filtered list */
  const visible = collaborators.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterLevel !== "All" && c.level !== filterLevel) return false;
    if (filterExp === "experienced" && !c.hasExperience) return false;
    if (filterExp === "new" && c.hasExperience) return false;
    return true;
  });

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-[#0D0D0D] dark:bg-[#FFD600] flex items-center justify-center shadow-sm shrink-0">
          <Users className="w-5 h-5 text-white dark:text-[#0D0D0D]" />
        </div>
        <div>
          <h1 className="text-lg font-black text-[#0D0D0D] dark:text-white tracking-tight">Team Builder</h1>
          <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">
            Build a team based on hourly rate and project experience
          </p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FFD600]/10 text-[#0D0D0D] dark:text-white border border-[#FFD600]/30 shrink-0">
          <Sparkles className="w-3 h-3 text-[#FFD600]" />
          {collaborators.length} collaborators
        </span>
      </div>

      {/* Project type selector */}
      <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] p-5">
        <div className="flex items-center gap-2 mb-3">
          <FolderOpen className="w-3.5 h-3.5 text-[#9E9EA3]" />
          <p className="text-xs font-bold text-[#9E9EA3] uppercase tracking-wider">Mission Type</p>
        </div>
        <div className="relative w-72">
          <button
            onClick={() => setTypeOpen(o => !o)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-[#CACAC4] dark:border-white/[0.06] bg-[#E2E2DC] dark:bg-[#1A1A1D] text-sm font-semibold text-[#0D0D0D] dark:text-white"
          >
            <span>{projectType}</span>
            <ChevronDown className={`w-4 h-4 text-[#9E9EA3] transition-transform ${typeOpen ? "rotate-180" : ""}`} />
          </button>
          {typeOpen && (
            <div className="absolute top-full left-0 mt-1 w-full z-20 bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] shadow-lg overflow-hidden">
              {PROJECT_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => { setProjectType(t); setTypeOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    t === projectType
                      ? "bg-[#FFD600]/10 text-[#0D0D0D] dark:text-white font-semibold"
                      : "text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#E2E2DC] dark:hover:bg-white/[0.04]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main 2-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5">

        {/* LEFT: collaborator list */}
        <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] flex flex-col overflow-hidden">

          {/* Toolbar */}
          <div className="p-4 border-b border-[#CACAC4] dark:border-white/[0.06] space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9E9EA3]" />
              <input
                type="text"
                placeholder="Search by name…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#CACAC4] dark:border-white/[0.06] bg-[#E2E2DC] dark:bg-[#1A1A1D] text-[#0D0D0D] dark:text-white placeholder:text-[#9E9EA3] focus:outline-none"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {/* Level filter */}
              <div className="flex rounded-lg border border-[#CACAC4] dark:border-white/[0.06] overflow-hidden text-[10px] font-bold">
                {["All", "Junior", "Mid", "Senior", "Partner"].map(l => (
                  <button
                    key={l}
                    onClick={() => setFilterLevel(l)}
                    className={`px-2.5 py-1 transition-colors ${
                      filterLevel === l
                        ? "bg-[#0D0D0D] dark:bg-white text-white dark:text-[#0D0D0D]"
                        : "text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#E2E2DC] dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              {/* Experience filter */}
              <div className="flex rounded-lg border border-[#CACAC4] dark:border-white/[0.06] overflow-hidden text-[10px] font-bold">
                {(["all", "experienced", "new"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterExp(f)}
                    className={`px-2.5 py-1 transition-colors capitalize ${
                      filterExp === f
                        ? "bg-[#0D0D0D] dark:bg-white text-white dark:text-[#0D0D0D]"
                        : "text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#E2E2DC] dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    {f === "all" ? "All" : f === "experienced" ? "Has exp." : "New"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#CACAC4] dark:divide-white/[0.06]">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <span className="w-5 h-5 border-2 border-[#9E9EA3] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <Users className="w-8 h-8 text-[#CACAC4] dark:text-white/20" />
                <p className="text-sm text-[#9E9EA3]">No collaborators match your filters</p>
              </div>
            ) : visible.map(c => {
              const selected = selectedIds.has(c._id);
              const lc = LEVEL_COLORS[c.level] ?? LEVEL_COLORS.Junior;
              return (
                <button
                  key={c._id}
                  onClick={() => toggle(c._id)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${
                    selected
                      ? "bg-[#FFD600]/10"
                      : "hover:bg-[#E2E2DC] dark:hover:bg-white/[0.03]"
                  }`}
                >
                  {/* Check */}
                  {selected
                    ? <CheckCircle2 className="w-4 h-4 text-[#FFD600] shrink-0" />
                    : <Circle       className="w-4 h-4 text-[#CACAC4] dark:text-white/20 shrink-0" />
                  }

                  {/* Avatar initial */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${lc.badge}`}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + level */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0D0D0D] dark:text-white truncate">{c.name}</p>
                    <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${lc.badge}`}>
                      {c.level}
                    </span>
                  </div>

                  {/* Rate */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#0D0D0D] dark:text-white">
                      {c.coutHoraire > 0 ? `${c.coutHoraire} TND/h` : "—"}
                    </p>
                    <p className="text-[10px] text-[#9E9EA3]">hourly rate</p>
                  </div>

                  {/* Experience */}
                  <div className="shrink-0 w-20 text-right">
                    {c.hasExperience ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {c.experienceCount}× exp.
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#E2E2DC] dark:bg-white/[0.06] text-[#9E9EA3]">
                        new
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer count */}
          <div className="px-5 py-3 border-t border-[#CACAC4] dark:border-white/[0.06] text-[10px] text-[#9E9EA3]">
            Showing {visible.length} of {collaborators.length} collaborators
          </div>
        </div>

        {/* RIGHT: selected team panel */}
        <div className="space-y-4">

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Selected"
              value={selectedCollabs.length}
              sub="team members"
              accent
            />
            <StatCard
              label="Avg rate"
              value={avgRate > 0 ? `${avgRate.toFixed(1)}` : "—"}
              sub="TND / hour"
            />
            <StatCard
              label="With experience"
              value={withExp}
              sub={`on "${projectType}"`}
            />
            <StatCard
              label="First time"
              value={withoutExp}
              sub="on this type"
            />
          </div>

          {/* Level breakdown */}
          {selectedCollabs.length > 0 && (
            <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] p-4">
              <p className="text-[10px] font-bold text-[#9E9EA3] uppercase tracking-wider mb-3">Level breakdown</p>
              <div className="space-y-2">
                {levelCounts(selectedCollabs).map(({ level, count }) => {
                  const lc = LEVEL_COLORS[level] ?? LEVEL_COLORS.Junior;
                  const pct = Math.round((count / selectedCollabs.length) * 100);
                  return (
                    <div key={level}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${lc.badge}`}>{level}</span>
                        <span className="text-xs font-bold text-[#0D0D0D] dark:text-white">{count} <span className="text-[#9E9EA3] font-normal">({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#E2E2DC] dark:bg-white/[0.06] overflow-hidden">
                        <div className={`h-full rounded-full ${lc.dot}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Cost preview */}
          {selectedCollabs.length > 0 && avgRate > 0 && (
            <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Banknote className="w-3.5 h-3.5 text-[#9E9EA3]" />
                <p className="text-[10px] font-bold text-[#9E9EA3] uppercase tracking-wider">Cost preview</p>
              </div>
              <div className="space-y-2 text-xs">
                {[40, 80, 120, 160].map(h => (
                  <div key={h} className="flex items-center justify-between py-1.5 border-b border-[#E2E2DC] dark:border-white/[0.04] last:border-0">
                    <span className="text-[#6B6B6F] dark:text-[#9E9EA3]">{h}h project</span>
                    <span className="font-bold text-[#0D0D0D] dark:text-white">
                      {Math.round(h * avgRate * selectedCollabs.length).toLocaleString()} TND
                    </span>
                  </div>
                ))}
                <p className="text-[10px] text-[#9E9EA3] pt-1">
                  Total team cost = hours × avg rate × {selectedCollabs.length} members
                </p>
              </div>
            </div>
          )}

          {/* Selected list */}
          {selectedCollabs.length > 0 && (
            <div className="bg-white dark:bg-[#2A2A2E] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#CACAC4] dark:border-white/[0.06] flex items-center justify-between">
                <p className="text-xs font-bold text-[#0D0D0D] dark:text-white">Selected team</p>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-[10px] text-[#9E9EA3] hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear all
                </button>
              </div>
              <div className="divide-y divide-[#CACAC4] dark:divide-white/[0.06] max-h-64 overflow-y-auto">
                {selectedCollabs.map(c => {
                  const lc = LEVEL_COLORS[c.level] ?? LEVEL_COLORS.Junior;
                  return (
                    <div key={c._id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${lc.badge}`}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="flex-1 text-xs font-semibold text-[#0D0D0D] dark:text-white truncate">{c.name}</span>
                      {c.hasExperience && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 shrink-0">
                          exp.
                        </span>
                      )}
                      <span className="text-[10px] text-[#9E9EA3] shrink-0">
                        {c.coutHoraire > 0 ? `${c.coutHoraire}/h` : "—"}
                      </span>
                      <button
                        onClick={() => toggle(c._id)}
                        className="text-[#CACAC4] dark:text-white/20 hover:text-red-500 transition-colors shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {selectedCollabs.length === 0 && (
            <div className="bg-[#E2E2DC] dark:bg-[#1A1A1D] rounded-xl border border-[#CACAC4] dark:border-white/[0.06] flex flex-col items-center justify-center py-14 px-6 text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white dark:bg-[#2A2A2E] border border-[#CACAC4] dark:border-white/[0.06] flex items-center justify-center">
                <Users className="w-6 h-6 text-[#9E9EA3]" />
              </div>
              <p className="text-sm font-bold text-[#0D0D0D] dark:text-white">No team yet</p>
              <p className="text-xs text-[#9E9EA3] leading-relaxed">
                Click collaborators on the left to add them.<br />
                Green badges = experience on <span className="font-semibold text-[#0D0D0D] dark:text-white">{projectType}</span>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamBuilder;
