import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FolderKanban, Users, Grid3X3,
  Upload, Brain, Building2, LogOut, Gauge, ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useLanguage } from "../../../context/LanguageContext";

interface SidebarProps {
  collapsed: boolean;
}

const navItems = [
  { to: "/dashboard",             icon: LayoutDashboard, key: "nav.overview",    end: true,  roles: null },
  { to: "/dashboard/projects",    icon: FolderKanban,    key: "nav.projects",                roles: null },
  { to: "/dashboard/pace",        icon: Gauge,           key: "nav.pace",                    roles: null },
  { to: "/dashboard/staff",       icon: Users,           key: "nav.staff",                   roles: null },
  { to: "/dashboard/assignments", icon: Grid3X3,         key: "nav.assignments",             roles: null },
  { to: "/dashboard/import",      icon: Upload,          key: "nav.import",                  roles: null },
  { to: "/dashboard/estimation",  icon: Brain,           key: "nav.estimation",              roles: null },
  { to: "/dashboard/clients",     icon: Building2,       key: "nav.clients",                 roles: null },
  { to: "/dashboard/audit-logs",  icon: ShieldCheck,     key: "nav.audit",                   roles: ["admin"] },
];

const Sidebar = ({ collapsed }: SidebarProps) => {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const { t }            = useLanguage();

  const initials = user?.name
    ? user.name.split(" ").slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? "").join("")
    : "?";

  const role = user?.role ?? "collaborator";

  return (
    <>
      {/* Sidebar */}
      <aside
        style={{
          width: collapsed ? "72px" : "256px",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          position: "sticky",
          top: 0,
          backgroundColor: "var(--color-bg-sidebar)",
          borderRight: "1px solid var(--color-border-default)",
          transition: "width 0.25s ease",
          overflow: "hidden",
        }}
      >
        {/* ── Logo ── */}
        <div
          style={{
            display: "flex", alignItems: "baseline",
            gap: "3px",
            padding: "24px 20px",
            overflow: "hidden",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          {collapsed ? (
            <span style={{ fontWeight: 900, fontSize: "22px", letterSpacing: "-0.02em", color: "#FFD600" }}>B</span>
          ) : (
            <>
              <span style={{ fontWeight: 900, fontSize: "22px", letterSpacing: "-0.02em", color: "#FFD600" }}>B2A</span>
              <span style={{ fontWeight: 400, fontSize: "22px", letterSpacing: "-0.02em", color: "var(--color-text-tertiary)" }}>Platform</span>
            </>
          )}
        </div>

        {/* ── Nav label ── */}
        {!collapsed && (
          <p
            style={{
              padding: "0 20px",
              fontSize: "10px", fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.18em",
              color: "var(--color-text-tertiary)",
              marginBottom: "8px", marginTop: "16px",
            }}
          >
            Navigation
          </p>
        )}

        {/* ── Nav items ── */}
        <nav
          style={{
            flex: 1, padding: "0 10px",
            overflowY: "auto", overflowX: "hidden",
            display: "flex", flexDirection: "column", gap: "2px",
            marginTop: collapsed ? "16px" : "0",
          }}
          aria-label="Navigation principale"
        >
          {navItems.filter(({ roles }) => !roles || roles.includes(role)).map(({ to, icon: Icon, key, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? t(key) : undefined}
              aria-label={t(key)}
              className={({ isActive }) =>
                [
                  "sidebar-nav-link",
                  isActive ? "sidebar-nav-link--active" : "",
                  collapsed ? "sidebar-nav-link--collapsed" : "",
                ].filter(Boolean).join(" ")
              }
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: collapsed ? 0 : "12px",
                padding: collapsed ? "10px" : "10px 12px",
                borderRadius: "10px",
                fontSize: "13.5px",
                fontWeight: 500,
                textDecoration: "none",
                transition: "background-color 0.15s, color 0.15s",
                borderLeft: isActive ? "3px solid var(--color-accent)" : "3px solid transparent",
                backgroundColor: isActive ? "var(--color-nav-active-bg)" : "transparent",
                color: isActive ? "var(--color-nav-active)" : "var(--color-nav-inactive)",
                justifyContent: collapsed ? "center" : "flex-start",
              })}
            >
              {({ isActive }) => (
                <>
                  <div
                    style={{
                      width: "32px", height: "32px", borderRadius: "10px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      backgroundColor: isActive ? "var(--color-accent-bg)" : "var(--color-label-bg)",
                      transition: "background-color 0.15s",
                    }}
                  >
                    <Icon style={{ width: "16px", height: "16px" }} />
                  </div>
                  {!collapsed && (
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t(key)}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── Divider ── */}
        <div style={{ margin: "0 16px 16px", borderTop: "1px solid var(--color-divider)" }} />

        {/* ── User card ── */}
        <div style={{ padding: "0 10px 20px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {!collapsed && (
            <button
              onClick={() => navigate("/dashboard/profile")}
              title="Mon profil"
              style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "12px",
                borderRadius: "10px",
                backgroundColor: "var(--color-label-bg)",
                width: "100%", border: "none", cursor: "pointer",
                textAlign: "left",
                transition: "background-color 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--color-nav-hover-bg)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--color-label-bg)"; }}
            >
              <div
                aria-hidden="true"
                style={{
                  width: "36px", height: "36px", borderRadius: "10px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  backgroundColor: "var(--color-avatar-bg)",
                  color: "var(--color-text-primary)",
                  fontWeight: 700, fontSize: "14px",
                  border: "1px solid var(--color-border-default)",
                }}
              >
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: "var(--color-text-primary)", fontSize: "14px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.2, margin: 0 }}>
                  {user?.name}
                </p>
                <span
                  style={{
                    display: "inline-block", marginTop: "3px",
                    fontSize: "10px", fontWeight: 600,
                    padding: "2px 6px", borderRadius: "4px",
                    textTransform: "capitalize",
                    backgroundColor: "var(--color-badge-bg)",
                    color: "var(--color-badge-text)",
                  }}
                >
                  {role}{user?.level ? ` · ${user.level}` : ""}
                </span>
              </div>
            </button>
          )}

          {/* Sign out */}
          <button
            onClick={() => logout()}
            aria-label="Se déconnecter"
            title={collapsed ? "Se déconnecter" : undefined}
            style={{
              width: "100%", display: "flex", alignItems: "center",
              gap: collapsed ? 0 : "12px",
              padding: collapsed ? "10px" : "10px 12px",
              borderRadius: "10px",
              fontSize: "13.5px", fontWeight: 500,
              color: "var(--color-text-secondary)",
              background: "none", border: "none", cursor: "pointer",
              transition: "background-color 0.15s, color 0.15s",
              textAlign: "left",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--color-danger-bg)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--color-danger)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-secondary)";
            }}
          >
            <div
              style={{
                width: "32px", height: "32px", borderRadius: "10px",
                backgroundColor: "var(--color-label-bg)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <LogOut style={{ width: "16px", height: "16px" }} />
            </div>
            {!collapsed && t("nav.signout")}
          </button>
        </div>
      </aside>

      {/* Hover styles injected via style tag — avoids JS-based hover on nav links */}
      <style>{`
        .sidebar-nav-link:hover:not(.sidebar-nav-link--active) {
          background-color: var(--color-nav-hover-bg) !important;
          color: var(--color-text-primary) !important;
        }
      `}</style>
    </>
  );
};

export default Sidebar;
