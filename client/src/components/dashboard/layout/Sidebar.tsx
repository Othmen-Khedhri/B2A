import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Grid3X3,
  Upload,
  Brain,
  Building2,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useLanguage } from "../../../context/LanguageContext";
import logo from "../../../assets/file.svg";

const navItems = [
  { to: "/dashboard",             icon: LayoutDashboard, key: "nav.overview",    end: true },
  { to: "/dashboard/projects",    icon: FolderKanban,    key: "nav.projects" },
  { to: "/dashboard/staff",       icon: Users,           key: "nav.staff" },
  { to: "/dashboard/assignments", icon: Grid3X3,         key: "nav.assignments" },
  { to: "/dashboard/import",      icon: Upload,          key: "nav.import" },
  { to: "/dashboard/estimation",  icon: Brain,           key: "nav.estimation" },
  { to: "/dashboard/clients",     icon: Building2,       key: "nav.clients" },
];

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const initials = user?.name
    ? user.name.split(" ").slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? "").join("")
    : "?";

  const role = user?.role ?? "collaborator";

  return (
    <aside style={{
      width: "256px",
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      position: "sticky",
      top: 0,
      backgroundColor: "var(--color-bg-sidebar)",
      borderRight: "1px solid var(--color-border-default)",
    }}>

      {/* ── Logo ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "24px 20px" }}>
        <div style={{
          width: "36px", height: "36px", borderRadius: "10px",
          backgroundColor: "var(--color-logo-bg)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(255,214,0,0.3)",
          flexShrink: 0,
        }}>
          <img src={logo} alt="B2A" style={{ width: "20px", height: "20px", objectFit: "contain", filter: "brightness(0)" }} />
        </div>
        <div style={{ lineHeight: 1 }}>
          <p style={{ color: "var(--color-platform-label)", fontWeight: 900, fontSize: "16px", letterSpacing: "-0.02em", margin: 0 }}>B2A</p>
          <p style={{ color: "var(--color-text-tertiary)", fontWeight: 600, fontSize: "11px", letterSpacing: "0.18em", textTransform: "uppercase", marginTop: "2px" }}>Platform</p>
        </div>
      </div>

      {/* ── Nav label ── */}
      <p style={{
        padding: "0 20px",
        fontSize: "10px", fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.18em",
        color: "var(--color-text-tertiary)",
        marginBottom: "8px", marginTop: "16px",
      }}>
        Navigation
      </p>

      {/* ── Nav items ── */}
      <nav style={{ flex: 1, padding: "0 12px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
        {navItems.map(({ to, icon: Icon, key, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 12px",
              borderRadius: "10px",
              fontSize: "13.5px",
              fontWeight: 500,
              textDecoration: "none",
              transition: "all 0.15s",
              borderLeft: isActive ? "3px solid var(--color-accent)" : "3px solid transparent",
              backgroundColor: isActive ? "var(--color-nav-active-bg)" : "transparent",
              color: isActive ? "var(--color-nav-active)" : "var(--color-nav-inactive)",
            })}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              if (!el.dataset.active) {
                el.style.backgroundColor = "var(--color-nav-hover-bg)";
                el.style.color = "var(--color-text-primary)";
              }
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              if (!el.dataset.active) {
                el.style.backgroundColor = "transparent";
                el.style.color = "var(--color-nav-inactive)";
              }
            }}
          >
            {({ isActive }) => (
              <>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "10px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  backgroundColor: isActive ? "var(--color-accent-bg)" : "var(--color-label-bg)",
                  transition: "all 0.15s",
                }}>
                  <Icon style={{ width: "16px", height: "16px" }} />
                </div>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t(key)}</span>
                {isActive && <ChevronRight style={{ width: "14px", height: "14px", opacity: 0.7, flexShrink: 0 }} />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Divider ── */}
      <div style={{ margin: "0 16px", borderTop: "1px solid var(--color-divider)", marginTop: "16px", marginBottom: "16px" }} />

      {/* ── User card ── */}
      <div style={{ padding: "0 12px 20px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "12px",
          padding: "12px",
          borderRadius: "10px",
          backgroundColor: "var(--color-label-bg)",
        }}>
          {/* Avatar */}
          <div style={{
            width: "36px", height: "36px", borderRadius: "10px",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            backgroundColor: "var(--color-avatar-bg)",
            color: "var(--color-text-primary)",
            fontWeight: 700, fontSize: "14px",
            border: "1px solid var(--color-border-default)",
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "var(--color-text-primary)", fontSize: "14px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.2, margin: 0 }}>{user?.name}</p>
            <span style={{
              display: "inline-block", marginTop: "3px",
              fontSize: "10px", fontWeight: 600,
              padding: "2px 6px", borderRadius: "4px",
              textTransform: "capitalize",
              backgroundColor: "var(--color-badge-bg)",
              color: "var(--color-badge-text)",
            }}>
              {role}{user?.level ? ` · ${user.level}` : ""}
            </span>
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={logout}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: "12px",
            padding: "10px 12px", borderRadius: "10px",
            fontSize: "13.5px", fontWeight: 500,
            color: "var(--color-text-secondary)",
            background: "none", border: "none", cursor: "pointer",
            transition: "all 0.15s",
            textAlign: "left",
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
          <div style={{
            width: "32px", height: "32px", borderRadius: "10px",
            backgroundColor: "var(--color-label-bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <LogOut style={{ width: "16px", height: "16px" }} />
          </div>
          {t("nav.signout")}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
