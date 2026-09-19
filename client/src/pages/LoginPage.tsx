import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowUpRight,
  CheckCircle2,
  Globe2,
  LockKeyhole,
  ShieldCheck,
  Users,
} from "lucide-react";
import { login } from "../api";

const demoAccounts = [
  { roleName: "National Administrator", email: "national.admin@demo.nlams.gov", pass: "Demo@123", role: "NATIONAL_ADMIN", desc: "Side A: BhoomiRashi integration & national oversight" },
  { roleName: "Project Authority", email: "project.authority@demo.nlams.gov", pass: "Demo@123", role: "PROJECT_OFFICER", desc: "Side B: Create native projects, select parcels & submit" },
  { roleName: "District Officer", email: "district.officer@demo.nlams.gov", pass: "Demo@123", role: "DISTRICT_OFFICER", desc: "Administrative sanction & district authority oversight" },
  { roleName: "Field Officer (Ambala Tehsil)", email: "field.ambala@demo.nlams.gov", pass: "Demo@123", role: "FIELD_OFFICER", desc: "Ground inspection & geo-tagged photo evidence (Demo Kalan)" },
  { roleName: "Field Officer (Saha Tehsil)", email: "field.saha@demo.nlams.gov", pass: "Demo@123", role: "FIELD_OFFICER", desc: "Ground inspection (Chandpur Demo / Saha)" },
  { roleName: "Revenue Reviewer", email: "reviewer.ambala@demo.nlams.gov", pass: "Demo@123", role: "REVIEWER", desc: "Scrutiny of evidence dossier & review note approval" },
  { roleName: "Compensation Officer", email: "compensation.ambala@demo.nlams.gov", pass: "Demo@123", role: "COMPENSATION_OFFICER", desc: "Land valuation & compensation assessment" },
  { roleName: "Compensation Reviewer / Finance", email: "compensation.review@demo.nlams.gov", pass: "Demo@123", role: "COMPENSATION_REVIEWER", desc: "Award approval & automatic PFMS DBT disbursement" },
  { roleName: "R&R Officer", email: "rr.ambala@demo.nlams.gov", pass: "Demo@123", role: "RR_OFFICER", desc: "Social entitlement & family enumeration" },
  { roleName: "R&R Reviewer", email: "rr.review@demo.nlams.gov", pass: "Demo@123", role: "RR_REVIEWER", desc: "R&R benefit delivery sanction" },
  { roleName: "Possession Officer", email: "possession.ambala@demo.nlams.gov", pass: "Demo@123", role: "DISTRICT_OFFICER", desc: "Site possession & Form 3E handover" },
  { roleName: "Public / Ministry Observer", email: "viewer@demo.nlams.gov", pass: "Demo@123", role: "VIEWER", desc: "Read-only transparency & oversight" },
];

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("national.admin@demo.nlams.gov");
  const [password, setPassword] = useState("Demo@123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event?: FormEvent) {
    if (event) event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  }

  async function quickLogin(eMail: string, pass: string) {
    setEmail(eMail);
    setPassword(pass);
    setBusy(true);
    setError("");
    try {
      await login(eMail, pass);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card" style={{ maxWidth: "1050px", display: "grid", gridTemplateColumns: "1.1fr 1.3fr", gap: "28px" }}>
        {/* Left: Login Form & Overview */}
        <div>
          <div className="login-badge">
            <Globe2 size={16} /> National Land Acquisition & Monitoring System
          </div>
          <h1 style={{ fontSize: "22px", margin: "10px 0 6px 0" }}>N-LAMS Portal</h1>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "0 0 16px 0" }}>
            Unified national coordination layer across infrastructure ministries and state revenue departments.
          </p>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={submit} className="login-form">
            <div className="form-group">
              <label>Official Email ID / Officer ID</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer@demo.nlams.gov"
                required
              />
            </div>
            <div className="form-group">
              <label>Demo Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button className="button button-primary" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
              <LockKeyhole size={16} /> {busy ? "Authenticating…" : "Sign in to Portal"}
            </button>
          </form>

          <div style={{ marginTop: "16px", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
              DEMONSTRATION NOTICE
            </div>
            <p style={{ fontSize: "11px", color: "#64748b", margin: 0, lineHeight: "1.4" }}>
              SYNTHETIC DEMO MASTER DATA — Officer roles, designations, and employee codes are synthetic demonstration personas structured to reflect the publicly documented Haryana administrative hierarchy.
            </p>
          </div>
        </div>

        {/* Right: 1-Click Role Switcher */}
        <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Users size={18} color="#2563eb" />
              <strong style={{ fontSize: "14px", color: "#1e293b" }}>SWITCH DEMO ROLE PERSPECTIVE (SYNTHETIC)</strong>
            </div>
            <span style={{ fontSize: "11px", color: "#16a34a", background: "#ecfdf5", padding: "2px 8px", borderRadius: "12px", fontWeight: 600 }}>
              Demo@123
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "480px", overflowY: "auto", paddingRight: "6px" }}>
            {demoAccounts.map((account) => (
              <div
                key={account.email}
                onClick={() => quickLogin(account.email, account.pass)}
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  background: email === account.email ? "#eff6ff" : "#fff",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <strong style={{ fontSize: "12px", color: email === account.email ? "#1d4ed8" : "#1e293b" }}>
                      {account.roleName}
                    </strong>
                    <span style={{ fontSize: "9px", background: "#f1f5f9", padding: "1px 5px", borderRadius: "4px", color: "#475569" }}>
                      {account.role}
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    {account.desc}
                  </div>
                  <div className="mono" style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
                    {account.email}
                  </div>
                </div>
                <button
                  type="button"
                  className="button button-secondary button-sm"
                  style={{ fontSize: "11px", padding: "4px 8px", flexShrink: 0 }}
                >
                  Sign in
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
