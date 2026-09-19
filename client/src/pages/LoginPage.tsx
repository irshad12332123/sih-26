import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowUpRight,
  CheckCircle2,
  Globe2,
  LockKeyhole,
  Search,
  ShieldCheck,
} from "lucide-react";
import { login } from "../api";

const demoAccounts = [
  { roleName: "National Admin (MoRTH)", email: "national@nlams.demo", pass: "National@123", desc: "National oversight, integrations & 3D declaration" },
  { roleName: "Project Officer (Ambala)", email: "project@nlams.demo", pass: "Project@123", desc: "Corridor alignment, parcel discovery & 3A/3H" },
  { roleName: "Field Officer (FO-AMB-01)", email: "field@nlams.demo", pass: "Field@123", desc: "On-site physical inspection & geo-tagged photos" },
  { roleName: "Reviewing Officer (REV-AMB-01)", email: "reviewer@nlams.demo", pass: "Reviewer@123", desc: "Evidence review, approval & correction requests" },
  { roleName: "District Officer (CALA)", email: "district@nlams.demo", pass: "District@123", desc: "Section 3C hearing, 3E possession & R&R" },
  { roleName: "Viewer (Public/Ministry)", email: "viewer@nlams.demo", pass: "Viewer@123", desc: "Read-only access across national dashboards" },
];

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("national@nlams.demo");
  const [password, setPassword] = useState("National@123");
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
    <div className="login-page">
      <div className="login-left">
        <div className="brand login-brand">
          <div className="brand-mark">
            <Globe2 size={21} />
          </div>
          <div>
            <strong>N-LAMS</strong>
            <span>National monitoring layer</span>
          </div>
        </div>
        <div className="login-copy">
          <div className="eyebrow">
            <span className="live-dot" /> SMART INDIA HACKATHON 2026 DEMO
          </div>
          <h1>National Land Acquisition & Management System</h1>
          <p>
            An orchestration, GIS, and monitoring layer connecting BhoomiRashi, State Land Records, PFMS, and role-based field operations.
          </p>
          <div className="login-proof">
            <div>
              <CheckCircle2 size={17} />
              <span>BhoomiRashi & PFMS mock adapters</span>
            </div>
            <div>
              <CheckCircle2 size={17} />
              <span>Alignment-driven candidate parcel discovery</span>
            </div>
            <div>
              <CheckCircle2 size={17} />
              <span>Geo-tagged field verification & review queue</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="login-footer">
            SIH 2026 Prototype · Demo Dataset
          </span>
          <Link to="/citizen" style={{ fontSize: "11px", color: "#60a5fa", display: "flex", alignItems: "center", gap: "4px" }}>
            <Search size={13} /> Citizen Status Portal →
          </Link>
        </div>
      </div>

      <div className="login-form-wrap">
        <div className="login-form">
          <div className="eyebrow">SECURE ROLE ACCESS</div>
          <h2>Sign in to N-LAMS</h2>
          <p>Select a 1-click demo role or sign in manually:</p>

          {/* Quick 1-click Role Switchers */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => quickLogin(acc.email, acc.pass)}
                disabled={busy}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                  background: email === acc.email ? "#eff6ff" : "#f8fafc",
                  border: email === acc.email ? "1px solid #3b82f6" : "1px solid #e2e8f0",
                  borderRadius: "6px",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div>
                  <strong style={{ display: "block", fontSize: "12px", color: "#1e293b" }}>{acc.roleName}</strong>
                  <span style={{ fontSize: "10px", color: "#64748b" }}>{acc.desc}</span>
                </div>
                <ArrowUpRight size={14} color="#3b82f6" />
              </button>
            ))}
          </div>

          <form onSubmit={submit}>
            <label className="input-label">
              Email Address
              <input value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="input-label">
              Password
              <div className="password-input">
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <LockKeyhole size={16} />
              </div>
            </label>

            {error && <div className="login-note" style={{ background: "#fef2f2", color: "#991b1b" }}>{error}</div>}

            <button
              type="submit"
              className="button button-primary full"
              disabled={busy}
              style={{ marginTop: "12px" }}
            >
              {busy ? "Signing in…" : "Sign In to Workspace"} <ArrowUpRight size={16} />
            </button>
          </form>

          <div className="login-note" style={{ marginTop: "12px" }}>
            <ShieldCheck size={15} /> Local authentication active for SIH demonstration. Production schema available in Supabase migrations.
          </div>
        </div>
      </div>
    </div>
  );
}
