import { useEffect, useState, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import {
  Activity,
  Bell,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Database,
  FileCheck2,
  FileText,
  Globe2,
  HandCoins,
  LayoutDashboard,
  MapPinned,
  Menu,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { api, currentUser, login, logout, getRoleDashboardPath } from "../api";
import "../notifications.css";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  caseId?: string;
  projectId?: string;
  taskId?: string;
  readAt?: string;
  createdAt: string;
};

export function isRouteAllowedForRole(pathname: string, role?: string): boolean {
  if (!role) return false;
  if (role === "NATIONAL_ADMIN" || role === "SUPER_ADMIN") return true;

  const base = "/" + (pathname.split("/")[1] || "");

  switch (role) {
    case "FIELD_OFFICER":
      return ["/", "/field-tasks", "/cases", "/map", "/documents"].includes(base);
    case "REVIEWER":
      return ["/", "/review-queue", "/cases", "/map", "/documents"].includes(base);
    case "COMPENSATION_OFFICER":
      return ["/", "/compensation", "/cases", "/documents"].includes(base);
    case "COMPENSATION_REVIEWER":
    case "FINANCE_OFFICER":
      return ["/", "/compensation", "/cases", "/documents", "/audit"].includes(base);
    case "RR_OFFICER":
    case "RR_REVIEWER":
      return ["/", "/rr", "/cases", "/documents"].includes(base);
    case "PROJECT_OFFICER":
    case "PROJECT_AUTHORITY":
      return ["/", "/projects", "/cases", "/map", "/documents"].includes(base);
    case "DISTRICT_OFFICER":
      return ["/", "/projects", "/cases", "/review-queue", "/map", "/documents", "/compensation", "/rr"].includes(base);
    case "VIEWER":
      return ["/", "/projects", "/cases", "/map", "/reports", "/users", "/documents"].includes(base);
    default:
      return true;
  }
}

const demoRoleOptions = [
  { label: "National Admin", email: "national.admin@demo.nlams.gov", pass: "Demo@123", role: "NATIONAL_ADMIN", desc: "National monitoring, BhoomiRashi integration & governance" },
  { label: "Project Authority", email: "project.authority@demo.nlams.gov", pass: "Demo@123", role: "PROJECT_OFFICER", desc: "Create native projects, align corridors & submit" },
  { label: "District Officer", email: "district.officer@demo.nlams.gov", pass: "Demo@123", role: "DISTRICT_OFFICER", desc: "Administrative sanction & district authority oversight" },
  { label: "Field Officer (Ambala Tehsil)", email: "field.ambala@demo.nlams.gov", pass: "Demo@123", role: "FIELD_OFFICER", desc: "Ground inspection & geo-tagged photo evidence (Demo Kalan)" },
  { label: "Field Officer (Saha Tehsil)", email: "field.saha@demo.nlams.gov", pass: "Demo@123", role: "FIELD_OFFICER", desc: "Ground inspection (Chandpur Demo / Saha)" },
  { label: "Revenue Reviewer", email: "reviewer.ambala@demo.nlams.gov", pass: "Demo@123", role: "REVIEWER", desc: "Evidence dossier scrutiny & stage advancement" },
  { label: "Compensation Officer", email: "compensation.ambala@demo.nlams.gov", pass: "Demo@123", role: "COMPENSATION_OFFICER", desc: "Land valuation & compensation assessment" },
  { label: "Compensation Reviewer / Finance", email: "compensation.review@demo.nlams.gov", pass: "Demo@123", role: "COMPENSATION_REVIEWER", desc: "Award approval & automatic PFMS DBT disbursement" },
  { label: "R&R Officer", email: "rr.ambala@demo.nlams.gov", pass: "Demo@123", role: "RR_OFFICER", desc: "Affected/displaced families enumeration" },
  { label: "R&R Reviewer", email: "rr.review@demo.nlams.gov", pass: "Demo@123", role: "RR_REVIEWER", desc: "R&R entitlement package approval & delivery" },
  { label: "Possession Officer", email: "possession.ambala@demo.nlams.gov", pass: "Demo@123", role: "DISTRICT_OFFICER", desc: "Site possession & Form 3E handover" },
  { label: "Public / Ministry Observer", email: "viewer@demo.nlams.gov", pass: "Demo@123", role: "VIEWER", desc: "Read-only transparency & oversight" },
];

export function PortalLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = currentUser();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    // Route guard: if current route is not allowed for role, direct to their dashboard
    if (!isRouteAllowedForRole(location.pathname, user.role)) {
      navigate(getRoleDashboardPath(user.role), { replace: true });
    }
  }, [navigate, user, location.pathname]);

  return (
    <div className="app-shell">
      <Sidebar open={open} onClose={() => setOpen(false)} user={user} />
      <div className="main-shell">
        <Topbar onMenu={() => setOpen(true)} user={user} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Sidebar({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user?: ReturnType<typeof currentUser>;
}) {
  const userRole = user?.role;
  const isNationalAdmin = userRole === "NATIONAL_ADMIN" || userRole === "SUPER_ADMIN";
  const isProjectAuthority = userRole === "PROJECT_OFFICER" || userRole === "PROJECT_AUTHORITY";
  const isDistrictOfficer = userRole === "DISTRICT_OFFICER";
  const isFieldOfficer = userRole === "FIELD_OFFICER";
  const isReviewer = userRole === "REVIEWER";
  const isCompensationOfficer = userRole === "COMPENSATION_OFFICER";
  const isCompensationReviewer = userRole === "COMPENSATION_REVIEWER" || userRole === "FINANCE_OFFICER";
  const isRROfficer = userRole === "RR_OFFICER";
  const isRRReviewer = userRole === "RR_REVIEWER";
  const isViewer = userRole === "VIEWER";

  // Role-Specific Navigation Definitions
  let navItems: [string, string, any][] = [];

  if (isNationalAdmin) {
    navItems = [
      ["Dashboard", "/", LayoutDashboard],
      ["Projects", "/projects", BriefcaseBusiness],
      ["GIS Map", "/map", MapPinned],
      ["Reports & Analytics", "/reports", Activity],
      ["Master Authorities", "/users", Users],
      ["Integration Center", "/integrations", Database],
      ["Immutable Audit Logs", "/audit", ShieldCheck],
    ];
  } else if (isProjectAuthority) {
    navItems = [
      ["Dashboard", "/", LayoutDashboard],
      ["My Projects", "/projects", BriefcaseBusiness],
      ["Acquisition Cases", "/cases", FileCheck2],
      ["GIS Map", "/map", MapPinned],
      ["Document Library", "/documents", FileText],
    ];
  } else if (isDistrictOfficer) {
    navItems = [
      ["Dashboard", "/", LayoutDashboard],
      ["District Projects", "/projects", BriefcaseBusiness],
      ["District Cases", "/cases", FileCheck2],
      ["Review Queue", "/review-queue", UserCheck],
      ["GIS Map", "/map", MapPinned],
      ["Document Library", "/documents", FileText],
    ];
  } else if (isFieldOfficer) {
    navItems = [
      ["My Field Tasks", "/field-tasks", ClipboardCheck],
      ["Assigned Cases", "/cases", FileCheck2],
      ["GIS Map", "/map", MapPinned],
      ["Document Library", "/documents", FileText],
    ];
  } else if (isReviewer) {
    navItems = [
      ["Review Queue", "/review-queue", UserCheck],
      ["Cases Dossier", "/cases", FileCheck2],
      ["GIS Map", "/map", MapPinned],
      ["Document Library", "/documents", FileText],
    ];
  } else if (isCompensationOfficer) {
    navItems = [
      ["Compensation Queue", "/compensation", CircleDollarSign],
      ["Acquisition Cases", "/cases", FileCheck2],
      ["Document Library", "/documents", FileText],
    ];
  } else if (isCompensationReviewer) {
    navItems = [
      ["Award Approval & PFMS", "/compensation", CircleDollarSign],
      ["Acquisition Cases", "/cases", FileCheck2],
      ["Document Library", "/documents", FileText],
      ["Audit Logs", "/audit", ShieldCheck],
    ];
  } else if (isRROfficer) {
    navItems = [
      ["R&R Assessment", "/rr", Building2],
      ["Acquisition Cases", "/cases", FileCheck2],
      ["Document Library", "/documents", FileText],
    ];
  } else if (isRRReviewer) {
    navItems = [
      ["R&R Approval Queue", "/rr", Building2],
      ["Acquisition Cases", "/cases", FileCheck2],
      ["Document Library", "/documents", FileText],
    ];
  } else {
    // Default / Viewer
    navItems = [
      ["Dashboard", "/", LayoutDashboard],
      ["Projects", "/projects", BriefcaseBusiness],
      ["GIS Map", "/map", MapPinned],
      ["Reports & Analytics", "/reports", Activity],
      ["Master Authorities", "/users", Users],
      ["Document Library", "/documents", FileText],
    ];
  }

  return (
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="brand">
        <div className="brand-mark">
          <Globe2 size={20} />
        </div>
        <div>
          <strong>N-LAMS</strong>
          <span>National coordination layer</span>
        </div>
        <button className="icon-button mobile-close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className="demo-pill">
        <span className="live-dot" /> HARYANA SIH 2026 DEMO
      </div>
      <nav>
        <div className="nav-group">
          {navItems.map(([label, to, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={onClose}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label.includes("Tasks") && <b style={{ background: "#dc2626", color: "#fff" }}>Active</b>}
              {label.includes("Review") && <b style={{ background: "#2563eb", color: "#fff" }}>Active</b>}
            </NavLink>
          ))}
        </div>
      </nav>
      <div className="sidebar-footer">
        <div className="integration-note">
          <Activity size={15} />
          <div>
            <strong>Orchestration Layer</strong>
            <span>Authoritative systems remain source</span>
          </div>
        </div>
        <div className="profile-mini">
          <div className="avatar avatar-sm">
            {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : "NL"}
          </div>
          <div>
            <strong>{user?.displayName || "Signed in"}</strong>
            <span>{user?.designation || user?.department || "Haryana / Ambala Demo"}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Topbar({
  onMenu,
  user,
}: {
  onMenu: () => void;
  user: ReturnType<typeof currentUser>;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifPopover, setShowNotifPopover] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);
  const roleSwitcherRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const list = await api<Notification[]>("/notifications");
      setNotifications(list);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const handleDataChange = () => fetchNotifications();
    window.addEventListener("nlams:data-changed", handleDataChange);
    const interval = setInterval(fetchNotifications, 12000);
    return () => {
      window.removeEventListener("nlams:data-changed", handleDataChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowNotifPopover(false);
      }
      if (roleSwitcherRef.current && !roleSwitcherRef.current.contains(event.target as Node)) {
        setShowRoleSwitcher(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const markRead = async (id: string, item: Notification) => {
    try {
      await api(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
      setShowNotifPopover(false);
      if (item.caseId) {
        navigate(`/cases/${item.caseId}`);
      } else if (item.projectId) {
        navigate(`/projects/${item.projectId}`);
      } else if (item.taskId) {
        navigate(user?.role === "FIELD_OFFICER" ? "/field-tasks" : "/review-queue");
      }
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await api("/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
    } catch {
      // ignore
    }
  };

  const handleRoleSwitch = async (email: string, pass: string) => {
    try {
      const loggedUser = await login(email, pass);
      setShowRoleSwitcher(false);
      const targetDashboard = getRoleDashboardPath(loggedUser.role);
      navigate(targetDashboard);
    } catch {
      // ignore
    }
  };

  const handleResetDemo = async () => {
    if (!window.confirm("Reset demonstration state to clean baseline? Operational projects will be removed and master authority baseline preserved.")) {
      return;
    }
    try {
      setResetting(true);
      await api("/demo/reset", { method: "POST" });
      setResetMessage("Demo state reset to clean baseline!");
      setTimeout(() => {
        setResetMessage("");
        window.location.href = "/";
      }, 800);
    } catch (err) {
      alert("Reset failed");
    } finally {
      setResetting(false);
    }
  };

  const title = location.pathname.startsWith("/projects/")
    ? "Project Workspace"
    : location.pathname.startsWith("/cases/")
      ? "Acquisition Case"
      : location.pathname === "/"
        ? "Overview"
        : location.pathname === "/field-tasks"
          ? "My Field Tasks"
          : location.pathname === "/review-queue"
            ? "Review Queue"
            : location.pathname === "/users"
              ? "Master Authorities Registry"
              : location.pathname.slice(1).replace("-", " ");

  return (
    <header className="topbar">
      <button className="icon-button menu-button" onClick={onMenu}>
        <Menu size={21} />
      </button>
      <div className="crumb">
        <span>Portal</span>
        <ChevronRight size={14} />
        <strong>{title}</strong>
      </div>
      <div className="top-actions">
        {/* Reset Demo Button */}
        <button
          className="button button-secondary button-sm"
          onClick={handleResetDemo}
          disabled={resetting}
          title="Reset demonstration state for clean video recording"
          style={{ display: "flex", alignItems: "center", gap: "6px", color: "#dc2626", borderColor: "#fecaca" }}
        >
          <RotateCcw size={13} className={resetting ? "spin-icon" : ""} />
          {resetting ? "Resetting…" : resetMessage || "Reset Demo"}
        </button>

        {/* Global Search */}
        <div className="global-search">
          <span>⌕</span>
          <input
            placeholder="Search parcel, survey, case…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.currentTarget.value) {
                navigate(`/cases`);
              }
            }}
          />
        </div>

        {/* Notification Bell */}
        <div style={{ position: "relative" }} ref={popoverRef}>
          <button
            className={`icon-button notification ${unreadCount > 0 ? "has-unread" : ""}`}
            title="Notifications"
            onClick={() => setShowNotifPopover(!showNotifPopover)}
            style={{ position: "relative" }}
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-2px",
                  right: "-2px",
                  background: "#dc2626",
                  color: "#fff",
                  borderRadius: "10px",
                  padding: "1px 5px",
                  fontSize: "10px",
                  fontWeight: 700,
                }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifPopover && (
            <div className="notification-popover">
              <div className="notification-popover-head">
                <strong>Notifications ({unreadCount} unread)</strong>
                <button
                  className="button-link"
                  onClick={markAllRead}
                  disabled={unreadCount === 0}
                  style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "11px" }}
                >
                  Mark all read
                </button>
              </div>
              <div style={{ maxHeight: "360px", overflowY: "auto" }}>
                {notifications.length === 0 ? (
                  <div className="notification-empty">No notifications in your queue.</div>
                ) : (
                  notifications.map((item) => (
                    <button
                      key={item.id}
                      className={`notification-item ${!item.readAt ? "unread" : ""}`}
                      onClick={() => markRead(item.id, item)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong>{item.title}</strong>
                        {!item.readAt && (
                          <span style={{ height: "6px", width: "6px", borderRadius: "50%", background: "#2563eb" }} />
                        )}
                      </div>
                      <span>{item.message}</span>
                      <small>{new Date(item.createdAt).toLocaleTimeString()} · {new Date(item.createdAt).toLocaleDateString()}</small>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Role Switcher */}
        <div style={{ position: "relative" }} ref={roleSwitcherRef}>
          <div
            className="top-profile"
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            style={{ cursor: "pointer" }}
            title="Click to switch demo role perspective"
          >
            <div className="avatar">
              {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : "US"}
            </div>
            <div>
              <strong>{user?.displayName || "Signed in"}</strong>
              <span>{user?.designation ? `${user.designation.slice(0, 24)}…` : user?.role?.replace("_", " ")} ▾</span>
            </div>
          </div>

          {showRoleSwitcher && (
            <div
              style={{
                position: "absolute",
                top: "45px",
                right: "0",
                width: "320px",
                background: "#fff",
                border: "1px solid #dbe3ee",
                borderRadius: "10px",
                boxShadow: "0 14px 35px rgba(23, 36, 67, 0.17)",
                zIndex: 90,
                padding: "8px 0",
              }}
            >
              <div style={{ padding: "6px 14px", fontSize: "11px", fontWeight: 700, color: "#64748b", borderBottom: "1px solid #f1f5f9" }}>
                SWITCH DEMO ROLE PERSPECTIVE (SYNTHETIC)
              </div>
              <div style={{ maxHeight: "360px", overflowY: "auto" }}>
                {demoRoleOptions.map((opt) => (
                  <button
                    key={opt.email}
                    onClick={() => handleRoleSwitch(opt.email, opt.pass)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 14px",
                      background: user?.email === opt.email ? "#eff6ff" : "none",
                      border: "none",
                      fontSize: "12px",
                      color: user?.email === opt.email ? "#1d4ed8" : "#1e293b",
                      fontWeight: user?.email === opt.email ? 700 : 500,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>{opt.label}</span>
                      {user?.email === opt.email && <CheckCircle2 size={13} color="#1d4ed8" />}
                    </div>
                    <span style={{ display: "block", fontSize: "10px", color: "#64748b", fontWeight: 400, marginTop: "1px" }}>
                      {opt.desc}
                    </span>
                  </button>
                ))}
              </div>
              <div style={{ borderTop: "1px solid #f1f5f9", marginTop: "6px", padding: "6px 14px" }}>
                <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#dc2626",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
