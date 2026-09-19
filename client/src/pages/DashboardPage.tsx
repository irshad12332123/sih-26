import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Database,
  FileCheck2,
  FileText,
  LockKeyhole,
  MapPin,
  Plus,
  RotateCcw,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import { api, currentUser } from "../api";
import { StatusBadge, ProgressBar } from "../components/common";

type Summary = {
  totalProjects: number;
  activeProjects: number;
  totalCases: number;
  totalParcels: number;
  candidateParcels: number;
  acquiredParcels: number;
  landRequiredHa: number;
  landAcquiredHa: number;
  atRisk: number;
  pendingApprovals: number;
  pendingFieldVerifications: number;
  pendingReviews: number;
  compensationAssessed: number;
  compensationApproved: number;
  compensationPaid: number;
  compensationPending: number;
  affectedFamilies: number;
  eligibleFamilies: number;
  benefitsDelivered: number;
  rrPending: number;
  possessionCompleted: number;
};

type Project = {
  id: string;
  projectId: string;
  name: string;
  department: string;
  state: string;
  district: string;
  status: string;
  progress: number;
  cases: number;
  sourceSystem?: string;
  externalProjectId?: string;
  isNative?: boolean;
};

export function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const user = currentUser();

  const refreshData = () => {
    Promise.all([
      api<Summary>("/dashboard/summary"),
      api<Project[]>("/projects"),
    ])
      .then(([s, p]) => {
        setSummary(s);
        setProjects(p);
      })
      .catch((err) => {
        console.warn("Could not fetch dashboard summary:", err?.message || err);
      });
  };

  useEffect(() => {
    refreshData();
    window.addEventListener("nlams:data-changed", refreshData);
    return () => window.removeEventListener("nlams:data-changed", refreshData);
  }, []);

  const stats = summary
    ? [
        ["Total Projects", summary.totalProjects, BriefcaseBusiness],
        ["Acquisition Cases", summary.totalCases, FileCheck2],
        ["Candidate Parcels", summary.totalParcels, MapPin],
        ["Cases at Risk", summary.atRisk, AlertTriangle],
      ] as const
    : [];

  const role = user?.role || "NATIONAL_ADMIN";

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="live-dot" /> {user?.displayName ? `${user.displayName.toUpperCase()} WORKSPACE` : "LIVE ORCHESTRATION & MONITORING LAYER"}
          </div>
          <h1>{role === "PROJECT_OFFICER" ? "Project Authority Workspace" : role === "FIELD_OFFICER" ? "Field Officer Ground Operations" : role === "REVIEWER" ? "Revenue Scrutiny & Review Workspace" : role === "COMPENSATION_OFFICER" || role === "COMPENSATION_REVIEWER" ? "Compensation & Award Monitoring" : role === "RR_OFFICER" || role === "RR_REVIEWER" ? "Rehabilitation & Resettlement Portal" : role === "DISTRICT_OFFICER" ? "District Administrative Review (CALA)" : "National Land Acquisition Overview"}</h1>
          <p>
            {user?.designation ? `${user.designation} · ${user.organization || user.department}` : "Unified dashboard coordinating BhoomiRashi, Land Records, PFMS, field verification, compensation, and R&R."}
          </p>
        </div>
        <div className="heading-actions">
          {role === "PROJECT_OFFICER" ? (
            <Link className="button button-primary" to="/projects">
              <Plus size={16} /> Create Native Project
            </Link>
          ) : role === "FIELD_OFFICER" ? (
            <Link className="button button-primary" to="/field-tasks">
              <ClipboardCheck size={16} /> Open My Field Tasks
            </Link>
          ) : role === "REVIEWER" ? (
            <Link className="button button-primary" to="/review-queue">
              <UserCheck size={16} /> Open Review Queue
            </Link>
          ) : (
            <>
              <Link className="button button-secondary" to="/reports">
                View Reports
              </Link>
              <Link className="button button-primary" to="/projects">
                ＋ Projects Portfolio
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Role-Specific Action Banners */}
      {role === "PROJECT_OFFICER" && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "14px 18px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ color: "#166534", fontSize: "14px" }}>Project Authority Workspace Active (Side B Demo)</strong>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#15803d" }}>
              Ready to create a native Haryana Infrastructure Project, associate demo cadastral parcels from Ambala, and submit for automatic jurisdiction routing.
            </p>
          </div>
          <Link to="/projects" className="button button-primary button-sm">
            <Plus size={14} /> Create & Submit Project
          </Link>
        </div>
      )}

      {role === "FIELD_OFFICER" && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "14px 18px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ color: "#1e40af", fontSize: "14px" }}>Patwari / Field Survey Officer Workspace (Ambala)</strong>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#3b82f6" }}>
              Ground inspections assigned in Demo Kalan / Ambala Tehsil. Physical checklist and geo-tagged photographic evidence required.
            </p>
          </div>
          <Link to="/field-tasks" className="button button-primary button-sm">
            <ClipboardCheck size={14} /> Open My Field Tasks
          </Link>
        </div>
      )}

      {role === "REVIEWER" && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "14px 18px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ color: "#1e40af", fontSize: "14px" }}>Revenue Scrutiny Officer Workspace (Ambala)</strong>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#3b82f6" }}>
              Field verification dossiers submitted by Patwaris awaiting your scrutiny, review note, and stage advancement.
            </p>
          </div>
          <Link to="/review-queue" className="button button-primary button-sm">
            <UserCheck size={14} /> Open Review Queue
          </Link>
        </div>
      )}

      {role === "DISTRICT_OFFICER" && (
        <div style={{ background: "#fdf4ff", border: "1px solid #f5d0fe", borderRadius: "8px", padding: "14px 18px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ color: "#86198f", fontSize: "14px" }}>District Revenue Officer & CALA Ambala</strong>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#a21caf" }}>
              Administrative review and preliminary notification approvals require mandatory signed notification documents.
            </p>
          </div>
          <Link to="/cases" className="button button-primary button-sm">
            <FileCheck2 size={14} /> View District Cases
          </Link>
        </div>
      )}

      {(role === "COMPENSATION_OFFICER" || role === "COMPENSATION_REVIEWER") && (
        <div style={{ background: "#fefce8", border: "1px solid #fef08a", borderRadius: "8px", padding: "14px 18px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ color: "#854d0e", fontSize: "14px" }}>Compensation & DBT Disbursement Cell (Ambala)</strong>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#a16207" }}>
              Land valuation assessment, statutory award approval, and PFMS Direct Benefit Transfer reconciliation gateway.
            </p>
          </div>
          <Link to="/compensation" className="button button-primary button-sm">
            <CircleDollarSign size={14} /> Manage Compensation
          </Link>
        </div>
      )}

      {(role === "RR_OFFICER" || role === "RR_REVIEWER") && (
        <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "8px", padding: "14px 18px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ color: "#065f46", fontSize: "14px" }}>Rehabilitation & Resettlement Directorate</strong>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#047857" }}>
              Entitlement package determination, social impact assessments, and benefit delivery monitoring.
            </p>
          </div>
          <Link to="/rr" className="button button-primary button-sm">
            <Building2 size={14} /> Manage R&R Entitlements
          </Link>
        </div>
      )}

      {/* Trust & Architecture Banner (Side A vs Side B) */}
      <div className="trust-banner">
        <div className="trust-icon">
          <LockKeyhole size={18} />
        </div>
        <div>
          <strong>N-LAMS is an orchestration, GIS, and workflow decision-support layer.</strong>
          <span>
            BhoomiRashi and state land-records remain systems of record. External integrations are labelled as <strong>MOCK / DEMO ADAPTERS</strong>. Native projects demonstrate jurisdiction-aware officer routing and mandatory document compliance.
          </span>
        </div>
        <Link to="/integrations">
          View Integrations <ArrowUpRight size={15} />
        </Link>
      </div>

      {/* Top 4 KPI Cards */}
      <div className="stat-grid">
        {stats.map(([label, value, Icon]) => (
          <div className="stat-card" key={label}>
            <div className="stat-icon blue">
              <Icon size={19} />
            </div>
            <div className="stat-label">{label}</div>
            <strong className="stat-value">{value}</strong>
            <span className="stat-delta">Database-backed metric</span>
          </div>
        ))}
      </div>

      {/* Multi-column Grid */}
      <div className="content-grid dashboard-grid">
        {/* Left: Active Projects */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Monitored Infrastructure Projects</h2>
              <p>Native N-LAMS projects & BhoomiRashi synchronized corridors</p>
            </div>
          </div>
          <div className="attention-list">
            {projects.length === 0 ? (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "#64748b" }}>
                <p style={{ margin: "0 0 12px", fontSize: "13px" }}>No projects currently loaded in baseline state.</p>
                <Link to="/integrations" className="button button-secondary button-sm">
                  Go to Integration Center
                </Link>
              </div>
            ) : (
              projects.map((p) => (
                <Link to={`/projects/${p.id}`} className="attention-item" key={p.id}>
                  <div className={`risk-marker ${p.status === "Completed" ? "low" : "medium"}`} />
                  <div className="attention-main">
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <strong>{p.name}</strong>
                      <span style={{ fontSize: "10px", background: p.isNative ? "#eff6ff" : "#f1f5f9", color: p.isNative ? "#2563eb" : "#475569", padding: "1px 5px", borderRadius: "3px", fontWeight: 700 }}>
                        {p.isNative ? "NATIVE N-LAMS" : "BHOOMIRASHI MOCK"}
                      </span>
                    </div>
                    <span>
                      {p.department} · {p.district}, {p.state} {p.externalProjectId ? `· Ext ID: ${p.externalProjectId}` : `· ${p.projectId}`}
                    </span>
                  </div>
                  <div className="attention-meta">
                    <StatusBadge status={p.status} />
                    <span>{p.progress}% progress</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Right: Operational Lifecycle Totals */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Operational Lifecycle Totals</h2>
              <p>Real-time indicators across all stages</p>
            </div>
          </div>
          <div className="pulse-list">
            {summary && [
              ["Land Required", `${summary.landRequiredHa} ha`],
              ["Land Acquired", `${summary.landAcquiredHa} ha`],
              ["Compensation Assessed", `₹${summary.compensationAssessed.toLocaleString("en-IN")}`],
              ["Compensation Disbursed (PFMS)", `₹${summary.compensationPaid.toLocaleString("en-IN")}`],
              ["R&R Benefits Delivered", `${summary.benefitsDelivered} / ${summary.eligibleFamilies} families`],
              ["Site Possession Completed", `${summary.possessionCompleted} parcels`],
            ].map(([label, value]) => (
              <div className="pulse-row" key={String(label)}>
                <div className="pulse-icon">●</div>
                <div>
                  <strong>{label}</strong>
                  <span>Persistent N-LAMS records</span>
                </div>
                <b className="connection">{value}</b>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
