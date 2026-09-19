import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  LockKeyhole,
  MapPin,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { api, currentUser } from "../api";
import { StatusBadge } from "../components/common";

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
  status: string;
  progress: number;
  cases: number;
  sourceSystem?: string;
};

export function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const user = currentUser();

  useEffect(() => {
    Promise.all([
      api<Summary>("/dashboard/summary"),
      api<Project[]>("/projects"),
    ]).then(([s, p]) => {
      setSummary(s);
      setProjects(p);
    });
  }, []);

  const stats = summary
    ? [
        ["Total Projects", summary.totalProjects, BriefcaseBusiness],
        ["Acquisition Cases", summary.totalCases, FileCheck2],
        ["Candidate Parcels", summary.totalParcels, MapPin],
        ["Cases at Risk", summary.atRisk, AlertTriangle],
      ] as const
    : [];

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="live-dot" /> LIVE ORCHESTRATION & MONITORING LAYER
          </div>
          <h1>National Acquisition Overview</h1>
          <p>
            Unified dashboard coordinating BhoomiRashi, Land Records, PFMS, field verification, compensation, and R&R.
          </p>
        </div>
        <div className="heading-actions">
          <Link className="button button-secondary" to="/reports">
            View reports
          </Link>
          <Link className="button button-primary" to="/projects">
            ＋ New project
          </Link>
        </div>
      </div>

      {/* Trust & Architecture Banner */}
      <div className="trust-banner">
        <div className="trust-icon">
          <LockKeyhole size={18} />
        </div>
        <div>
          <strong>N-LAMS is an orchestration and monitoring layer.</strong>
          <span>
            BhoomiRashi and authoritative state land-records remain systems of record. All external adapters are clearly labelled as <strong>MOCK / DEMO ADAPTERS</strong> for prototype demonstration.
          </span>
        </div>
        <Link to="/integrations">
          View Integrations <ArrowUpRight size={15} />
        </Link>
      </div>

      {/* Quick Action Banner for Field Officer / Reviewer */}
      {user?.role === "FIELD_OFFICER" && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "14px 18px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ color: "#1e40af", fontSize: "14px" }}>Field Officer Workspace Active</strong>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#3b82f6" }}>
              You have 1 pending physical boundary inspection in Demo Village (Ambala).
            </p>
          </div>
          <Link to="/field-tasks" className="button button-primary button-sm">
            <ClipboardCheck size={14} /> Open My Field Tasks
          </Link>
        </div>
      )}

      {user?.role === "REVIEWER" && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "14px 18px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ color: "#1e40af", fontSize: "14px" }}>Reviewer Scrutiny Workspace Active</strong>
            <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#3b82f6" }}>
              Field verification dossier for PCL-00128 is awaiting your scrutiny and approval.
            </p>
          </div>
          <Link to="/review-queue" className="button button-primary button-sm">
            <UserCheck size={14} /> Open Review Queue
          </Link>
        </div>
      )}

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
              <h2>National Infrastructure Projects</h2>
              <p>Synchronized from BhoomiRashi mock catalog</p>
            </div>
          </div>
          <div className="attention-list">
            {projects.map((p) => (
              <Link to={`/projects/${p.id}`} className="attention-item" key={p.id}>
                <div className="risk-marker medium" />
                <div className="attention-main">
                  <strong>{p.name}</strong>
                  <span>
                    {p.department} · {p.state} {p.sourceSystem ? `· ${p.sourceSystem}` : ""}
                  </span>
                </div>
                <div className="attention-meta">
                  <StatusBadge status={p.status} />
                  <span>{p.progress}% progress · {p.cases} cases</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Right: Operational Breakdown */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Operational Lifecycle Totals</h2>
              <p>Current database-backed indicators</p>
            </div>
          </div>
          <div className="pulse-list">
            {summary && [
              ["Land Required", `${summary.landRequiredHa} ha`],
              ["Land Acquired", `${summary.landAcquiredHa} ha`],
              ["Compensation Assessed", `₹${summary.compensationAssessed.toLocaleString("en-IN")}`],
              ["Compensation Disbursed (PFMS)", `₹${summary.compensationPaid.toLocaleString("en-IN")}`],
              ["R&R Benefits Delivered", `${summary.benefitsDelivered} / ${summary.eligibleFamilies} families`],
              ["Possession Taken (3E)", `${summary.possessionCompleted} parcels`],
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
