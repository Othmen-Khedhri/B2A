import { useState, useEffect, useCallback } from "react";
import { ShieldCheck, Search, Download, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import api from "../../../services/api";
import { useLanguage } from "../../../context/LanguageContext";
import DatePicker from "../../ui/DatePicker";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuditAction =
  | "CREATE" | "UPDATE" | "DELETE"
  | "LOGIN" | "LOGIN_FAILED" | "LOGOUT"
  | "IMPORT" | "EXPORT"
  | "EMAIL_SENT" | "PASSWORD_RESET" | "PASSWORD_FORGOT";

type AuditResource =
  | "project" | "client" | "expert" | "leave"
  | "timeEntry" | "auth" | "import" | "paceAlert";

interface AuditLog {
  _id: string;
  userId: string | null;
  userName: string;
  userRole: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId: string | null;
  resourceName: string;
  description: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  ipAddress: string;
  userAgent: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface AuditStats {
  total: number;
  actionCounts: { _id: string; count: number }[];
  resourceCounts: { _id: string; count: number }[];
  daily: { _id: string; count: number }[];
}

interface AuditResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  pages: number;
}

// ─── Action badge config ──────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  CREATE:           { bg: "#d1fae5", text: "#065f46", label: "CREATE" },
  UPDATE:           { bg: "#dbeafe", text: "#1e40af", label: "UPDATE" },
  DELETE:           { bg: "#fee2e2", text: "#991b1b", label: "DELETE" },
  LOGIN:            { bg: "#f3f4f6", text: "#374151", label: "LOGIN" },
  LOGIN_FAILED:     { bg: "#fef3c7", text: "#92400e", label: "LOGIN FAILED" },
  LOGOUT:           { bg: "#f3f4f6", text: "#6b7280", label: "LOGOUT" },
  IMPORT:           { bg: "#ede9fe", text: "#5b21b6", label: "IMPORT" },
  EXPORT:           { bg: "#ede9fe", text: "#5b21b6", label: "EXPORT" },
  EMAIL_SENT:       { bg: "#e0f2fe", text: "#0369a1", label: "EMAIL" },
  PASSWORD_RESET:   { bg: "#fce7f3", text: "#9d174d", label: "PWD RESET" },
  PASSWORD_FORGOT:  { bg: "#fce7f3", text: "#9d174d", label: "PWD FORGOT" },
};

// Dark mode equivalents (CSS vars aren't easily available in inline style)
const ACTION_COLORS_DARK: Record<string, { bg: string; text: string }> = {
  CREATE:           { bg: "#064e3b", text: "#6ee7b7" },
  UPDATE:           { bg: "#1e3a5f", text: "#93c5fd" },
  DELETE:           { bg: "#7f1d1d", text: "#fca5a5" },
  LOGIN:            { bg: "#1f2937", text: "#9ca3af" },
  LOGIN_FAILED:     { bg: "#78350f", text: "#fcd34d" },
  LOGOUT:           { bg: "#1f2937", text: "#9ca3af" },
  IMPORT:           { bg: "#3b0764", text: "#c4b5fd" },
  EXPORT:           { bg: "#3b0764", text: "#c4b5fd" },
  EMAIL_SENT:       { bg: "#0c4a6e", text: "#7dd3fc" },
  PASSWORD_RESET:   { bg: "#831843", text: "#f9a8d4" },
  PASSWORD_FORGOT:  { bg: "#831843", text: "#f9a8d4" },
};

const RESOURCE_LABELS: Record<string, string> = {
  project: "Project", client: "Client", expert: "Staff",
  leave: "Leave", timeEntry: "Time Entry", auth: "Auth",
  import: "Import", paceAlert: "Pace Alert",
};

const ACTIONS: AuditAction[] = [
  "CREATE", "UPDATE", "DELETE", "LOGIN", "LOGIN_FAILED",
  "LOGOUT", "IMPORT", "EXPORT", "EMAIL_SENT", "PASSWORD_RESET", "PASSWORD_FORGOT",
];
const RESOURCES: AuditResource[] = [
  "project", "client", "expert", "leave", "timeEntry", "auth", "import", "paceAlert",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("fr-TN", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function exportCSV(logs: AuditLog[]) {
  const header = ["Date", "User", "Role", "Action", "Resource", "Resource Name", "Description", "IP"];
  const rows = logs.map((l) => [
    fmtDate(l.createdAt), l.userName, l.userRole, l.action,
    l.resource, l.resourceName, `"${l.description.replace(/"/g, '""')}"`, l.ipAddress,
  ]);
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ w = "100%", h = "16px" }: { w?: string; h?: string }) {
  return (
    <div
      style={{
        width: w, height: h, borderRadius: "6px",
        backgroundColor: "var(--color-label-bg)",
        animation: "pulse 1.5s ease-in-out infinite",
      }}
    />
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, loading }: { label: string; value: number | string; loading: boolean }) {
  return (
    <div style={{
      backgroundColor: "var(--color-bg-card)",
      border: "1px solid var(--color-border-default)",
      borderRadius: "14px", padding: "20px 24px",
      display: "flex", flexDirection: "column", gap: "6px",
    }}>
      <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </span>
      {loading ? (
        <Skeleton h="32px" w="80px" />
      ) : (
        <span style={{ fontSize: "28px", fontWeight: 800, color: "var(--color-text-primary)", lineHeight: 1 }}>
          {value}
        </span>
      )}
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function LogRow({ log, dark }: { log: AuditLog; dark: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const colors = dark ? ACTION_COLORS_DARK[log.action] : ACTION_COLORS[log.action];
  const hasChanges = log.changes && Object.keys(log.changes).length > 0;

  return (
    <>
      <tr
        style={{ borderBottom: "1px solid var(--color-border-default)", cursor: hasChanges ? "pointer" : "default" }}
        onClick={() => hasChanges && setExpanded((v) => !v)}
      >
        <td style={{ padding: "10px 12px", fontSize: "12px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
          {fmtDate(log.createdAt)}
        </td>
        <td style={{ padding: "10px 12px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-primary)" }}>{log.userName}</div>
          <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)", textTransform: "capitalize" }}>{log.userRole}</div>
        </td>
        <td style={{ padding: "10px 12px" }}>
          <span style={{
            display: "inline-block",
            padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
            backgroundColor: colors?.bg ?? "#f3f4f6",
            color: colors?.text ?? "#374151",
          }}>
            {ACTION_COLORS[log.action]?.label ?? log.action}
          </span>
        </td>
        <td style={{ padding: "10px 12px" }}>
          <span style={{ fontSize: "12px", color: "var(--color-text-secondary)", textTransform: "capitalize" }}>
            {RESOURCE_LABELS[log.resource] ?? log.resource}
          </span>
          {log.resourceName && (
            <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)" }}>{log.resourceName}</div>
          )}
        </td>
        <td style={{ padding: "10px 12px", fontSize: "13px", color: "var(--color-text-primary)", maxWidth: "260px" }}>
          {log.description}
        </td>
        <td style={{ padding: "10px 12px", fontSize: "12px", color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>
          {log.ipAddress || "—"}
        </td>
        <td style={{ padding: "10px 12px", textAlign: "center" }}>
          {hasChanges && (
            <span style={{ color: "var(--color-text-tertiary)" }}>
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
        </td>
      </tr>
      {expanded && hasChanges && (
        <tr style={{ backgroundColor: "var(--color-label-bg)" }}>
          <td colSpan={7} style={{ padding: "0 12px 12px 32px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--color-text-tertiary)", fontWeight: 600 }}>Field</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--color-text-tertiary)", fontWeight: 600 }}>Old value</th>
                  <th style={{ textAlign: "left", padding: "8px 12px", color: "var(--color-text-tertiary)", fontWeight: 600 }}>New value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(log.changes).map(([field, diff]) => (
                  <tr key={field} style={{ borderTop: "1px solid var(--color-border-default)" }}>
                    <td style={{ padding: "6px 12px", fontWeight: 600, color: "var(--color-text-primary)" }}>{field}</td>
                    <td style={{ padding: "6px 12px", color: "#ef4444" }}>{String(diff.old ?? "—")}</td>
                    <td style={{ padding: "6px 12px", color: "#22c55e" }}>{String(diff.new ?? "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AuditLogs() {
  const { t } = useLanguage();
  const dark = document.documentElement.classList.contains("dark");

  const [stats, setStats] = useState<AuditStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [logsLoading, setLogsLoading] = useState(true);

  // Filters
  const [search, setSearch]       = useState("");
  const [action, setAction]       = useState("");
  const [resource, setResource]   = useState("");
  const [dateFrom, setDateFrom]   = useState("");
  const [dateTo, setDateTo]       = useState("");
  const [page, setPage]           = useState(1);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api.get<AuditStats>("/audit-logs/stats");
      setStats(res.data);
    } catch {
      // stats optional
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (search)   params.search   = search;
      if (action)   params.action   = action;
      if (resource) params.resource = resource;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo)   params.dateTo   = dateTo;

      const res = await api.get<AuditResponse>("/audit-logs", { params });
      setLogs(res.data.logs);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, [page, search, action, resource, dateFrom, dateTo]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [search, action, resource, dateFrom, dateTo]);

  // Derived stats
  const todayCount = stats?.daily.find(
    (d) => d._id === new Date().toISOString().slice(0, 10)
  )?.count ?? 0;

  const loginCount = stats?.actionCounts.find((a) => a._id === "LOGIN")?.count ?? 0;
  const importCount = stats?.actionCounts.find((a) => a._id === "IMPORT")?.count ?? 0;

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid var(--color-border-default)",
    backgroundColor: "var(--color-bg-card)",
    color: "var(--color-text-primary)",
    fontSize: "13px",
    outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "12px",
            backgroundColor: "var(--color-accent-bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ShieldCheck size={20} color="var(--color-accent)" />
          </div>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-text-primary)", margin: 0 }}>
              {t("audit.title")}
            </h1>
            <p style={{ fontSize: "13px", color: "var(--color-text-tertiary)", margin: 0 }}>
              {t("audit.subtitle")}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => { fetchStats(); fetchLogs(); }}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 14px", borderRadius: "8px",
              backgroundColor: "var(--color-label-bg)",
              border: "1px solid var(--color-border-default)",
              color: "var(--color-text-secondary)", fontSize: "13px", fontWeight: 500,
              cursor: "pointer",
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => exportCSV(logs)}
            disabled={logs.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 14px", borderRadius: "8px",
              backgroundColor: "#FFD600", border: "none",
              color: "#0D0D0D", fontSize: "13px", fontWeight: 700,
              cursor: logs.length === 0 ? "not-allowed" : "pointer",
              opacity: logs.length === 0 ? 0.5 : 1,
            }}
          >
            <Download size={14} /> {t("audit.export_csv")}
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px" }}>
        <StatCard label={t("audit.total")}   value={stats?.total ?? 0}  loading={statsLoading} />
        <StatCard label={t("audit.today")}   value={todayCount}          loading={statsLoading} />
        <StatCard label={t("audit.logins")}  value={loginCount}          loading={statsLoading} />
        <StatCard label={t("audit.imports")} value={importCount}         loading={statsLoading} />
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: "var(--color-bg-card)",
        border: "1px solid var(--color-border-default)",
        borderRadius: "14px", padding: "16px",
        display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center",
      }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-tertiary)" }} />
          <input
            type="text"
            placeholder={t("audit.search_ph")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: "32px", width: "100%", boxSizing: "border-box" }}
          />
        </div>

        {/* Action filter */}
        <select value={action} onChange={(e) => setAction(e.target.value)} style={inputStyle}>
          <option value="">{t("audit.filter.action")}</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{ACTION_COLORS[a]?.label ?? a}</option>
          ))}
        </select>

        {/* Resource filter */}
        <select value={resource} onChange={(e) => setResource(e.target.value)} style={inputStyle}>
          <option value="">{t("audit.filter.resource")}</option>
          {RESOURCES.map((r) => (
            <option key={r} value={r}>{RESOURCE_LABELS[r] ?? r}</option>
          ))}
        </select>

        {/* Date range */}
        <DatePicker
          value={dateFrom}
          onChange={setDateFrom}
          placeholder={t("audit.filter.from")}
          maxDate={dateTo || undefined}
        />
        <DatePicker
          value={dateTo}
          onChange={setDateTo}
          placeholder={t("audit.filter.to")}
          minDate={dateFrom || undefined}
        />

        {/* Clear */}
        {(search || action || resource || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearch(""); setAction(""); setResource(""); setDateFrom(""); setDateTo(""); }}
            style={{ fontSize: "12px", color: "var(--color-text-tertiary)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{
        backgroundColor: "var(--color-bg-card)",
        border: "1px solid var(--color-border-default)",
        borderRadius: "14px", overflow: "hidden",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--color-border-default)", backgroundColor: "var(--color-label-bg)" }}>
                {[t("audit.col.time"), t("audit.col.user"), t("audit.col.action"), t("audit.col.resource"), t("audit.col.description"), t("audit.col.ip"), ""].map((col) => (
                  <th key={col} style={{ padding: "10px 12px", textAlign: "left", fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--color-text-tertiary)", whiteSpace: "nowrap" }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--color-border-default)" }}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} style={{ padding: "12px" }}>
                        <Skeleton w={j === 4 ? "180px" : "80px"} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "48px", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: "14px" }}>
                    {t("audit.no_logs")}
                  </td>
                </tr>
              ) : (
                logs.map((log) => <LogRow key={log._id} log={log} dark={dark} />)
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!logsLoading && pages > 1 && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px", borderTop: "1px solid var(--color-border-default)",
          }}>
            <span style={{ fontSize: "13px", color: "var(--color-text-tertiary)" }}>
              {total} total events
            </span>
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: "6px 12px", borderRadius: "6px", fontSize: "13px",
                  backgroundColor: "var(--color-label-bg)",
                  border: "1px solid var(--color-border-default)",
                  color: "var(--color-text-primary)",
                  cursor: page === 1 ? "not-allowed" : "pointer",
                  opacity: page === 1 ? 0.5 : 1,
                }}
              >
                ‹
              </button>
              {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      padding: "6px 12px", borderRadius: "6px", fontSize: "13px",
                      backgroundColor: p === page ? "#FFD600" : "var(--color-label-bg)",
                      border: "1px solid var(--color-border-default)",
                      color: p === page ? "#0D0D0D" : "var(--color-text-primary)",
                      fontWeight: p === page ? 700 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                style={{
                  padding: "6px 12px", borderRadius: "6px", fontSize: "13px",
                  backgroundColor: "var(--color-label-bg)",
                  border: "1px solid var(--color-border-default)",
                  color: "var(--color-text-primary)",
                  cursor: page === pages ? "not-allowed" : "pointer",
                  opacity: page === pages ? 0.5 : 1,
                }}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
