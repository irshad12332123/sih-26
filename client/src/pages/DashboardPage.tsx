import { useCallback, useEffect, useState, type ReactNode } from "react";
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
import { StatusBadge } from "../components/common";
import { Alert, ErrorBlock, LoadingBlock } from "../components/ui";

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

const number = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const inr = (value: unknown) => `₹${number(value).toLocaleString("en-IN")}`;

/** Role-specific call-to-action strip shown above the KPI row. */
function RoleBanner({
  tone,
  title,
  body,
  to,
  cta,
  icon,
}: {
  tone: { bg: string; border: string; title: string; body: string };
  title: string;
  body: string;
  to: string;
  cta: string;
  icon: ReactNode;
}) {
  return (
    <div
      className="role-banner"
      style={{ background: tone.bg, borderColor: tone.border }}
    >
      <div className="role-banner-copy">
        <strong style={{ color: tone.title }}>{title}</strong>
        <p style={{ color: tone.body }}>{body}</p>
      </div>
      <Link to={to} className="button button-primary button-sm">
        {icon} {cta}
      </Link>
    </div>
  );
}

export function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const user = currentUser();

  const refreshData = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const [s, p] = await Promise.all([
        api<Summary>("/dashboard/summary"),
        api<Project[]>("/projects"),
      ]);
      setSummary(s);
      setProjects(p || []);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load the national overview.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
    // Background refreshes must not flash the skeleton over live content.
    const handleChange = () => refreshData({ silent: true });
    window.addEventListener("nlams:data-changed", handleChange);
    return () => window.removeEventListener("nlams:data-changed", handleChange);
  }, [refreshData]);

  const stats = summary
    ? ([
        ["Total Projects", number(summary.totalProjects), BriefcaseBusiness],
        ["Acquisition Cases", number(summary.totalCases), FileCheck2],
        ["Candidate Parcels", number(summary.totalParcels), MapPin],
        ["Cases at Risk", number(summary.atRisk), AlertTriangle],
      ] as const)
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
        <RoleBanner
          tone={{ bg: "#f0fdf4", border: "#bbf7d0", title: "#166534", body: "#15803d" }}
          title="Project Authority Workspace Active (Side B Demo)"
          body="Ready to create a native Haryana Infrastructure Project, associate demo cadastral parcels from Ambala, and submit for automatic jurisdiction routing."
          to="/projects"
          cta="Create & Submit Project"
          icon={<Plus size={14} />}
        />
      )}

      {role === "FIELD_OFFICER" && (
        <RoleBanner
          tone={{ bg: "#eff6ff", border: "#bfdbfe", title: "#1e40af", body: "#3b82f6" }}
          title="Patwari / Field Survey Officer Workspace (Ambala)"
          body="Ground inspections assigned in Demo Kalan / Ambala Tehsil. Physical checklist and geo-tagged photographic evidence required."
          to="/field-tasks"
          cta="Open My Field Tasks"
          icon={<ClipboardCheck size={14} />}
        />
      )}

      {role === "REVIEWER" && (
        <RoleBanner
          tone={{ bg: "#eff6ff", border: "#bfdbfe", title: "#1e40af", body: "#3b82f6" }}
          title="Revenue Scrutiny Officer Workspace (Ambala)"
          body="Field verification dossiers submitted by Patwaris awaiting your scrutiny, review note, and stage advancement."
          to="/review-queue"
          cta="Open Review Queue"
          icon={<UserCheck size={14} />}
        />
      )}

      {role === "DISTRICT_OFFICER" && (
        <RoleBanner
          tone={{ bg: "#fdf4ff", border: "#f5d0fe", title: "#86198f", body: "#a21caf" }}
          title="District Revenue Officer & CALA Ambala"
          body="Administrative review and preliminary notification approvals require mandatory signed notification documents."
          to="/cases"
          cta="View District Cases"
          icon={<FileCheck2 size={14} />}
        />
      )}

      {(role === "COMPENSATION_OFFICER" || role === "COMPENSATION_REVIEWER") && (
        <RoleBanner
          tone={{ bg: "#fefce8", border: "#fef08a", title: "#854d0e", body: "#a16207" }}
          title="Compensation & DBT Disbursement Cell (Ambala)"
          body="Land valuation assessment, statutory award approval, and PFMS Direct Benefit Transfer reconciliation gateway."
          to="/compensation"
          cta="Manage Compensation"
          icon={<CircleDollarSign size={14} />}
        />
      )}

      {(role === "RR_OFFICER" || role === "RR_REVIEWER") && (
        <RoleBanner
          tone={{ bg: "#ecfdf5", border: "#a7f3d0", title: "#065f46", body: "#047857" }}
          title="Rehabilitation & Resettlement Directorate"
          body="Entitlement package determination, social impact assessments, and benefit delivery monitoring."
          to="/rr"
          cta="Manage R&R Entitlements"
          icon={<Building2 size={14} />}
        />
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

      <Alert tone="error" message={error} onDismiss={() => setError("")} />

      {/* Top 4 KPI Cards */}
      <div className="stat-grid">
        {loading && !summary
          ? [0, 1, 2, 3].map((index) => (
              <div className="stat-card skeleton skeleton-card" key={index} aria-hidden="true" />
            ))
          : stats.map(([label, value, Icon]) => (
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
            {loading && projects.length === 0 ? (
              <LoadingBlock label="Loading monitored projects…" />
            ) : error && projects.length === 0 ? (
              <ErrorBlock message={error} onRetry={() => refreshData()} />
            ) : projects.length === 0 ? (
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
            {!summary && loading && <LoadingBlock label="Loading lifecycle totals…" />}
            {!summary && !loading && (
              <div className="empty-state">Lifecycle totals are unavailable right now.</div>
            )}
            {summary && [
              ["Land Required", `${number(summary.landRequiredHa)} ha`],
              ["Land Acquired", `${number(summary.landAcquiredHa)} ha`],
              ["Compensation Assessed", inr(summary.compensationAssessed)],
              ["Compensation Disbursed (PFMS)", inr(summary.compensationPaid)],
              [
                "R&R Benefits Delivered",
                `${number(summary.benefitsDelivered)} / ${number(summary.eligibleFamilies)} families`,
              ],
              ["Site Possession Completed", `${number(summary.possessionCompleted)} parcels`],
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
