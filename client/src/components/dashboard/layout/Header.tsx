import { useState, useRef, useEffect, useCallback } from "react";
import { Sun, Moon, Bell, ChevronRight, LayoutDashboard, FolderKanban, Users, Grid3X3, Upload, Brain, Building2, FileText, X, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import { useLanguage } from "../../../context/LanguageContext";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../../services/api";

interface HeaderProps {
  title: string;
  onToggleSidebar?: () => void;
}

const routeIcons: Record<string, React.ElementType> = {
  "/dashboard":             LayoutDashboard,
  "/dashboard/projects":    FolderKanban,
  "/dashboard/staff":       Users,
  "/dashboard/assignments": Grid3X3,
  "/dashboard/import":      Upload,
  "/dashboard/estimation":  Brain,
  "/dashboard/clients":     Building2,
};

interface NotifItem {
  id: string;
  type: "warning" | "info" | "success" | "error";
  title: string;
  body: string;
  href?: string;
}

const notifIcons = {
  warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  info:    <Info          className="w-4 h-4 text-blue-500"  />,
  success: <CheckCircle   className="w-4 h-4 text-green-500" />,
  error:   <AlertTriangle className="w-4 h-4 text-red-500"   />,
};

const Header = ({ title, onToggleSidebar }: HeaderProps) => {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang }      = useLanguage();
  const { pathname }           = useLocation();
  const navigate               = useNavigate();

  const [notifOpen, setNotifOpen]         = useState(false);
  const [dismissed, setDismissed]         = useState<string[]>([]);
  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const notifRef                          = useRef<HTMLDivElement>(null);

  const baseRoute = "/" + pathname.split("/").slice(1, 3).join("/");
  const PageIcon  = routeIcons[baseRoute] ?? FileText;
  const unread    = notifications.filter(n => !dismissed.includes(n.id)).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get<{
        overBudget: { _id: string; name: string; clientName: string; paceIndexHours: number }[];
        pendingTimesheets: { count: number; topExperts: { name: string; count: number }[] };
        burnoutStaff: { _id: string; name: string }[];
        atRisk: { _id: string; name: string; clientName: string; paceIndexHours: number }[];
      }>("/dashboard/notifications");

      const items: NotifItem[] = [];

      for (const p of data.overBudget) {
        items.push({
          id: `overbudget-${p._id}`,
          type: "warning",
          title: "Budget dépassé",
          body: `${p.name} (${p.clientName}) — pace ${p.paceIndexHours.toFixed(2)}`,
          href: "/dashboard/pace",
        });
      }

      if (data.pendingTimesheets.count > 0) {
        items.push({
          id: "pending-timesheets",
          type: "info",
          title: `${data.pendingTimesheets.count} timesheets en attente`,
          body: data.pendingTimesheets.topExperts.map(e => `${e.name} (${e.count})`).join(", "),
          href: "/dashboard/overview",
        });
      }

      for (const e of data.burnoutStaff) {
        items.push({
          id: `burnout-${e._id}`,
          type: "error",
          title: "Risque burnout",
          body: e.name,
          href: `/dashboard/staff/${e._id}`,
        });
      }

      for (const p of data.atRisk) {
        items.push({
          id: `atrisk-${p._id}`,
          type: "info",
          title: "Projet à risque",
          body: `${p.name} — pace ${p.paceIndexHours.toFixed(2)}`,
          href: "/dashboard/pace",
        });
      }

      setNotifications(items);
    } catch {
      // Notifications are non-critical; silently ignore fetch errors
    }
  }, []);

  // Fetch on mount and every 5 minutes
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  return (
    <header
      style={{
        height: "68px",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--color-border-default)",
        backgroundColor: "var(--color-bg-sidebar)",
        position: "sticky",
        top: 0,
        zIndex: 10,
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* ── Left: breadcrumb ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            className="touch-target rounded-xl hover:bg-[var(--color-label-bg)] text-[var(--color-text-secondary)] transition-colors"
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
        <div
          style={{
            width: "36px", height: "36px", borderRadius: "10px",
            backgroundColor: "var(--color-label-bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <PageIcon style={{ width: "18px", height: "18px", color: "var(--color-text-secondary)" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-text-tertiary)" }}>B2A</span>
          <ChevronRight style={{ width: "14px", height: "14px", color: "var(--color-text-tertiary)" }} />
          <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>{title}</span>
        </div>
      </div>

      {/* ── Right: controls ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

        {/* Language toggle */}
        <div
          style={{
            display: "flex",
            backgroundColor: theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
            borderRadius: "10px",
            padding: "3px",
            gap: "2px",
          }}
          role="group"
          aria-label="Language selector"
        >
          {(["EN", "FR"] as const).map((l) => {
            const active = lang === l.toLowerCase();
            return (
              <button
                key={l}
                onClick={() => setLang(l.toLowerCase() as "en" | "fr")}
                aria-pressed={active}
                aria-label={`Switch to ${l}`}
                style={{
                  padding: "5px 14px",
                  borderRadius: "7px",
                  fontSize: "12px", fontWeight: 700,
                  letterSpacing: "0.04em",
                  border: "none", cursor: "pointer",
                  transition: "all 0.15s",
                  backgroundColor: active ? "var(--color-accent)" : "transparent",
                  color: active ? "var(--color-accent-text)" : theme === "dark" ? "#9E9EA3" : "#6B6B6F",
                  boxShadow: active ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
                  minHeight: "32px",
                }}
              >
                {l}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ width: "1px", height: "20px", backgroundColor: "var(--color-border-default)" }} />

        {/* ── Notifications ── */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <button
            onClick={() => setNotifOpen((v) => !v)}
            aria-label={`Notifications — ${unread} non lues`}
            aria-expanded={notifOpen}
            aria-haspopup="true"
            className="touch-target rounded-xl hover:bg-[var(--color-label-bg)] transition-colors"
            style={{
              position: "relative",
              color: "var(--color-text-secondary)",
              background: "none", border: "none", cursor: "pointer",
            }}
          >
            <Bell style={{ width: "18px", height: "18px" }} />
            {unread > 0 && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute", top: "10px", right: "10px",
                  width: "8px", height: "8px", borderRadius: "50%",
                  backgroundColor: "var(--color-accent)",
                  boxShadow: "0 0 0 2px var(--color-bg-sidebar)",
                }}
              />
            )}
          </button>

          {/* Notification panel */}
          {notifOpen && (
            <div
              role="dialog"
              aria-label="Notifications"
              style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0,
                width: "320px",
                backgroundColor: "var(--color-bg-sidebar)",
                border: "1px solid var(--color-border-default)",
                borderRadius: "14px",
                boxShadow: "var(--shadow-elevated)",
                zIndex: 50,
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "14px 16px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-border-default)" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text-primary)" }}>
                  Notifications {unread > 0 && <span style={{ marginLeft: "6px", padding: "1px 7px", borderRadius: "9999px", backgroundColor: "var(--color-accent)", color: "var(--color-accent-text)", fontSize: "11px" }}>{unread}</span>}
                </span>
                {unread > 0 && (
                  <button
                    onClick={() => setDismissed(notifications.map(n => n.id))}
                    style={{ fontSize: "11px", color: "var(--color-text-tertiary)", background: "none", border: "none", cursor: "pointer" }}
                  >
                    Tout marquer lu
                  </button>
                )}
              </div>
              <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                {notifications.filter(n => !dismissed.includes(n.id)).length === 0 ? (
                  <p style={{ padding: "24px 16px", textAlign: "center", fontSize: "13px", color: "var(--color-text-tertiary)" }}>
                    Aucune notification
                  </p>
                ) : (
                  notifications.map((n) => {
                    if (dismissed.includes(n.id)) return null;
                    return (
                      <div
                        key={n.id}
                        onClick={() => { if (n.href) { navigate(n.href); setNotifOpen(false); } }}
                        style={{
                          padding: "12px 16px",
                          display: "flex", gap: "10px", alignItems: "flex-start",
                          borderBottom: "1px solid var(--color-border-default)",
                          backgroundColor: "var(--color-bg-card)",
                          cursor: n.href ? "pointer" : "default",
                        }}
                      >
                        <div style={{ flexShrink: 0, marginTop: "1px" }}>{notifIcons[n.type]}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>{n.title}</p>
                          <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: "2px 0 0", lineHeight: 1.4 }}>{n.body}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDismissed(prev => [...prev, n.id]); }}
                          aria-label="Dismisser cette notification"
                          style={{ flexShrink: 0, background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", padding: "2px" }}
                        >
                          <X style={{ width: "13px", height: "13px" }} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Activer le mode clair" : "Activer le mode sombre"}
          className="touch-target rounded-xl hover:bg-[var(--color-label-bg)] transition-colors"
          style={{
            color: "var(--color-text-secondary)",
            background: "none", border: "none", cursor: "pointer",
          }}
        >
          {theme === "dark"
            ? <Sun  style={{ width: "18px", height: "18px", color: "#F59E0B" }} />
            : <Moon style={{ width: "18px", height: "18px" }} />}
        </button>
      </div>
    </header>
  );
};

export default Header;
