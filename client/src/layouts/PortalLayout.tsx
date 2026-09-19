import { useEffect, useState, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import {
  Activity,
  Bell,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Database,
  Eye,
  FileCheck2,
  FileText,
  Globe2,
  LayoutDashboard,
  MapPinned,
  Menu,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { api, currentUser, login, logout } from "../api";
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

const demoRoleOptions = [
  { label: "National Admin (MoRTH)", email: "national@nlams.demo", pass: "National@123", role: "NATIONAL_ADMIN" },
  { label: "Project Officer (Ambala)", email: "project@nlams.demo", pass: "Project@123", role: "PROJECT_OFFICER" },
  { label: "District Officer (Ambala)", email: "district@nlams.demo", pass: "District@123", role: "DISTRICT_OFFICER" },
  { label: "Field Officer (FO-AMB-01)", email: "field@nlams.demo", pass: "Field@123", role: "FIELD_OFFICER" },
  { label: "Reviewer (REV-AMB-01)", email: "reviewer@nlams.demo", pass: "Reviewer@123", role: "REVIEWER" },
  { label: "Department Authority", email: "department@nlams.demo", pass: "Department@123", role: "DEPARTMENT_ADMIN" },
  { label: "Viewer (Read-only)", email: "viewer@nlams.demo", pass: "Viewer@123", role: "VIEWER" },
];

export function PortalLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const user = currentUser();

  useEffect(() => {
    if (!user) navigate("/login");
  }, [navigate, user]);

  return (
    <div className="app-shell">
      <Sidebar open={open} onClose={() => setOpen(false)} userRole={user?.role} />
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
  userRole,
}: {
  open: boolean;
  onClose: () => void;
  userRole?: string;
}) {
  const isFieldOfficer = userRole === "FIELD_OFFICER";
  const isReviewer = userRole === "REVIEWER";

  const navGroups = [
    [
      ["Dashboard", "/", LayoutDashboard],
      ...(isFieldOfficer
        ? [["My Field Tasks", "/field-tasks", ClipboardCheck] as const]
        : []),
      ...(isReviewer
        ? [["Review Queue", "/review-queue", UserCheck] as const]
        : []),
      ["Projects", "/projects", BriefcaseBusiness],
      ["Acquisition cases", "/cases", FileCheck2],
      ["GIS map", "/map", MapPinned],
    ],
    [
      ["Compensation", "/compensation", CircleDollarSign],
      ["R&R", "/rr", Building2],
      ["Citizen status", "/citizen", Search],
      ["Reports", "/reports", Activity],
    ],
    [
      ["Audit logs", "/audit", ShieldCheck],
      ["Integrations", "/integrations", Database],
    ],
  ] as const;

  return (
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="brand">
        <div className="brand-mark">
          <Globe2 size={20} />
        </div>
        <div>
          <strong>N-LAMS</strong>
          <span>National monitoring layer</span>
        </div>
        <button className="icon-button mobile-close" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <div className="demo-pill">
        <span className="live-dot" /> SIH 2026 DEMO
      </div>
      <nav>
        {navGroups.map((group, index) => (
          <div className="nav-group" key={index}>
            {index > 0 && <div className="nav-divider" />}
            {group.map(([label, to, Icon]) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={onClose}
                className={({ isActive }) =>
                  `nav-item ${isActive ? "active" : ""}`
                }
              >
                <Icon size={18} />
                <span>{label}</span>
                {label === "My Field Tasks" && <b style={{ background: "#dc2626", color: "#fff" }}>1</b>}
                {label === "Review Queue" && <b style={{ background: "#2563eb", color: "#fff" }}>1</b>}
              </NavLink>
            ))}
          </div>
        ))}
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
            {userRole ? userRole.slice(0, 2) : "NL"}
          </div>
          <div>
            <strong>{userRole || "Signed in"}</strong>
            <span>Haryana / Ambala Demo</span>
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
  const popoverRef = useRef<HTMLDivElement>(null);

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
    const interval = setInterval(fetchNotifications, 15000);
    return () => {
      window.removeEventListener("nlams:data-changed", handleDataChange);
      clearInterval(interval);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const markRead = async (id: string, item: Notification) => {
    try {
      await api(`/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
      if (item.caseId) {
        setShowNotifPopover(false);
        navigate(`/cases/${item.caseId}`);
      } else if (item.projectId) {
        setShowNotifPopover(false);
        navigate(`/projects/${item.projectId}`);
      }
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await api("/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() })),
      );
    } catch {
      // ignore
    }
  };

  const handleRoleSwitch = async (email: string, pass: string) => {
    try {
      await login(email, pass);
      setShowRoleSwitcher(false);
      window.location.reload();
    } catch {
      // ignore
    }
  };

  const title = location.pathname.startsWith("/projects/")
    ? "Project workspace"
    : location.pathname.startsWith("/cases/")
      ? "Acquisition case"
      : location.pathname === "/"
        ? "National overview"
        : location.pathname === "/field-tasks"
          ? "My Field Tasks"
          : location.pathname === "/review-queue"
            ? "My Review Queue"
            : location.pathname === "/citizen"
              ? "Citizen Portal (Prototype)"
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
        <div className="global-search">
          <span>⌕</span>
          <input
            placeholder="Search case, project, parcel, survey…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.currentTarget.value) {
                navigate(`/citizen?q=${encodeURIComponent(e.currentTarget.value)}`);
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
                  <div className="notification-empty">No notifications yet.</div>
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

        {/* Quick Role Switcher & Profile */}
        <div style={{ position: "relative" }}>
          <div
            className="top-profile"
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            style={{ cursor: "pointer" }}
            title="Click to switch demo role"
          >
            <div className="avatar">
              {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : "US"}
            </div>
            <div>
              <strong>{user?.displayName || "Not signed in"}</strong>
              <span>{user?.role?.replace("_", " ") || "SELECT ROLE"} ▾</span>
            </div>
          </div>

          {showRoleSwitcher && (
            <div
              style={{
                position: "absolute",
                top: "45px",
                right: "0",
                width: "280px",
                background: "#fff",
                border: "1px solid #dbe3ee",
                borderRadius: "10px",
                boxShadow: "0 14px 35px rgba(23, 36, 67, 0.17)",
                zIndex: 90,
                padding: "8px 0",
              }}
            >
              <div style={{ padding: "6px 14px", fontSize: "11px", fontWeight: 700, color: "#64748b", borderBottom: "1px solid #f1f5f9" }}>
                SWITCH DEMO ROLE PERSPECTIVE
              </div>
              {demoRoleOptions.map((opt) => (
                <button
                  key={opt.email}
                  onClick={() => handleRoleSwitch(opt.email, opt.pass)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "9px 14px",
                    background: user?.email === opt.email ? "#eff6ff" : "none",
                    border: "none",
                    fontSize: "12px",
                    color: user?.email === opt.email ? "#1d4ed8" : "#1e293b",
                    fontWeight: user?.email === opt.email ? 700 : 500,
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              ))}
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
