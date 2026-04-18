import { useState, useEffect, useRef } from "react";
import {
  User, Mail, Shield, Briefcase, Building2, Calendar,
  FileText, Clock, Activity, ChevronDown, ChevronRight,
  Camera, AlertTriangle, RefreshCw, Hash,
} from "lucide-react";
import api from "../../../services/api";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { getAvatarUrl } from "../../../utils/getAvatarUrl";
import DatePicker from "../../ui/DatePicker";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FullProfile {
  _id: string;
  name: string;
  email: string;
  role: string;
  level: string;
  academicLevel: string;
  specializations: string[];
  department: string;
  positionCategory: string;
  contractType: string;
  hireDate?: string;
  expStartDate?: string;
  contractEndDate?: string;
  cin: string;
  cnss: string;
  gender: string;
  dateOfBirth?: string;
  placeOfBirth: string;
  address: string;
  civilStatus: string;
  children: number;
  currentLoad: number;
  coutHoraire: number;
  avatarUrl?: string;
  burnoutFlags: { flagged: boolean; reasons: string[] };
  createdAt: string;
}

interface AuditEntry {
  _id: string;
  action: string;
  resource: string;
  resourceName?: string;
  description: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  ipAddress?: string;
  createdAt: string;
}

interface LogsResponse {
  logs: AuditEntry[];
  total: number;
  page: number;
  pages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  CREATE:          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  UPDATE:          "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  DELETE:          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  LOGIN:           "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  LOGOUT:          "bg-gray-100 text-gray-600 dark:bg-white/[0.06] dark:text-[#9E9EA3]",
  LOGIN_FAILED:    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  IMPORT:          "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  EXPORT:          "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  EMAIL_SENT:      "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  PASSWORD_RESET:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  PASSWORD_FORGOT: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
};

const RESOURCE_LABELS: Record<string, string> = {
  expert: "Collaborateur", project: "Projet", client: "Client",
  leave: "Congé", auth: "Auth", import: "Import", paceAlert: "Alerte",
};

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today     = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const dt = new Date(d); dt.setHours(0,0,0,0);
  if (dt.getTime() === today.getTime())     return "Aujourd'hui";
  if (dt.getTime() === yesterday.getTime()) return "Hier";
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

// Group an array of logs by calendar day (local time)
function groupByDay(logs: AuditEntry[]): { dayKey: string; label: string; entries: AuditEntry[] }[] {
  const map = new Map<string, AuditEntry[]>();
  for (const l of logs) {
    const key = new Date(l.createdAt).toLocaleDateString("fr-FR");
    const arr = map.get(key) ?? [];
    arr.push(l);
    map.set(key, arr);
  }
  return [...map.entries()].map(([dayKey, entries]) => ({
    dayKey,
    label: dayLabel(entries[0].createdAt),
    entries,
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number | undefined }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#CACAC4]/40 dark:border-white/[0.04] last:border-0">
      <div className="w-7 h-7 rounded-lg bg-[#F2F2F2] dark:bg-white/[0.04] flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-[#6B6B6F] dark:text-[#9E9EA3]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9E9EA3] mb-0.5">{label}</p>
        <p className="text-sm font-medium text-[#0D0D0D] dark:text-white truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${ACTION_COLORS[action] ?? "bg-gray-100 text-gray-600"}`}>
      {action.replace(/_/g, " ")}
    </span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-[#F2F2F2] dark:bg-white/[0.04] rounded-xl p-3 text-center">
      <p className="text-xl font-black text-[#0D0D0D] dark:text-white">{value}</p>
      <p className="text-[11px] font-semibold text-[#6B6B6F] dark:text-[#9E9EA3] mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-[#9E9EA3] mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminProfile() {
  const { user }  = useAuth();
  const { toast } = useToast();

  const [profile, setProfile]   = useState<FullProfile | null>(null);
  const [logs,    setLogs]      = useState<AuditEntry[]>([]);
  const [total,   setTotal]     = useState(0);
  const [pages,   setPages]     = useState(1);
  const [page,    setPage]      = useState(1);
  const [loading, setLoading]   = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);

  const [dateFrom,    setDateFrom]    = useState("");
  const [dateTo,      setDateTo]      = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [infoOpen,    setInfoOpen]    = useState(true);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch full profile ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    api.get<FullProfile>(`/staff/${user.id}`)
      .then(({ data }) => setProfile(data))
      .catch(() => toast("Erreur lors du chargement du profil", "error"))
      .finally(() => setLoading(false));
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch audit logs ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    setLogsLoading(true);
    const params: Record<string, string | number> = {
      userId: user.id,
      limit: 30,
      page,
    };
    if (dateFrom)     params.dateFrom = dateFrom;
    if (dateTo)       params.dateTo   = dateTo;
    if (actionFilter) params.action   = actionFilter;

    api.get<LogsResponse>("/audit-logs", { params })
      .then(({ data }) => {
        setLogs(data.logs ?? []);
        setTotal(data.total ?? 0);
        setPages(data.pages ?? 1);
      })
      .catch(() => toast("Erreur lors du chargement des logs", "error"))
      .finally(() => setLogsLoading(false));
  }, [user?.id, page, dateFrom, dateTo, actionFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [dateFrom, dateTo, actionFilter]);

  // ── Avatar upload ─────────────────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    if (file.size > 500 * 1024) { toast("Image trop grande (max 500 Ko)", "error"); return; }
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const { data } = await api.post<{ avatarUrl: string }>(`/staff/${user.id}/avatar`, fd);
      setProfile((p) => p ? { ...p, avatarUrl: data.avatarUrl } : p);
      toast("Photo de profil mise à jour", "success");
    } catch {
      toast("Erreur lors de l'envoi de la photo", "error");
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  // ── Computed stats ────────────────────────────────────────────────────────
  const todayStr = new Date().toLocaleDateString("fr-FR");
  const todayCount = logs.filter((l) =>
    new Date(l.createdAt).toLocaleDateString("fr-FR") === todayStr
  ).length;

  const grouped = groupByDay(logs);

  const ACTIONS = ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "IMPORT", "EXPORT"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-4 border-[#CACAC4] border-t-[#FFD600] rounded-full animate-spin" />
      </div>
    );
  }

  const initials = profile?.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() ?? "?";

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* ── Profile Header Card ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm overflow-hidden">

        {/* Cover banner */}
        <div className="h-28 bg-gradient-to-r from-[#FFD600]/30 via-[#FFD600]/10 to-transparent dark:from-[#FFD600]/20 dark:via-[#FFD600]/5 dark:to-transparent relative">
          <div className="absolute inset-0 opacity-10 dark:opacity-5"
            style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #FFD600 0%, transparent 60%)" }} />
        </div>

        <div className="px-6 pb-6">
          <div className="flex flex-wrap items-end gap-4 -mt-12 mb-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-2xl border-4 border-white dark:border-[#2A2A2E] overflow-hidden shadow-lg bg-[#FFD600]">
                {profile?.avatarUrl ? (
                  <img
                    src={getAvatarUrl(profile.avatarUrl)!}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-black text-[#0D0D0D]">
                    {initials}
                  </div>
                )}
              </div>
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-white dark:bg-[#2A2A2E] border-2 border-[#CACAC4] dark:border-white/[0.06] flex items-center justify-center hover:bg-[#FFD600] hover:border-[#FFD600] transition-colors group shadow"
              >
                {avatarUploading
                  ? <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <Camera className="w-3.5 h-3.5 text-[#6B6B6F] group-hover:text-[#0D0D0D]" />}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* Name + badges */}
            <div className="flex-1 min-w-0 pt-14">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black text-[#0D0D0D] dark:text-white">{profile?.name}</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 uppercase tracking-wide">
                  {profile?.role}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                  {profile?.level}
                </span>
                {profile?.burnoutFlags?.flagged && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                    <AlertTriangle className="w-3 h-3" /> Alerte burnout
                  </span>
                )}
              </div>
              <p className="text-sm text-[#6B6B6F] dark:text-[#9E9EA3] mt-1">{profile?.email}</p>
              <p className="text-xs text-[#9E9EA3] mt-0.5">Membre depuis {fmt(profile?.createdAt)}</p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Actions aujourd'hui" value={todayCount} />
            <StatCard label="Actions affichées" value={logs.length} sub={`sur ${total} total`} />
            <StatCard label="Charge actuelle" value={`${profile?.currentLoad ?? 0}%`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT: Personal Info ──────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Info card */}
          <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm overflow-hidden">
            <button
              onClick={() => setInfoOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#FFD600]/5 dark:hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#FFD600]" />
                <span className="text-sm font-bold text-[#0D0D0D] dark:text-white">Informations personnelles</span>
              </div>
              {infoOpen ? <ChevronDown className="w-4 h-4 text-[#9E9EA3]" /> : <ChevronRight className="w-4 h-4 text-[#9E9EA3]" />}
            </button>

            {infoOpen && (
              <div className="px-4 pb-4 border-t border-[#CACAC4] dark:border-white/[0.06]">
                <InfoRow icon={Mail}      label="Email"           value={profile?.email} />
                <InfoRow icon={Shield}    label="Rôle"            value={profile?.role} />
                <InfoRow icon={Briefcase} label="Niveau"          value={profile?.level} />
                <InfoRow icon={Building2} label="Département"     value={profile?.department} />
                <InfoRow icon={FileText}  label="Catégorie"       value={profile?.positionCategory} />
                <InfoRow icon={FileText}  label="Type de contrat" value={profile?.contractType} />
                <InfoRow icon={Calendar}  label="Date d'embauche" value={fmt(profile?.hireDate)} />
                <InfoRow icon={Calendar}  label="Fin de contrat"  value={fmt(profile?.contractEndDate)} />
                <InfoRow icon={Hash}      label="CIN"             value={profile?.cin} />
                <InfoRow icon={Hash}      label="CNSS"            value={profile?.cnss} />
                <InfoRow icon={User}      label="Genre"           value={profile?.gender} />
                <InfoRow icon={Calendar}  label="Date de naissance" value={fmt(profile?.dateOfBirth)} />
                <InfoRow icon={User}      label="Situation familiale" value={profile?.civilStatus} />
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Daily Activity Timeline ──────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Filters row */}
          <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#FFD600]" />
              <span className="text-sm font-bold text-[#0D0D0D] dark:text-white">Activité & Modifications</span>
              <span className="ml-auto text-xs text-[#9E9EA3]">{total} entrée{total !== 1 ? "s" : ""} au total</span>
              <button
                onClick={() => { setDateFrom(""); setDateTo(""); setActionFilter(""); setPage(1); }}
                className="p-1.5 rounded-lg hover:bg-[#F2F2F2] dark:hover:bg-white/[0.04] text-[#9E9EA3] hover:text-[#6B6B6F] transition-colors"
                title="Réinitialiser les filtres"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Date range */}
            <div className="flex flex-wrap gap-2 items-center">
              <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Date de début" maxDate={dateTo || undefined} />
              <DatePicker value={dateTo}   onChange={setDateTo}   placeholder="Date de fin"   minDate={dateFrom || undefined} />
            </div>

            {/* Action chips */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActionFilter("")}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                  !actionFilter
                    ? "bg-[#0D0D0D] dark:bg-white text-white dark:text-[#0D0D0D] border-transparent"
                    : "bg-white dark:bg-[#2A2A2E] text-[#6B6B6F] dark:text-[#9E9EA3] border-[#CACAC4] dark:border-white/[0.06] hover:bg-[#F2F2F2] dark:hover:bg-white/[0.04]"
                }`}
              >
                Tous
              </button>
              {ACTIONS.map((a) => (
                <button
                  key={a}
                  onClick={() => setActionFilter(a === actionFilter ? "" : a)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                    actionFilter === a
                      ? ACTION_COLORS[a]
                      : "bg-white dark:bg-[#2A2A2E] text-[#6B6B6F] dark:text-[#9E9EA3] border-[#CACAC4] dark:border-white/[0.06] hover:bg-[#F2F2F2] dark:hover:bg-white/[0.04]"
                  }`}
                >
                  {a.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white dark:bg-[#2A2A2E] rounded-2xl border border-[#CACAC4] dark:border-white/[0.06] shadow-sm overflow-hidden">
            {logsLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-6 h-6 border-4 border-[#CACAC4] border-t-[#FFD600] rounded-full animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center">
                <Activity className="w-8 h-8 text-[#CACAC4] dark:text-white/20 mx-auto mb-3" />
                <p className="text-sm text-[#9E9EA3]">Aucune activité pour cette période.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#CACAC4]/40 dark:divide-white/[0.04]">
                {grouped.map(({ dayKey, label, entries }) => (
                  <div key={dayKey}>
                    {/* Day header */}
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#F2F2F2]/60 dark:bg-white/[0.02]">
                      <Clock className="w-3.5 h-3.5 text-[#9E9EA3] shrink-0" />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6F] dark:text-[#9E9EA3]">
                        {label}
                      </span>
                      <span className="ml-auto text-[10px] text-[#9E9EA3] bg-white dark:bg-[#2A2A2E] px-1.5 py-0.5 rounded-full border border-[#CACAC4] dark:border-white/[0.06]">
                        {entries.length} action{entries.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Entries */}
                    <div className="divide-y divide-[#CACAC4]/30 dark:divide-white/[0.03]">
                      {entries.map((log) => {
                        const isExpanded = expandedLog === log._id;
                        const hasChanges = log.changes && Object.keys(log.changes).length > 0;
                        return (
                          <div key={log._id}>
                            <button
                              disabled={!hasChanges}
                              onClick={() => setExpandedLog(isExpanded ? null : log._id)}
                              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[#FFD600]/5 dark:hover:bg-white/[0.02] transition-colors disabled:cursor-default"
                            >
                              {/* Time */}
                              <span className="shrink-0 text-[10px] font-mono text-[#9E9EA3] mt-0.5 w-10">
                                {fmtTime(log.createdAt)}
                              </span>

                              {/* Action badge */}
                              <ActionBadge action={log.action} />

                              {/* Description */}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-[#0D0D0D] dark:text-white leading-snug">
                                  {log.description}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  {log.resource && (
                                    <span className="text-[10px] text-[#9E9EA3]">
                                      {RESOURCE_LABELS[log.resource] ?? log.resource}
                                      {log.resourceName ? ` · ${log.resourceName}` : ""}
                                    </span>
                                  )}
                                  {log.ipAddress && (
                                    <span className="text-[10px] font-mono text-[#9E9EA3]">{log.ipAddress}</span>
                                  )}
                                </div>
                              </div>

                              {/* Expand chevron */}
                              {hasChanges && (
                                <div className="shrink-0 text-[#9E9EA3] mt-0.5">
                                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                </div>
                              )}
                            </button>

                            {/* Changes diff */}
                            {isExpanded && hasChanges && (
                              <div className="mx-4 mb-3 rounded-xl bg-[#F2F2F2] dark:bg-white/[0.04] border border-[#CACAC4] dark:border-white/[0.06] overflow-hidden">
                                <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#9E9EA3] border-b border-[#CACAC4] dark:border-white/[0.06]">
                                  Modifications
                                </p>
                                <div className="divide-y divide-[#CACAC4]/40 dark:divide-white/[0.04]">
                                  {Object.entries(log.changes!).map(([field, { from, to }]) => (
                                    <div key={field} className="grid grid-cols-3 gap-2 px-3 py-2 text-[11px]">
                                      <span className="font-semibold text-[#6B6B6F] dark:text-[#9E9EA3] truncate">{field}</span>
                                      <span className="text-red-500 dark:text-red-400 truncate line-through opacity-70">
                                        {String(from ?? "—")}
                                      </span>
                                      <span className="text-emerald-600 dark:text-emerald-400 font-medium truncate">
                                        {String(to ?? "—")}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#CACAC4] dark:border-white/[0.06] bg-[#F2F2F2]/40 dark:bg-white/[0.02]">
                <span className="text-xs text-[#9E9EA3]">Page {page} / {pages}</span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#F2F2F2] dark:hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    ← Précédent
                  </button>
                  <button
                    disabled={page >= pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#CACAC4] dark:border-white/[0.06] bg-white dark:bg-[#2A2A2E] text-[#6B6B6F] dark:text-[#9E9EA3] hover:bg-[#F2F2F2] dark:hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Suivant →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
