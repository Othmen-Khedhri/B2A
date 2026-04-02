import { Sun, Moon, Bell, ChevronRight, LayoutDashboard, FolderKanban, Users, Grid3X3, Upload, Brain, Building2, FileText } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";
import { useLanguage } from "../../../context/LanguageContext";
import { useLocation } from "react-router-dom";

interface HeaderProps {
  title: string;
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

const Header = ({ title }: HeaderProps) => {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useLanguage();
  const { pathname } = useLocation();

  const baseRoute = "/" + pathname.split("/").slice(1, 3).join("/");
  const PageIcon = routeIcons[baseRoute] ?? FileText;

  return (
    <header style={{
      height: "68px",
      padding: "0 32px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottom: "1px solid var(--color-border-default)",
      backgroundColor: "var(--color-bg-sidebar)",
      position: "sticky",
      top: 0,
      zIndex: 10,
      boxShadow: "var(--shadow-card)",
    }}>

      {/* ── Left: breadcrumb + title ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{
          width: "36px", height: "36px", borderRadius: "10px",
          backgroundColor: "var(--color-label-bg)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
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
        <div style={{
          display: "flex",
          backgroundColor: theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
          borderRadius: "10px",
          padding: "3px",
          gap: "2px",
        }}>
          {(["EN", "FR"] as const).map((l) => {
            const active = lang === l.toLowerCase();
            return (
              <button
                key={l}
                onClick={() => setLang(l.toLowerCase() as "en" | "fr")}
                style={{
                  padding: "5px 14px",
                  borderRadius: "7px",
                  fontSize: "12px", fontWeight: 700,
                  letterSpacing: "0.04em",
                  border: "none", cursor: "pointer",
                  transition: "all 0.15s",
                  backgroundColor: active ? "#FFD600" : "transparent",
                  color: active ? "#0D0D0D" : theme === "dark" ? "#9E9EA3" : "#6B6B6F",
                  boxShadow: active ? "0 1px 3px rgba(0,0,0,0.15)" : "none",
                }}
              >
                {l}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div style={{ width: "1px", height: "20px", backgroundColor: "var(--color-border-default)" }} />

        {/* Notifications */}
        <button
          style={{
            position: "relative", width: "36px", height: "36px",
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: "10px", color: "var(--color-text-secondary)",
            background: "none", border: "none", cursor: "pointer",
            transition: "background-color 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--color-label-bg)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
        >
          <Bell style={{ width: "18px", height: "18px" }} />
          <span style={{
            position: "absolute", top: "7px", right: "7px",
            width: "8px", height: "8px", borderRadius: "50%",
            backgroundColor: "#FFD600",
            boxShadow: "0 0 0 2px var(--color-bg-sidebar)",
          }} />
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          style={{
            width: "36px", height: "36px",
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: "10px", color: "var(--color-text-secondary)",
            background: "none", border: "none", cursor: "pointer",
            transition: "background-color 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--color-label-bg)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
        >
          {theme === "dark"
            ? <Sun style={{ width: "18px", height: "18px", color: "#F59E0B" }} />
            : <Moon style={{ width: "18px", height: "18px" }} />}
        </button>
      </div>
    </header>
  );
};

export default Header;
