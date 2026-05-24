import { useEffect, useState } from "react";
import {
  Users, Search, CheckCircle2, Circle, Banknote,
  Sparkles, X, Lightbulb, TrendingUp, TrendingDown,
  Clock, Zap, AlertTriangle,
} from "lucide-react";
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

const LEVEL_COLORS: Record<string, { badge: string; dot: string; solid: string }> = {
  Junior:  { badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",             dot: "bg-sky-400",    solid: "bg-sky-500" },
  Mid:     { badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400", dot: "bg-violet-400", solid: "bg-violet-500" },
  Senior:  { badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",     dot: "bg-amber-400",  solid: "bg-amber-500" },
  Partner: { badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", dot: "bg-orange-400", solid: "bg-orange-500" },
};

/* ── Main ────────────────────────────────────────────────────────────────── */

const TeamBuilder = () => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading]             = useState(false);

  const [search, setSearch]           = useState("");
  const [filterLevel, setFilterLevel] = useState<string>("All");
  const [filterExp, setFilterExp]     = useState<"all" | "experienced" | "new">("all");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [budget, setBudget]             = useState<string>("");
  const [missionHours, setMissionHours] = useState<string>("");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await api.get<Collaborator[]>("/estimations/collaborators-context");
        setCollaborators(data);
      } catch {
        setCollaborators([]);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const toggle = (id: string) =>
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectedCollabs  = collaborators.filter(c => selectedIds.has(c._id));
  const teamRatePerHour  = selectedCollabs.reduce((s, c) => s + c.coutHoraire, 0);

  const budgetNum    = parseFloat(budget) || 0;
  const hoursNum     = parseFloat(missionHours) || 0;
  const totalCost    = teamRatePerHour * hoursNum;
  const budgetDelta  = budgetNum - totalCost;
  const costPct      = budgetNum > 0 && totalCost > 0 ? Math.min((totalCost / budgetNum) * 100, 100) : 0;
  const isOver       = budgetNum > 0 && hoursNum > 0 && selectedCollabs.length > 0 && budgetDelta < 0;
  const isUnder      = budgetNum > 0 && hoursNum > 0 && selectedCollabs.length > 0 && budgetDelta >= 0;

  const suggestedLevel   = budgetNum > 0 && budgetNum < 1000 ? "Junior" : budgetNum >= 1000 ? "Senior" : null;
  const suggestedCollabs = suggestedLevel
    ? collaborators.filter(c => c.level === suggestedLevel && c.coutHoraire > 0)
    : [];

  const levelCounts = (arr: Collaborator[]) =>
    ["Junior", "Mid", "Senior", "Partner"]
      .map(l => ({ level: l, count: arr.filter(c => c.level === l).length }))
      .filter(x => x.count > 0);

  const visible = collaborators.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterLevel !== "All" && c.level !== filterLevel) return false;
    if (filterExp === "experienced" && !c.hasExperience) return false;
    if (filterExp === "new" && c.hasExperience) return false;
    return true;
  });

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#0D0D0D] dark:bg-[#FFD600] flex items-center justify-center shrink-0">
          <Users className="w-5 h-5 text-white dark:text-[#0D0D0D]" />
        </div>
        <div className="flex-1">
          <h1 className="text-lg font-black text-[#0D0D0D] dark:text-white tracking-tight">Team Builder</h1>
          <p className="text-xs text-[#9E9EA3]">Set a budget, get suggestions, build your team</p>
        </div>
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#FFD600]/10 text-[#0D0D0D] dark:text-white border border-[#FFD600]/30">
          <Sparkles className="w-3 h-3 text-[#FFD600]" />
          {collaborators.length} collaborators
        </span>
      </div>

      {/* ── Budget + Suggestion unified panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] overflow-hidden shadow-sm">

        {/* LEFT — inputs */}
        <div className="p-6 border-b lg:border-b-0 lg:border-r border-[#CACAC4] dark:border-white/[0.06]">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-6 h-6 rounded-md bg-[#0D0D0D] dark:bg-white/10 flex items-center justify-center">
              <Banknote className="w-3.5 h-3.5 text-white dark:text-[#9E9EA3]" />
            </div>
            <p className="text-xs font-bold text-[#0D0D0D] dark:text-white uppercase tracking-wider">Mission parameters</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-[#9E9EA3] uppercase tracking-wider mb-1.5">
                Total Budget
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#9E9EA3]">DT</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={budget}
                  onChange={e => setBudget(e.target.value)}
                  className="w-full pl-9 pr-3 py-3 text-sm font-semibold rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-[#F2F2F2] dark:bg-[#1A1A1D] text-[#0D0D0D] dark:text-white placeholder:text-[#CACAC4] dark:placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FFD600]/50"
                />
              </div>
              {budgetNum > 0 && (
                <p className="mt-1.5 text-[10px] text-[#9E9EA3]">
                  {budgetNum < 1000 ? "→ Juniors are recommended for this budget" : "→ Seniors are recommended for this budget"}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#9E9EA3] uppercase tracking-wider mb-1.5">
                Estimated Hours
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9E9EA3]" />
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={missionHours}
                  onChange={e => setMissionHours(e.target.value)}
                  className="w-full pl-9 pr-3 py-3 text-sm font-semibold rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-[#F2F2F2] dark:bg-[#1A1A1D] text-[#0D0D0D] dark:text-white placeholder:text-[#CACAC4] dark:placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FFD600]/50"
                />
              </div>
            </div>

            {/* Quick budget status when team is picked */}
            {selectedCollabs.length > 0 && hoursNum > 0 && budgetNum > 0 && (
              <div className={`rounded-xl p-3 flex items-center gap-3 ${
                isOver
                  ? "bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700/30"
                  : "bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-700/30"
              }`}>
                {isOver
                  ? <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  : <TrendingUp className="w-4 h-4 text-green-500 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold ${isOver ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>
                    {isOver
                      ? `${Math.abs(budgetDelta).toLocaleString()} DT over budget`
                      : `${budgetDelta.toLocaleString()} DT remaining`
                    }
                  </p>
                  <p className="text-[10px] text-[#9E9EA3]">
                    {totalCost.toLocaleString()} DT cost · {budgetNum.toLocaleString()} DT budget
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — suggestion */}
        <div className="p-6">
          {!suggestedLevel ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#F2F2F2] dark:bg-[#1A1A1D] border border-[#CACAC4] dark:border-white/[0.06] flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-[#CACAC4] dark:text-white/20" />
              </div>
              <p className="text-sm font-semibold text-[#0D0D0D] dark:text-white">No suggestion yet</p>
              <p className="text-xs text-[#9E9EA3] max-w-[200px] leading-relaxed">
                Enter a budget on the left to get a smart team recommendation
              </p>
            </div>
          ) : (
            <div className="h-full flex flex-col gap-4">
              {/* Suggestion header */}
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  suggestedLevel === "Junior" ? "bg-sky-100 dark:bg-sky-900/30" : "bg-amber-100 dark:bg-amber-900/30"
                }`}>
                  <Zap className={`w-3.5 h-3.5 ${suggestedLevel === "Junior" ? "text-sky-600 dark:text-sky-400" : "text-amber-600 dark:text-amber-400"}`} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0D0D0D] dark:text-white">
                    {suggestedLevel === "Junior" ? "Recommended: Juniors" : "Recommended: Seniors"}
                  </p>
                  <p className="text-[10px] text-[#9E9EA3]">
                    {suggestedCollabs.length} available · suggestion only
                  </p>
                </div>
                <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  suggestedLevel === "Junior"
                    ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                }`}>
                  {suggestedLevel}
                </span>
              </div>

              {/* Chips grid */}
              {suggestedCollabs.length === 0 ? (
                <p className="text-xs text-[#9E9EA3] italic">No {suggestedLevel} collaborators available.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestedCollabs.map(c => {
                    const sel = selectedIds.has(c._id);
                    return (
                      <button
                        key={c._id}
                        onClick={() => toggle(c._id)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all duration-150 ${
                          sel
                            ? "bg-[#FFD600] border-[#FFD600] shadow-sm"
                            : "bg-[#F2F2F2] dark:bg-[#1A1A1D] border-[#CACAC4] dark:border-white/[0.06] hover:border-[#FFD600]/50 hover:bg-[#FFD600]/5"
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          sel
                            ? "bg-black/10 text-[#0D0D0D]"
                            : suggestedLevel === "Junior"
                              ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold truncate ${sel ? "text-[#0D0D0D]" : "text-[#0D0D0D] dark:text-white"}`}>
                            {c.name}
                          </p>
                          <p className={`text-[10px] ${sel ? "text-[#0D0D0D]/60" : "text-[#9E9EA3]"}`}>
                            {c.coutHoraire} TND/h
                          </p>
                        </div>
                        {sel
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-[#0D0D0D]/50 shrink-0" />
                          : <Circle className="w-3.5 h-3.5 text-[#CACAC4] dark:text-white/20 shrink-0" />
                        }
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Main 2-col: full list + team summary ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

        {/* LEFT — full collaborator list */}
        <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm flex flex-col overflow-hidden">

          {/* Toolbar */}
          <div className="p-4 border-b border-[#CACAC4] dark:border-white/[0.06] space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9E9EA3]" />
                <input
                  type="text"
                  placeholder="Search collaborators…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#CACAC4] dark:border-white/[0.06] bg-[#F2F2F2] dark:bg-[#1A1A1D] text-[#0D0D0D] dark:text-white placeholder:text-[#9E9EA3] focus:outline-none focus:ring-2 focus:ring-[#FFD600]/40"
                />
              </div>
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-[10px] font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 border border-red-200 dark:border-red-700/30 transition-colors shrink-0"
                >
                  <X className="w-3 h-3" /> Clear ({selectedIds.size})
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="flex rounded-lg border border-[#CACAC4] dark:border-white/[0.06] overflow-hidden text-[10px] font-bold">
                {["All", "Junior", "Mid", "Senior", "Partner"].map(l => (
                  <button
                    key={l}
                    onClick={() => setFilterLevel(l)}
                    className={`px-2.5 py-1.5 transition-colors ${
                      filterLevel === l
                        ? "bg-[#0D0D0D] dark:bg-white text-white dark:text-[#0D0D0D]"
                        : "text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#E2E2DC] dark:hover:bg-white/[0.04]"
                    }`}
                  >{l}</button>
                ))}
              </div>

              <div className="flex rounded-lg border border-[#CACAC4] dark:border-white/[0.06] overflow-hidden text-[10px] font-bold">
                {(["all", "experienced", "new"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilterExp(f)}
                    className={`px-2.5 py-1.5 transition-colors ${
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
          <div className="flex-1 overflow-y-auto divide-y divide-[#CACAC4]/50 dark:divide-white/[0.04]" style={{ maxHeight: 480 }}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <span className="w-5 h-5 border-2 border-[#9E9EA3] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2">
                <Users className="w-8 h-8 text-[#CACAC4] dark:text-white/20" />
                <p className="text-sm text-[#9E9EA3]">No collaborators match</p>
              </div>
            ) : visible.map(c => {
              const selected = selectedIds.has(c._id);
              const lc = LEVEL_COLORS[c.level] ?? LEVEL_COLORS.Junior;
              return (
                <button
                  key={c._id}
                  onClick={() => toggle(c._id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    selected ? "bg-[#FFD600]/8 dark:bg-[#FFD600]/5" : "hover:bg-[#F2F2F2] dark:hover:bg-white/[0.02]"
                  }`}
                >
                  {selected
                    ? <CheckCircle2 className="w-4 h-4 text-[#FFD600] shrink-0" />
                    : <Circle className="w-4 h-4 text-[#CACAC4] dark:text-white/20 shrink-0" />
                  }
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${lc.badge}`}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0D0D0D] dark:text-white truncate">{c.name}</p>
                    <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${lc.badge}`}>
                      {c.level}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-[#0D0D0D] dark:text-white">
                      {c.coutHoraire > 0 ? `${c.coutHoraire} TND/h` : "—"}
                    </p>
                  </div>
                  <div className="shrink-0 w-16 text-right">
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

          <div className="px-4 py-2.5 border-t border-[#CACAC4] dark:border-white/[0.06] text-[10px] text-[#9E9EA3] flex items-center justify-between">
            <span>Showing {visible.length} of {collaborators.length}</span>
            {selectedIds.size > 0 && (
              <span className="font-bold text-[#0D0D0D] dark:text-white">{selectedIds.size} selected</span>
            )}
          </div>
        </div>

        {/* RIGHT — team summary */}
        <div className="flex flex-col gap-4">

          {selectedCollabs.length === 0 ? (
            /* Empty state */
            <div className="flex-1 bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm flex flex-col items-center justify-center py-16 px-6 text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#F2F2F2] dark:bg-[#1A1A1D] border border-[#CACAC4] dark:border-white/[0.06] flex items-center justify-center">
                <Users className="w-6 h-6 text-[#CACAC4] dark:text-white/20" />
              </div>
              <p className="text-sm font-bold text-[#0D0D0D] dark:text-white">No team yet</p>
              <p className="text-xs text-[#9E9EA3] leading-relaxed">
                Click collaborators on the left or pick from the suggestions above
              </p>
            </div>
          ) : (
            <>
              {/* Team members list */}
              <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-[#CACAC4] dark:border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-[#9E9EA3]" />
                    <p className="text-xs font-bold text-[#0D0D0D] dark:text-white">
                      Team · {selectedCollabs.length} member{selectedCollabs.length > 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-[10px] text-[#9E9EA3] hover:text-red-500 transition-colors flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Clear all
                  </button>
                </div>
                <div className="divide-y divide-[#CACAC4]/50 dark:divide-white/[0.04] max-h-48 overflow-y-auto">
                  {selectedCollabs.map(c => {
                    const lc = LEVEL_COLORS[c.level] ?? LEVEL_COLORS.Junior;
                    return (
                      <div key={c._id} className="flex items-center gap-2.5 px-4 py-2.5 group">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${lc.badge}`}>
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="flex-1 text-xs font-semibold text-[#0D0D0D] dark:text-white truncate">{c.name}</span>
                        <span className="text-[10px] text-[#9E9EA3] shrink-0">
                          {c.coutHoraire > 0 ? `${c.coutHoraire}/h` : "—"}
                        </span>
                        <button
                          onClick={() => toggle(c._id)}
                          className="text-[#CACAC4] dark:text-white/20 hover:text-red-500 transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Level breakdown */}
                {levelCounts(selectedCollabs).length > 0 && (
                  <div className="px-4 pt-3 pb-4 border-t border-[#CACAC4] dark:border-white/[0.06] space-y-2">
                    {levelCounts(selectedCollabs).map(({ level, count }) => {
                      const lc = LEVEL_COLORS[level] ?? LEVEL_COLORS.Junior;
                      const pct = Math.round((count / selectedCollabs.length) * 100);
                      return (
                        <div key={level} className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${lc.badge}`}>{level}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-[#E2E2DC] dark:bg-white/[0.06] overflow-hidden">
                            <div className={`h-full rounded-full ${lc.dot}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-[#0D0D0D] dark:text-white shrink-0 w-6 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cost summary */}
              <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Banknote className="w-3.5 h-3.5 text-[#9E9EA3]" />
                  <p className="text-xs font-bold text-[#0D0D0D] dark:text-white">Cost summary</p>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#9E9EA3]">Team rate / h</span>
                    <span className="font-bold text-[#0D0D0D] dark:text-white">{teamRatePerHour.toLocaleString()} TND</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#9E9EA3]">Mission hours</span>
                    <span className="font-bold text-[#0D0D0D] dark:text-white">{hoursNum > 0 ? `${hoursNum}h` : "—"}</span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-[#E2E2DC] dark:border-white/[0.06]">
                    <span className="font-bold text-[#0D0D0D] dark:text-white">Total cost</span>
                    <span className="font-black text-[#0D0D0D] dark:text-white">
                      {hoursNum > 0 ? `${totalCost.toLocaleString()} TND` : "—"}
                    </span>
                  </div>
                </div>

                {/* Budget progress bar */}
                {budgetNum > 0 && hoursNum > 0 && (
                  <div className="pt-1 space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[#9E9EA3]">vs budget ({budgetNum.toLocaleString()} DT)</span>
                      <span className={`font-bold ${isOver ? "text-red-500" : "text-green-500"}`}>
                        {Math.min(costPct + (isOver ? (totalCost - budgetNum) / budgetNum * 100 : 0), 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#E2E2DC] dark:bg-white/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isOver ? "bg-red-500" : costPct > 80 ? "bg-amber-400" : "bg-green-500"}`}
                        style={{ width: `${costPct}%` }}
                      />
                    </div>
                    <div className={`flex items-center gap-1.5 text-[10px] font-bold mt-1 ${isOver ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
                      {isOver
                        ? <><TrendingDown className="w-3 h-3" /> {Math.abs(budgetDelta).toLocaleString()} DT over budget</>
                        : <><TrendingUp className="w-3 h-3" /> {budgetDelta.toLocaleString()} DT remaining</>
                      }
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamBuilder;
