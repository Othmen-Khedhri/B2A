import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useLanguage } from "../../../context/LanguageContext";

const titleKeys: Record<string, string> = {
  "/dashboard":             "page.overview",
  "/dashboard/projects":    "page.projects",
  "/dashboard/staff":       "page.staff",
  "/dashboard/assignments": "page.assignments",
  "/dashboard/import":      "page.import",
  "/dashboard/estimation":  "page.estimation",
  "/dashboard/clients":     "page.clients",
  "/dashboard/audit-logs":  "page.audit",
  "/dashboard/profile":     "page.profile",
};

const DashboardLayout = () => {
  const { pathname } = useLocation();
  const { t }        = useLanguage();
  const [collapsed, setCollapsed] = useState(false);

  const titleKey = titleKeys[pathname] ??
    (pathname.includes("/projects/") ? "page.projects" :
     pathname.includes("/staff/")    ? "page.staff"    : "page.overview");
  const title = t(titleKey);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        backgroundColor: "var(--color-bg-page)",
        overflow: "hidden",
      }}
    >
      <Sidebar collapsed={collapsed} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Header title={title} onToggleSidebar={() => setCollapsed((v) => !v)} />
        <main
          style={{ flex: 1, overflowY: "auto", padding: "24px" }}
        >
          <div key={pathname} className="page-enter" style={{ minHeight: "100%" }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
