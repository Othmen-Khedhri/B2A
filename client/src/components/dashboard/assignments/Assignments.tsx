import { useState, useEffect } from "react";
import {
  GitBranch, AlertTriangle, CalendarOff, RefreshCw,
  ChevronDown, ChevronRight, Users, Layers, Grid3X3, Flame,
} from "lucide-react";
import api from "../../../services/api";
import MonthPicker from "../../ui/MonthPicker";
import { getAvatarUrl } from "../../../utils/getAvatarUrl";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DBProject {
  _id: string;
  name: string;
  clientName: string;
  externalId: string;
  status: string;
  assignedStaff: string[];
  budgetHours: number;
  hoursConsumed: number;
}

interface DBExpert {
  _id: string;
  name: string;
  role: string;
  level: string;
  currentLoad: number;
  burnoutFlags: { flagged: boolean; reasons: string[] };
  avatarUrl?: string;
}

interface DBLeave {
  _id: string;
  expertId: string;
  expertName: string;
  dateStart: string;
  dateEnd: string;
  days: number;
  type: "Annuel" | "Maladie" | "Exceptionnel";
  approved: boolean;
}

interface PaceEntry {
  _id: string;
  name: string;
  clientName: string;
  paceLabel: "On Track" | "At Risk" | "Burning";
  hoursProgress: number;
}

type ViewMode    = "staff" | "project" | "matrix";
type QuickFilter = "overloaded" | "onleave" | "burnout" | "unassigned";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPeriods(): string[] {
  const periods: string[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return periods;
}

const PERIODS = buildPeriods();

const AVATAR_COLORS = [
  "bg-amber-400", "bg-sky-400", "bg-teal-400", "bg-purple-400", "bg-rose-400",
];

const MONTHLY_HOURS = 160;

function expertInitials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function expertColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function loadToPct(hours: number) {
  return Math.min(Math.round((hours / MONTHLY_HOURS) * 100), 100);
}

// ─── Badge / UI atoms ─────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: string }) {
  const cls =
    level === "Partner" ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300"
    : level === "Senior" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
    : level === "Mid"    ? "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
    : "bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-[#9E9EA3]";
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${cls}`}>
      {level}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const cfg: Record<string, string> = {
    admin:        "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    manager:      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    collaborator: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
    worker:       "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  };
  const label: Record<string, string> = {
    admin: "Admin", manager: "Manager", collaborator: "Collab", worker: "Worker",
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${cfg[role] ?? "bg-gray-100 text-gray-600"}`}>
      {label[role] ?? role}
    </span>
  );
}

function CongeBadge({ type }: { type: string }) {
  const cls =
    type === "Maladie"      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
    : type === "Exceptionnel" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
    : "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300";
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${cls}`}>
      <CalendarOff className="w-2.5 h-2.5" />
      {type}
    </span>
  );
}

function PacePill({ paceLabel, name }: { paceLabel?: string; name: string }) {
  const cls =
    paceLabel === "Burning"  ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/40"
    : paceLabel === "At Risk" ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/40"
    : "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800/40";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>
      {paceLabel === "Burning"  && <Flame         className="w-2.5 h-2.5 shrink-0" />}
      {paceLabel === "At Risk"  && <AlertTriangle className="w-2.5 h-2.5 shrink-0" />}
      <span className="max-w-[110px] truncate">{name}</span>
    </span>
  );
}

function WorkloadBar({ pct }: { pct: number }) {
  const color = pct < 70 ? "bg-green-500" : pct <= 90 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="w-full bg-[#CACAC4]/30 dark:bg-white/[0.06] rounded-full h-1.5">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function MiniAvatar({ expert }: { expert: DBExpert }) {
  if (expert.avatarUrl) {
    return (
      <img
        src={getAvatarUrl(expert.avatarUrl)!}
        alt={expert.name}
        title={expert.name}
        className="w-7 h-7 rounded-full object-cover border-2 border-white dark:border-[#2A2A2E]"
      />
    );
  }
  return (
    <div
      title={expert.name}
      className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-white dark:border-[#2A2A2E] ${expertColor(expert.name)}`}
    >
      {expertInitials(expert.name)}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] p-12 text-center">
      <p className="text-sm text-[#9E9EA3]">{message}</p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Assignments() {
  const [projects, setProjects] = useState<DBProject[]>([]);
  const [staff,    setStaff]    = useState<DBExpert[]>([]);
  const [leaves,   setLeaves]   = useState<DBLeave[]>([]);
  const [paceMap,  setPaceMap]  = useState<Map<string, PaceEntry>>(new Map());
  const [loading,  setLoading]  = useState(true);
  const [recalcLoading, setRecalcLoading] = useState(false);

  const [viewMode,      setViewMode]      = useState<ViewMode>("staff");
  const [search,        setSearch]        = useState("");
  const [period,        setPeriod]        = useState(PERIODS[0]);
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [activeFilters, setActiveFilters] = useState<Set<QuickFilter>>(new Set());
  const [expandedStaff, setExpandedStaff] = useState<Set<string>>(new Set());
  const [leavesOpen,    setLeavesOpen]    = useState(true);
  const [chargeOpen,    setChargeOpen]    = useState(false);

  // Matrix crosshair hover
  const [hovRow, setHovRow] = useState<string | null>(null);
  const [hovCol, setHovCol] = useState<string | null>(null);

  // ── Data fetching ────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<DBProject[]>("/projects"),
      api.get<DBExpert[]>("/staff"),
      api.get<PaceEntry[]>("/projects/pace"),
    ]).then(([p, s, pace]) => {
      setProjects(p.data);
      setStaff(s.data);
      const map = new Map<string, PaceEntry>();
      for (const entry of pace.data) map.set(entry._id, entry);
      setPaceMap(map);
    }).catch((err) => {
      console.error("Assignments data fetch failed:", err);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    api.get<DBLeave[]>(`/leaves?month=${period}`)
      .then(({ data }) => setLeaves(data));
  }, [period]);

  const refresh = () => {
    setLoading(true);
    Promise.all([
      api.get<DBProject[]>("/projects"),
      api.get<DBExpert[]>("/staff"),
      api.get<PaceEntry[]>("/projects/pace"),
      api.get<DBLeave[]>(`/leaves?month=${period}`),
    ]).then(([p, s, pace, l]) => {
      setProjects(p.data);
      setStaff(s.data);
      const map = new Map<string, PaceEntry>();
      for (const entry of pace.data) map.set(entry._id, entry);
      setPaceMap(map);
      setLeaves(l.data);
    }).catch((err) => {
      console.error("Assignments refresh failed:", err);
    }).finally(() => setLoading(false));
  };

  const recalculateLoads = async () => {
    try {
      setRecalcLoading(true);
      await api.post("/staff/recalculate-loads");
      refresh();
    } finally {
      setRecalcLoading(false);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────

  const leaveMap = new Map<string, DBLeave[]>();
  for (const l of leaves) {
    if (!l.approved) continue;
    const arr = leaveMap.get(l.expertId) ?? [];
    arr.push(l);
    leaveMap.set(l.expertId, arr);
  }

  const toggleFilter = (f: QuickFilter) => {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f); else next.add(f);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedStaff((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Apply quick filters + search to staff
  const visibleStaff = staff.filter((e) => {
    const loadPct = loadToPct(e.currentLoad);
    const q = search.toLowerCase();
    if (q && viewMode !== "project" && !e.name.toLowerCase().includes(q)) return false;
    if (activeFilters.has("overloaded")  && loadPct <= 90) return false;
    if (activeFilters.has("onleave")     && !leaveMap.has(e._id)) return false;
    if (activeFilters.has("burnout")     && !e.burnoutFlags?.flagged) return false;
    if (activeFilters.has("unassigned")  && projects.some((p) => p.assignedStaff?.includes(e._id))) return false;
    return true;
  });

  // Apply search + status filter to projects
  const visibleProjects = projects.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    const q = search.toLowerCase();
    if (!q || viewMode === "staff") return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.clientName?.toLowerCase().includes(q) ||
      p.externalId?.toLowerCase().includes(q)
    );
  });

  // Quick-filter chip counts
  const overloadedCount = staff.filter((e) => loadToPct(e.currentLoad) > 90).length;
  const onLeaveCount    = staff.filter((e) => leaveMap.has(e._id)).length;
  const burnoutCount    = staff.filter((e) => e.burnoutFlags?.flagged).length;
  const unassignedCount = staff.filter((e) => !projects.some((p) => p.assignedStaff?.includes(e._id))).length;

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-4 border-[#CACAC4] border-t-[#FFD600] rounded-full animate-spin" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#FFD600]/20">
            <GitBranch className="w-6 h-6 text-[#FFD600]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0D0D0D] dark:text-white">Affectations</h1>
            <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3]">
              {staff.length} collaborateur{staff.length !== 1 ? "s" : ""} · {projects.length} projet{projects.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={recalculateLoads}
            disabled={recalcLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#CACAC4] dark:border-white/[0.06] text-sm text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#F2F2F2] dark:hover:bg-white/[0.04] transition disabled:opacity-60"
            title="Recalculer les charges"
          >
            <RefreshCw className={`w-4 h-4 ${recalcLoading ? "animate-spin" : ""}`} />
            Recalculer
          </button>
          <button
            onClick={refresh}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#CACAC4] dark:border-white/[0.06] text-sm text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#F2F2F2] dark:hover:bg-white/[0.04] transition"
            title="Rafraichir"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── View Tabs ────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-[#F2F2F2] dark:bg-white/[0.04] rounded-xl p-1 w-fit">
        {(["staff", "project", "matrix"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === mode
                ? "bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white shadow-sm"
                : "text-[#6B6B6F] dark:text-[#9E9EA3] hover:text-[#0D0D0D] dark:hover:text-white"
            }`}
          >
            {mode === "staff"   && <Users    className="w-4 h-4" />}
            {mode === "project" && <Layers   className="w-4 h-4" />}
            {mode === "matrix"  && <Grid3X3  className="w-4 h-4" />}
            {mode === "staff"   ? "Par collaborateur" : mode === "project" ? "Par projet" : "Matrice"}
          </button>
        ))}
      </div>

      {/* ── Controls Bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder={viewMode === "project" ? "Rechercher un projet…" : "Rechercher un collaborateur…"}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 text-sm rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white placeholder:text-[#9E9EA3] focus:outline-none focus:ring-2 focus:ring-[#FFD600]/50"
        />
        {viewMode === "project" && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] text-[#0D0D0D] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FFD600]/50"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">En cours</option>
            <option value="completed">Terminé</option>
            <option value="on-hold">En attente</option>
            <option value="cancelled">Annulé</option>
          </select>
        )}
        <MonthPicker value={period} onChange={setPeriod} />
      </div>

      {/* ── Quick-filter chips ───────────────────────────────────────────────── */}
      {viewMode !== "project" && (
        <div className="flex flex-wrap gap-2">
          {([
            { key: "overloaded" as QuickFilter, label: "Surchargés",    count: overloadedCount, active: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700/40" },
            { key: "onleave"    as QuickFilter, label: "En congé",      count: onLeaveCount,    active: "bg-teal-100 text-teal-700 border-teal-300 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-700/40" },
            { key: "burnout"    as QuickFilter, label: "Burnout",       count: burnoutCount,    active: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700/40" },
            { key: "unassigned" as QuickFilter, label: "Non affectés",  count: unassignedCount, active: "bg-gray-200 text-gray-700 border-gray-300 dark:bg-white/10 dark:text-[#9E9EA3] dark:border-white/20" },
          ]).map(({ key, label, count, active }) => (
            <button
              key={key}
              onClick={() => toggleFilter(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                activeFilters.has(key)
                  ? active
                  : "bg-white dark:bg-[#2A2A2E] text-[#6B6B6F] dark:text-[#9E9EA3] border-[#CACAC4] dark:border-white/[0.06] hover:bg-[#F2F2F2] dark:hover:bg-white/[0.04]"
              }`}
            >
              {label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeFilters.has(key) ? "bg-white/40 dark:bg-black/20" : "bg-[#F2F2F2] dark:bg-white/[0.06]"
              }`}>{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          VIEW: BY STAFF
      ════════════════════════════════════════════════════════════════════════ */}
      {viewMode === "staff" && (
        <div className="space-y-2">
          {visibleStaff.length === 0 ? (
            <EmptyState message="Aucun collaborateur ne correspond aux filtres." />
          ) : visibleStaff.map((expert) => {
            const expertLeaves     = leaveMap.get(expert._id) ?? [];
            const onLeave          = expertLeaves.length > 0;
            const burnout          = expert.burnoutFlags?.flagged;
            const assignedProjects = projects.filter((p) => p.assignedStaff?.includes(expert._id));
            const isExpanded       = expandedStaff.has(expert._id);
            const loadPct          = loadToPct(expert.currentLoad);
            const loadColor        =
              loadPct < 70  ? "text-green-600 dark:text-green-400"
              : loadPct <= 90 ? "text-amber-600 dark:text-amber-400"
              : "text-red-600 dark:text-red-400";

            return (
              <div
                key={expert._id}
                className={`bg-white dark:bg-[#2A2A2E] rounded-2xl border transition-all overflow-hidden ${
                  burnout ? "border-red-200 dark:border-red-800/40"
                  : onLeave ? "border-teal-200 dark:border-teal-800/40"
                  : "border-[#CACAC4] dark:border-white/[0.06]"
                }`}
              >
                {/* Collapsed header row */}
                <button
                  onClick={() => toggleExpand(expert._id)}
                  className="w-full px-4 py-3.5 flex items-center gap-4 text-left hover:bg-[#FFD600]/5 dark:hover:bg-white/[0.02] transition-colors rounded-2xl"
                >
                  {/* Avatar */}
                  <div className="shrink-0">
                    {expert.avatarUrl ? (
                      <img
                        src={getAvatarUrl(expert.avatarUrl)!}
                        alt={expert.name}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${expertColor(expert.name)}`}>
                        {expertInitials(expert.name)}
                      </div>
                    )}
                  </div>

                  {/* Name + badges + workload bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                      {burnout && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                      <span className="text-sm font-semibold text-[#0D0D0D] dark:text-white">{expert.name}</span>
                      <RoleBadge role={expert.role} />
                      <LevelBadge level={expert.level} />
                      {onLeave && expertLeaves.map((l, i) => <CongeBadge key={i} type={l.type} />)}
                    </div>
                    <div className="flex items-center gap-2">
                      <WorkloadBar pct={loadPct} />
                      <span className={`shrink-0 text-xs font-bold ${loadColor}`}>{loadPct}%</span>
                    </div>
                  </div>

                  {/* Project pills preview */}
                  <div className="hidden sm:flex items-center gap-1 flex-wrap max-w-[300px] shrink-0">
                    {assignedProjects.slice(0, 4).map((p) => (
                      <PacePill key={p._id} paceLabel={paceMap.get(p._id)?.paceLabel} name={p.externalId || p.name} />
                    ))}
                    {assignedProjects.length > 4 && (
                      <span className="text-[10px] text-[#9E9EA3]">+{assignedProjects.length - 4}</span>
                    )}
                    {assignedProjects.length === 0 && (
                      <span className="text-[10px] text-[#9E9EA3] italic">Aucun projet</span>
                    )}
                  </div>

                  {/* Expand toggle */}
                  <div className="shrink-0 text-[#9E9EA3]">
                    {isExpanded
                      ? <ChevronDown  className="w-4 h-4" />
                      : <ChevronRight className="w-4 h-4" />}
                  </div>
                </button>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-[#CACAC4] dark:border-white/[0.06] space-y-3">
                    <div className="flex flex-wrap gap-2 text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">
                      <span>
                        <span className="font-semibold text-[#0D0D0D] dark:text-white">{assignedProjects.length}</span>{" "}
                        projet{assignedProjects.length !== 1 ? "s" : ""} affecté{assignedProjects.length !== 1 ? "s" : ""}
                      </span>
                      {burnout && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                          <AlertTriangle className="w-3 h-3" />
                          {expert.burnoutFlags.reasons.join(", ") || "Alerte burnout"}
                        </span>
                      )}
                    </div>

                    {assignedProjects.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {assignedProjects.map((p) => (
                          <div key={p._id} className="flex flex-col items-start gap-0.5">
                            <PacePill paceLabel={paceMap.get(p._id)?.paceLabel} name={p.name} />
                            {p.clientName && (
                              <span className="text-[9px] text-[#9E9EA3] pl-2">{p.clientName}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#9E9EA3] italic">Aucun projet assigné.</p>
                    )}

                    {expertLeaves.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-xs font-semibold text-[#6B6B6F] dark:text-[#9E9EA3]">Congés — {period}</p>
                        {expertLeaves.map((l, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">
                            <CongeBadge type={l.type} />
                            <span>
                              {new Date(l.dateStart).toLocaleDateString("fr-TN")} →{" "}
                              {new Date(l.dateEnd).toLocaleDateString("fr-TN")} ({l.days}j)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          VIEW: BY PROJECT
      ════════════════════════════════════════════════════════════════════════ */}
      {viewMode === "project" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleProjects.length === 0 ? (
            <div className="col-span-full">
              <EmptyState message="Aucun projet trouvé." />
            </div>
          ) : visibleProjects.map((p) => {
            const pace            = paceMap.get(p._id);
            const assignedExperts = staff.filter((e) => p.assignedStaff?.includes(e._id));
            const hPct            = p.budgetHours > 0 ? Math.round((p.hoursConsumed / p.budgetHours) * 100) : 0;

            const statusLabel: Record<string, string> = {
              active: "En cours", completed: "Terminé", "on-hold": "En attente", cancelled: "Annulé",
            };
            const statusCls =
              p.status === "active"    ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
              : p.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
              : p.status === "on-hold"   ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
              : "bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-[#9E9EA3]";

            const barColor =
              pace?.paceLabel === "Burning"  ? "bg-red-500"
              : pace?.paceLabel === "At Risk"  ? "bg-amber-400"
              : "bg-sky-500";

            const borderCls =
              pace?.paceLabel === "Burning"  ? "border-red-200 dark:border-red-800/40"
              : pace?.paceLabel === "At Risk"  ? "border-amber-200 dark:border-amber-800/40"
              : "border-[#CACAC4] dark:border-white/[0.06]";

            return (
              <div
                key={p._id}
                className={`bg-white dark:bg-[#2A2A2E] rounded-2xl border p-4 space-y-3.5 ${borderCls}`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusCls}`}>
                        {statusLabel[p.status] ?? p.status}
                      </span>
                      {pace && pace.paceLabel !== "On Track" && (
                        <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          pace.paceLabel === "Burning"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        }`}>
                          {pace.paceLabel === "Burning"
                            ? <Flame         className="w-2.5 h-2.5" />
                            : <AlertTriangle className="w-2.5 h-2.5" />}
                          {pace.paceLabel}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold text-[#0D0D0D] dark:text-white truncate">{p.name}</p>
                    <p className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3] truncate">{p.clientName}</p>
                  </div>
                  {p.externalId && (
                    <span className="shrink-0 font-mono text-[10px] text-[#9E9EA3] bg-[#F2F2F2] dark:bg-white/[0.04] px-1.5 py-0.5 rounded">
                      {p.externalId}
                    </span>
                  )}
                </div>

                {/* Budget / hours progress */}
                {p.budgetHours > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-[#9E9EA3]">
                      <span>Heures consommées ({p.hoursConsumed}h / {p.budgetHours}h)</span>
                      <span className={`font-semibold ${hPct > 90 ? "text-red-500" : hPct > 70 ? "text-amber-500" : ""}`}>
                        {hPct}%
                      </span>
                    </div>
                    <div className="w-full bg-[#CACAC4]/30 dark:bg-white/[0.06] rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(hPct, 100)}%` }} />
                    </div>
                  </div>
                )}

                {/* Staff avatar stack */}
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {assignedExperts.slice(0, 6).map((e) => (
                      <MiniAvatar key={e._id} expert={e} />
                    ))}
                  </div>
                  {assignedExperts.length === 0 ? (
                    <span className="text-[10px] text-[#9E9EA3] italic">Aucun collaborateur</span>
                  ) : (
                    <span className="text-[10px] text-[#9E9EA3] ml-1">
                      {assignedExperts.length > 6
                        ? `+${assignedExperts.length - 6} · ${assignedExperts.length} total`
                        : `${assignedExperts.length} collaborateur${assignedExperts.length !== 1 ? "s" : ""}`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          VIEW: MATRIX
      ════════════════════════════════════════════════════════════════════════ */}
      {viewMode === "matrix" && (
        visibleProjects.length === 0 || visibleStaff.length === 0 ? (
          <EmptyState message={visibleStaff.length === 0 ? "Aucun collaborateur." : "Aucun projet trouvé."} />
        ) : (
          <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm overflow-hidden">
            <div className="overflow-auto max-h-[65vh]">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 z-20">
                  <tr className="border-b border-[#CACAC4] dark:border-white/[0.06]">
                    {/* Corner cell */}
                    <th className="sticky left-0 z-30 bg-white dark:bg-[#2A2A2E] px-4 py-3 text-left font-semibold text-[#6B6B6F] dark:text-[#9E9EA3] min-w-[240px] border-r border-[#CACAC4] dark:border-white/[0.06]">
                      Collaborateur
                    </th>
                    {/* Project column headers */}
                    {visibleProjects.map((p) => {
                      const pace  = paceMap.get(p._id);
                      const isHov = hovCol === p._id;
                      return (
                        <th
                          key={p._id}
                          className={`px-3 py-3 text-center font-semibold text-[#6B6B6F] dark:text-[#9E9EA3] min-w-[72px] transition-colors ${
                            isHov ? "bg-[#FFD600]/10 dark:bg-[#FFD600]/5" : "bg-white dark:bg-[#2A2A2E]"
                          }`}
                          title={`${p.externalId || p._id} — ${p.clientName}`}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-mono text-[10px]">{p.externalId || p._id.slice(-6)}</span>
                            <span className="text-[10px] max-w-[64px] truncate" title={p.clientName}>
                              {p.clientName || p.name}
                            </span>
                            {pace?.paceLabel === "Burning"  && <Flame         className="w-3 h-3 text-red-500 mt-0.5" />}
                            {pace?.paceLabel === "At Risk"  && <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5" />}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {visibleStaff.map((expert) => {
                    const expertLeaves = leaveMap.get(expert._id) ?? [];
                    const onLeave      = expertLeaves.length > 0;
                    const burnout      = expert.burnoutFlags?.flagged;
                    const isHovRow     = hovRow === expert._id;
                    const loadPct      = loadToPct(expert.currentLoad);

                    return (
                      <tr
                        key={expert._id}
                        onMouseEnter={() => setHovRow(expert._id)}
                        onMouseLeave={() => setHovRow(null)}
                        className="border-b border-[#CACAC4]/40 dark:border-white/[0.04] last:border-0 transition-colors"
                      >
                        {/* Sticky name cell */}
                        <td className={`sticky left-0 z-10 px-4 py-2.5 border-r border-[#CACAC4] dark:border-white/[0.06] transition-colors ${
                          isHovRow ? "bg-[#FFD600]/10 dark:bg-[#FFD600]/5"
                          : onLeave ? "bg-teal-50/60 dark:bg-teal-900/10"
                          : "bg-white dark:bg-[#2A2A2E]"
                        }`}>
                          <div className="flex items-center gap-2">
                            {/* Mini avatar */}
                            {expert.avatarUrl ? (
                              <img src={getAvatarUrl(expert.avatarUrl)!} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                            ) : (
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white shrink-0 ${expertColor(expert.name)}`}>
                                {expertInitials(expert.name)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1 flex-wrap">
                                {burnout && <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />}
                                <span className="text-xs font-semibold text-[#0D0D0D] dark:text-white truncate">{expert.name}</span>
                                <RoleBadge role={expert.role} />
                                <LevelBadge level={expert.level} />
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <WorkloadBar pct={loadPct} />
                                <span className="text-[10px] text-[#9E9EA3] shrink-0">{loadPct}%</span>
                                {expertLeaves.slice(0, 1).map((l, i) => <CongeBadge key={i} type={l.type} />)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Assignment dots */}
                        {visibleProjects.map((p) => {
                          const assigned = p.assignedStaff?.includes(expert._id);
                          const pace     = paceMap.get(p._id);
                          const isHovCol = hovCol === p._id;
                          const cross    = isHovRow || isHovCol;
                          const label    = assigned ? (onLeave ? "Affecté — en congé" : "Affecté") : "Non affecté";

                          let dot: React.ReactNode;
                          if (assigned) {
                            if (onLeave) {
                              dot = <span className="w-3 h-3 rounded-full border-2 border-teal-400 bg-teal-100 dark:bg-teal-900/30" />;
                            } else if (pace?.paceLabel === "Burning") {
                              dot = <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm" />;
                            } else if (pace?.paceLabel === "At Risk") {
                              dot = <span className="w-3 h-3 rounded-full bg-amber-400 shadow-sm" />;
                            } else {
                              dot = <span className="w-3 h-3 rounded-full bg-[#FFD600] shadow-sm" />;
                            }
                          } else {
                            dot = <span className="w-3 h-3 rounded-full border-2 border-[#CACAC4] dark:border-white/20 opacity-30" />;
                          }

                          return (
                            <td
                              key={p._id}
                              onMouseEnter={() => setHovCol(p._id)}
                              onMouseLeave={() => setHovCol(null)}
                              className={`px-3 py-2.5 text-center transition-colors ${
                                cross ? "bg-[#FFD600]/10 dark:bg-[#FFD600]/5" : ""
                              }`}
                            >
                              <span role="img" aria-label={label} title={label} className="inline-flex items-center justify-center w-5 h-5">
                                {dot}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Matrix legend */}
            <div className="flex flex-wrap gap-4 px-4 py-3 border-t border-[#CACAC4] dark:border-white/[0.06] text-[10px] text-[#9E9EA3]">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#FFD600] inline-block" /> On Track</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> At Risk</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Burning</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-teal-400 inline-block" /> En congé</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border-2 border-[#CACAC4] opacity-40 inline-block" /> Non affecté</span>
            </div>
          </div>
        )
      )}

      {/* ════════════════════════════════════════════════════════════════════════
          BOTTOM PANELS (collapsible)
      ════════════════════════════════════════════════════════════════════════ */}

      {/* Congés panel */}
      <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm overflow-hidden">
        <button
          onClick={() => setLeavesOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#FFD600]/5 dark:hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <CalendarOff className="w-5 h-5 text-teal-500" />
            <span className="text-sm font-bold text-[#0D0D0D] dark:text-white">Congés — {period}</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
              {leaves.filter((l) => l.approved).length}
            </span>
          </div>
          {leavesOpen
            ? <ChevronDown  className="w-4 h-4 text-[#9E9EA3]" />
            : <ChevronRight className="w-4 h-4 text-[#9E9EA3]" />}
        </button>

        {leavesOpen && (
          <div className="px-5 pb-4 border-t border-[#CACAC4] dark:border-white/[0.06]">
            {leaves.filter((l) => l.approved).length === 0 ? (
              <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3] pt-3">
                Aucun congé enregistré pour cette période.
              </p>
            ) : (
              <div className="divide-y divide-[#CACAC4]/40 dark:divide-white/[0.04]">
                {leaves.filter((l) => l.approved).map((l) => (
                  <div
                    key={l._id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#0D0D0D] dark:text-white">{l.expertName}</span>
                      <CongeBadge type={l.type} />
                    </div>
                    <span className="text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">
                      {new Date(l.dateStart).toLocaleDateString("fr-TN")} →{" "}
                      {new Date(l.dateEnd).toLocaleDateString("fr-TN")} ({l.days}j)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Charge panel */}
      <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm overflow-hidden">
        <button
          onClick={() => setChargeOpen((o) => !o)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#FFD600]/5 dark:hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#FFD600]" />
            <span className="text-sm font-bold text-[#0D0D0D] dark:text-white">Charge par collaborateur</span>
          </div>
          {chargeOpen
            ? <ChevronDown  className="w-4 h-4 text-[#9E9EA3]" />
            : <ChevronRight className="w-4 h-4 text-[#9E9EA3]" />}
        </button>

        {chargeOpen && (
          <div className="px-5 pb-4 border-t border-[#CACAC4] dark:border-white/[0.06] divide-y divide-[#CACAC4]/40 dark:divide-white/[0.04]">
            {staff.map((expert) => {
              const nbProjets    = projects.filter((p) => p.assignedStaff?.includes(expert._id)).length;
              const expertLeaves = leaveMap.get(expert._id) ?? [];
              const totalDays    = expertLeaves.reduce((s, l) => s + l.days, 0);
              const burnout      = expert.burnoutFlags?.flagged;

              return (
                <div key={expert._id} className="py-3 space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {burnout && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                          <AlertTriangle className="w-3 h-3" />
                          Burnout
                        </span>
                      )}
                      <span className="text-sm font-semibold text-[#0D0D0D] dark:text-white">{expert.name}</span>
                      <LevelBadge level={expert.level} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#6B6B6F] dark:text-[#9E9EA3]">
                      <span>
                        <span className="font-semibold text-[#0D0D0D] dark:text-white">{nbProjets}</span>{" "}
                        projet{nbProjets !== 1 ? "s" : ""}
                      </span>
                      <span>
                        <span className="font-semibold text-[#0D0D0D] dark:text-white">{loadToPct(expert.currentLoad)}%</span>{" "}
                        charge
                      </span>
                      {totalDays > 0 && (
                        <span className="flex items-center gap-1">
                          <CalendarOff className="w-3 h-3 text-teal-500" />
                          <span className="font-semibold text-teal-600 dark:text-teal-400">{totalDays}j</span>{" "}
                          congé
                        </span>
                      )}
                    </div>
                  </div>
                  <WorkloadBar pct={loadToPct(expert.currentLoad)} />
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
