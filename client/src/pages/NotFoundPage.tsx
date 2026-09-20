import { Link, useLocation } from "react-router-dom";
import { Compass, LayoutDashboard } from "lucide-react";
import { currentUser, getRoleDashboardPath } from "../api";

/**
 * Catch-all screen. Without this, an unknown URL renders the portal shell with
 * an empty content area (the SPA rewrite sends every path to index.html).
 */
export function NotFoundPage() {
  const location = useLocation();
  const user = currentUser();
  const home = getRoleDashboardPath(user?.role);

  return (
    <div className="panel" style={{ padding: "44px 28px", textAlign: "center" }}>
      <div
        style={{
          width: "52px",
          height: "52px",
          borderRadius: "14px",
          background: "#eff6ff",
          color: "#2563eb",
          display: "grid",
          placeItems: "center",
          margin: "0 auto 14px",
        }}
      >
        <Compass size={24} />
      </div>
      <div className="eyebrow" style={{ marginBottom: "4px" }}>ERROR 404</div>
      <h1 style={{ font: "600 22px 'Space Grotesk'", margin: "0 0 8px", color: "#1e293b" }}>
        This page does not exist
      </h1>
      <p style={{ fontSize: "12.5px", color: "#64748b", margin: "0 auto 20px", maxWidth: "460px", lineHeight: 1.55 }}>
        No N-LAMS workspace is mapped to{" "}
        <code className="mono" style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
          {location.pathname}
        </code>
        . It may have been moved, or your role may not have access to it.
      </p>
      <Link to={home} className="button button-primary">
        <LayoutDashboard size={15} /> Back to my dashboard
      </Link>
    </div>
  );
}
