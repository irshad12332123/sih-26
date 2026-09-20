import { FormEvent, useState, useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe2,
  Lock,
  Mail,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { login, getRoleDashboardPath, currentUser } from "../api";
import "../login.css";

interface DemoAccount {
  roleName: string;
  category: "Executive & CALA" | "Field & Scrutiny" | "Finance & R&R" | "All";
  email: string;
  pass: string;
  role: string;
  department: string;
  badgeBg: string;
  badgeColor: string;
  desc: string;
}

const demoAccounts: DemoAccount[] = [
  {
    roleName: "National Administrator",
    category: "Executive & CALA",
    email: "national.admin@demo.nlams.gov",
    pass: "Demo@123",
    role: "NATIONAL_ADMIN",
    department: "Ministry of Road Transport & Highways (MoRTH)",
    badgeBg: "rgba(37, 99, 235, 0.2)",
    badgeColor: "#60a5fa",
    desc: "National monitoring, BhoomiRashi integration, cross-state corridor governance & immutable audit trail.",
  },
  {
    roleName: "Project Authority",
    category: "Executive & CALA",
    email: "project.authority@demo.nlams.gov",
    pass: "Demo@123",
    role: "PROJECT_OFFICER",
    department: "Haryana State Infrastructure Development Authority",
    badgeBg: "rgba(22, 163, 74, 0.2)",
    badgeColor: "#4ade80",
    desc: "Native corridor planning, parcel selection from revenue pool & statutory submission for administrative review.",
  },
  {
    roleName: "District Revenue Officer & CALA",
    category: "Executive & CALA",
    email: "district.officer@demo.nlams.gov",
    pass: "Demo@123",
    role: "DISTRICT_OFFICER",
    department: "Office of District Collector, Ambala",
    badgeBg: "rgba(168, 85, 247, 0.2)",
    badgeColor: "#c084fc",
    desc: "Statutory sanction, administrative review, Form 3E site possession orders & district oversight.",
  },
  {
    roleName: "Patwari / Field Survey Officer (Ambala)",
    category: "Field & Scrutiny",
    email: "field.ambala@demo.nlams.gov",
    pass: "Demo@123",
    role: "FIELD_OFFICER",
    department: "Tehsil Ambala · Revenue Dept",
    badgeBg: "rgba(14, 165, 233, 0.2)",
    badgeColor: "#38bdf8",
    desc: "Ground cadastral inspection, boundary verification & geo-tagged photographic evidence (Demo Kalan).",
  },
  {
    roleName: "Field Survey Officer (Saha Tehsil)",
    category: "Field & Scrutiny",
    email: "field.saha@demo.nlams.gov",
    pass: "Demo@123",
    role: "FIELD_OFFICER",
    department: "Tehsil Saha · Revenue Dept",
    badgeBg: "rgba(14, 165, 233, 0.2)",
    badgeColor: "#38bdf8",
    desc: "Ground inspection for Saha jurisdiction parcels (Chandpur Demo / Saha).",
  },
  {
    roleName: "Revenue Scrutiny Officer / Reviewer",
    category: "Field & Scrutiny",
    email: "reviewer.ambala@demo.nlams.gov",
    pass: "Demo@123",
    role: "REVIEWER",
    department: "Sub-Divisional Magistrate (SDM) Office, Ambala",
    badgeBg: "rgba(245, 158, 11, 0.2)",
    badgeColor: "#fbbf24",
    desc: "Cadastral evidence dossier scrutiny, revenue note generation & stage advancement.",
  },
  {
    roleName: "Compensation Assessment Officer",
    category: "Finance & R&R",
    email: "compensation.ambala@demo.nlams.gov",
    pass: "Demo@123",
    role: "COMPENSATION_OFFICER",
    department: "District Land Acquisition & Valuation Cell",
    badgeBg: "rgba(249, 115, 22, 0.2)",
    badgeColor: "#fb923c",
    desc: "Market rate formula calculation, multiplier factors, solatium assessment & compensation determination.",
  },
  {
    roleName: "Compensation Reviewer / Finance Officer",
    category: "Finance & R&R",
    email: "compensation.review@demo.nlams.gov",
    pass: "Demo@123",
    role: "COMPENSATION_REVIEWER",
    department: "Treasury & PFMS Integration Cell",
    badgeBg: "rgba(239, 68, 68, 0.2)",
    badgeColor: "#f87171",
    desc: "Statutory compensation award approval & automatic PFMS Direct Benefit Transfer disbursement.",
  },
  {
    roleName: "R&R Settlement Officer",
    category: "Finance & R&R",
    email: "rr.ambala@demo.nlams.gov",
    pass: "Demo@123",
    role: "RR_OFFICER",
    department: "Directorate of Rehabilitation & Resettlement",
    badgeBg: "rgba(20, 184, 166, 0.2)",
    badgeColor: "#2dd4bf",
    desc: "Affected and displaced families enumeration, entitlement packaging & social impact assessment.",
  },
  {
    roleName: "R&R Approval Authority",
    category: "Finance & R&R",
    email: "rr.review@demo.nlams.gov",
    pass: "Demo@123",
    role: "RR_REVIEWER",
    department: "State R&R Commissionerate",
    badgeBg: "rgba(20, 184, 166, 0.2)",
    badgeColor: "#2dd4bf",
    desc: "R&R package statutory delivery sanction & rehabilitation assistance completion.",
  },
  {
    roleName: "Site Possession Officer",
    category: "Executive & CALA",
    email: "possession.ambala@demo.nlams.gov",
    pass: "Demo@123",
    role: "DISTRICT_OFFICER",
    department: "Office of the CALA / District Magistrate",
    badgeBg: "rgba(99, 102, 241, 0.2)",
    badgeColor: "#818cf8",
    desc: "Form 3E Site Possession & Handover certification, completing cadastral transfer.",
  },
  {
    roleName: "Public & Inter-Agency Observer",
    category: "Executive & CALA",
    email: "viewer@demo.nlams.gov",
    pass: "Demo@123",
    role: "VIEWER",
    department: "Ministry Transparency & Audit Cell",
    badgeBg: "rgba(148, 163, 184, 0.2)",
    badgeColor: "#cbd5e1",
    desc: "Read-only transparency dashboard, GIS corridor visualization & project status tracking.",
  },
];

export function LoginPage() {
  const navigate = useNavigate();
  // A visitor who already has a session should land on their workspace rather
  // than re-authenticating.
  const [existingUser] = useState(() => currentUser());
  const [email, setEmail] = useState("national.admin@demo.nlams.gov");
  const [password, setPassword] = useState("Demo@123");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  const filteredAccounts = useMemo(() => {
    return demoAccounts.filter((account) => {
      const matchesCategory =
        selectedCategory === "All" || account.category === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        account.roleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  async function submit(event?: FormEvent) {
    if (event) event.preventDefault();
    if (!email.trim() || !password) {
      setError("Enter both your official email / officer ID and portal password.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const user = await login(email.trim(), password);
      navigate(getRoleDashboardPath(user.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Please verify credentials.");
    } finally {
      setBusy(false);
    }
  }

  async function quickLogin(account: DemoAccount) {
    if (busy) return;
    setEmail(account.email);
    setPassword(account.pass);
    setBusy(true);
    setPendingEmail(account.email);
    setError("");
    try {
      const user = await login(account.email, account.pass);
      navigate(getRoleDashboardPath(user.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setBusy(false);
      setPendingEmail("");
    }
  }

  if (existingUser) {
    return <Navigate to={getRoleDashboardPath(existingUser.role)} replace />;
  }

  return (
    <div className="nlams-login-root">
      {/* Indian National Tri-Color Accent Line */}
      <div className="nlams-tricolor-bar" />

      {/* Top Header */}
      <header className="nlams-login-header">
        <div className="nlams-brand-container">
          <div className="nlams-brand-emblem">
            <Globe2 size={24} />
          </div>
          <div className="nlams-brand-text">
            <h1>
              N-LAMS <span>Portal</span>
            </h1>
            <p>National Land Acquisition & Monitoring System · GovTech Coordination Layer</p>
          </div>
        </div>

        <div className="nlams-header-badge">
          <span className="nlams-live-indicator" />
          <span>HARYANA STATE DEMONSTRATION · SIH 2026</span>
        </div>
      </header>

      {/* Main Login Box */}
      <main className="nlams-login-main">
        <div className="nlams-login-box">
          {/* Left Column: Sign In Form */}
          <section className="nlams-form-section">
            <div className="nlams-form-header">
              <h2>Officer Sign In</h2>
              <p>Enter your official credentials or select a 1-click role perspective on the right.</p>
            </div>

            {error && (
              <div className="nlams-error-banner" role="alert">
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={submit} className="nlams-login-form">
              <div className="nlams-input-group">
                <label htmlFor="login-email">Official Email / Officer ID</label>
                <div className="nlams-input-wrapper">
                  <div className="nlams-input-icon">
                    <Mail size={16} />
                  </div>
                  <input
                    id="login-email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@demo.nlams.gov"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="nlams-input-group">
                <label htmlFor="login-password">Portal Password</label>
                <div className="nlams-input-wrapper">
                  <div className="nlams-input-icon">
                    <Lock size={16} />
                  </div>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="nlams-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                className="nlams-submit-btn"
                type="submit"
                disabled={busy}
              >
                <span>{busy ? "Authenticating Session…" : "Sign in to Portal"}</span>
                <ArrowRight size={16} />
              </button>
            </form>

            <div className="nlams-demo-notice-card">
              <div className="nlams-notice-inner">
                <div className="nlams-notice-title">
                  <ShieldCheck size={14} />
                  <span>Demonstration Notice</span>
                </div>
                <p>
                  <strong>Synthetic Master Personas:</strong> Structured to demonstrate cross-jurisdictional routing, evidence scrutiny, statutory PFMS DBT disbursement, and Form 3E handover in the Haryana corridor.
                </p>
              </div>
            </div>
          </section>

          {/* Right Column: 1-Click Role Switcher */}
          <section className="nlams-roles-section">
            <div className="nlams-roles-header">
              <div className="nlams-roles-title">
                <h3>
                  <Users size={19} color="#3b82f6" />
                  <span>1-Click Demonstration Personas</span>
                </h3>
                <p>Click any officer to instantly sign in to their specific role dashboard</p>
              </div>
              <div className="nlams-password-pill">
                Pass: Demo@123
              </div>
            </div>

            {/* Category Filter Tabs & Search */}
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px", flexWrap: "wrap" }}>
              <div className="nlams-category-tabs" style={{ margin: 0, flex: 1 }}>
                {(["All", "Executive & CALA", "Field & Scrutiny", "Finance & R&R"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`nlams-category-btn ${selectedCategory === cat ? "active" : ""}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat === "All" ? `All Roles (${demoAccounts.length})` : cat}
                  </button>
                ))}
              </div>

              <div style={{ position: "relative", minWidth: "150px" }}>
                <Search size={13} style={{ position: "absolute", left: "9px", top: "9px", color: "#64748b" }} />
                <input
                  type="text"
                  placeholder="Filter role or dept…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    height: "30px",
                    width: "100%",
                    padding: "0 8px 0 28px",
                    fontSize: "11px",
                    background: "rgba(30, 41, 59, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "6px",
                    color: "#f8fafc",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Personas Scrollable List */}
            <div className="nlams-personas-list">
              {filteredAccounts.map((account) => {
                const isSelected = email === account.email;
                return (
                  <div
                    key={account.email}
                    role="button"
                    tabIndex={0}
                    aria-disabled={busy}
                    className={`nlams-persona-card ${isSelected ? "selected" : ""}`}
                    onClick={() => quickLogin(account)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        quickLogin(account);
                      }
                    }}
                    style={busy ? { opacity: 0.65, cursor: "progress" } : undefined}
                    title={`Click to sign in as ${account.roleName}`}
                  >
                    <div className="nlams-persona-info">
                      <div className="nlams-persona-top">
                        <span className="nlams-persona-name">{account.roleName}</span>
                        <span
                          className="nlams-role-badge"
                          style={{
                            background: account.badgeBg,
                            color: account.badgeColor,
                          }}
                        >
                          {account.role}
                        </span>
                        {isSelected && <CheckCircle2 size={13} color="#60a5fa" />}
                      </div>
                      <div className="nlams-persona-dept">{account.department}</div>
                      <div className="nlams-persona-desc">{account.desc}</div>
                      <div className="nlams-persona-email">{account.email}</div>
                    </div>

                    <div className="nlams-persona-action">
                      <button
                        type="button"
                        className="nlams-persona-btn"
                        disabled={busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          quickLogin(account);
                        }}
                      >
                        <span>{pendingEmail === account.email ? "Signing in…" : "Sign in"}</span>
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredAccounts.length === 0 && (
                <div style={{ textAlign: "center", padding: "30px 10px", color: "#94a3b8", fontSize: "12px" }}>
                  No demonstration personas match "{searchQuery}".
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="nlams-login-footer">
        <p>
          National Land Acquisition & Monitoring System (N-LAMS) · Smart India Hackathon 2026 Demonstration Platform · Ministry of Road Transport & Highways & State Revenue Departments
        </p>
      </footer>
    </div>
  );
}
