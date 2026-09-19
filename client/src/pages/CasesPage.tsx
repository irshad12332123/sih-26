import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  FileCheck2,
  FileText,
  Home,
  MapPin,
  ShieldAlert,
  User,
} from "lucide-react";
import { api, currentUser } from "../api";
import { PageHeader, ProgressBar, StatusBadge } from "../components/common";

type Case = {
  id: string;
  caseId: string;
  projectName: string;
  parcelId: string;
  externalParcelId?: string;
  surveyNumber?: string;
  village: string;
  state: string;
  district: string;
  stage: string;
  currentStage: string;
  progress: number;
  risk: string;
  priority?: string;
  status: string;
  officer: string;
};

type Detail = Case & {
  tasks: any[];
  activity: any[];
  parcel: any;
  project: any;
  compensation: any;
  possession: any;
  rr: any;
  assignedOfficer: any;
};

const stageDocRequirements: Record<string, string[]> = {
  "3A Preliminary Notification": ["Section 3A Gazette Publication"],
  "3C Objection Hearing": ["Objection Application (Form 3C)", "Hearing Minutes & Order"],
  "Field Verification": ["Field Verification Report", "Geo-tagged Site Photographs"],
  "Review & Approval": ["Competent Review Note"],
  "3D Declaration of Acquisition": ["Section 3D Declaration Gazette"],
  "3G Compensation Determination": ["Compensation Assessment Award"],
  "3H Deposit and Payment": ["PFMS Payment Advice", "Direct Benefit Transfer Receipt"],
  "3E Taking Possession": ["Possession Certificate (Form 3E)"],
  "R&R Completion": ["R&R Entitlement & Delivery Report"],
};

export function CasesPage() {
  const [items, setItems] = useState<Case[]>([]);
  const [q, setQ] = useState("");
  const refresh = () => api<Case[]>("/cases").then(setItems);

  useEffect(() => {
    refresh();
  }, []);

  const filtered = items.filter((c) =>
    `${c.caseId} ${c.projectName} ${c.parcelId} ${c.village} ${c.surveyNumber || ""}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  return (
    <>
      <PageHeader
        title="Land Acquisition Cases"
        description="Persistent canonical cases connected to authoritative references, field evidence, compensation, and R&R lifecycles."
      />

      <div className="filter-bar">
        <div className="field-search">
          ⌕<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by case ID, parcel ID, survey number, village…" />
        </div>
      </div>

      <div className="panel table-panel">
        <div className="table-top">
          <span>
            {filtered.length} Acquisition Cases <small>· WORKFLOW & GIS BACKED</small>
          </span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Case / Parcel</th>
                <th>Project</th>
                <th>Location</th>
                <th>Current Stage</th>
                <th>Progress</th>
                <th>Risk</th>
                <th>Responsible Officer</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link className="table-title mono" to={`/cases/${c.id}`}>
                      {c.caseId}
                      <span className="table-sub">
                        {c.parcelId} {c.surveyNumber ? `· Survey ${c.surveyNumber}` : ""}
                      </span>
                    </Link>
                  </td>
                  <td>{c.projectName}</td>
                  <td>{c.village}, {c.district}</td>
                  <td><strong style={{ fontSize: "12px", color: "#2563eb" }}>{c.stage || c.currentStage}</strong></td>
                  <td>
                    <div className="table-progress">
                      <span>{c.progress}%</span>
                      <ProgressBar value={c.progress} />
                    </div>
                  </td>
                  <td>
                    <span className={`risk-text ${(c.risk || "LOW").toLowerCase()}`}>
                      <i />{c.risk || "Low"}
                    </span>
                  </td>
                  <td><small>{c.officer}</small></td>
                  <td><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function CaseDetailsPage() {
  const { id } = useParams();
  const [item, setItem] = useState<Detail | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = () => api<Detail>(`/cases/${id}`).then(setItem);
  useEffect(() => {
    refresh();
  }, [id]);

  if (!item) return <div className="empty-state">Loading acquisition case…</div>;

  const active = item.tasks.find((t) => ["PENDING", "IN_PROGRESS", "OVERDUE"].includes(t.status));
  const docs = stageDocRequirements[item.currentStage] || ["Standard Acquisition Supporting Dossier"];

  const handleCompleteActiveTask = async () => {
    if (!active) return;
    try {
      setBusy(true);
      setError("");
      setMessage("");
      await api(`/tasks/${active.id}/complete`, {
        method: "POST",
        body: JSON.stringify({ remarks: "Completed from case management portal." }),
      });
      setMessage("Task completed and workflow advanced.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Task completion failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Link to="/cases" className="back-link">
        <ArrowLeft size={15} /> Back to cases
      </Link>

      <div className="detail-heading">
        <div>
          <div className="eyebrow">
            ACQUISITION CASE · {item.caseId}
          </div>
          <h1>
            {item.parcel?.parcelId || "Parcel"} (Survey {item.parcel?.surveyNumber}) Land Acquisition
          </h1>
          <p>
            {item.project?.name} · Village {item.parcel?.village}, {item.parcel?.district}, {item.parcel?.state}
          </p>
        </div>
        <div className="detail-actions">
          <StatusBadge status={item.status} />
          {active && (
            <button className="button button-primary" onClick={handleCompleteActiveTask} disabled={busy}>
              <CheckCircle2 size={16} /> Complete Current Stage
            </button>
          )}
        </div>
      </div>

      {message && <div className="login-note" style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}>{message}</div>}
      {error && <div className="login-note" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }}>{error}</div>}

      {/* Hero Banner */}
      <div className="case-banner">
        <div className="case-banner-main">
          <div className="case-big-id">
            {item.caseId}
            <span>Canonical N-LAMS Identifier</span>
          </div>
          <StatusBadge status={item.status} />
          <span className={`risk-text ${(item.risk || "LOW").toLowerCase()}`}>
            <i />{item.risk || "Low"} Risk
          </span>
        </div>
        <div className="case-banner-meta">
          <span>
            Current Stage
            <strong style={{ color: "#2563eb" }}>{item.currentStage}</strong>
          </span>
          <span>
            Responsible Officer
            <strong>{item.assignedOfficer?.displayName || "Assigned by jurisdiction"}</strong>
          </span>
        </div>
      </div>

      <div className="content-grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        {/* Left: Workflow Stages & Activity Timeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Workflow Tasks */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Configured Highway Workflow</h2>
                <p>National Highways Act, 1956 · High-integrity stage progression</p>
              </div>
            </div>
            <div className="case-list">
              {item.tasks.map((t: any) => (
                <div className="case-row" key={t.id}>
                  <div className="case-id">
                    <div className="case-symbol">
                      <FileCheck2 size={16} />
                    </div>
                    <div>
                      <strong>{t.stage?.name || "Workflow Stage"}</strong>
                      <span>
                        Legal basis: {t.stage?.legalSection ? `Section ${t.stage.legalSection}` : "Statutory policy"} · Due {new Date(t.dueAt).toLocaleDateString()}
                      </span>
                      {t.remarks && <small style={{ color: "#64748b", display: "block" }}>{t.remarks}</small>}
                    </div>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
            </div>
          </section>

          {/* Activity Feed & Timeline */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Case Activity & Audit Timeline ({item.activity?.length || 0})</h2>
                <p>Immutable event log tracking all transitions and approvals</p>
              </div>
            </div>
            <div style={{ padding: "14px 18px" }}>
              {item.activity && item.activity.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {item.activity.map((act: any) => (
                    <div
                      key={act.id}
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "flex-start",
                        borderLeft: "2px solid #2563eb",
                        paddingLeft: "12px",
                        position: "relative",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <strong style={{ fontSize: "12px", color: "#1e293b" }}>{act.eventType}</strong>
                          <small style={{ fontSize: "10px", color: "#94a0b1" }}>
                            {new Date(act.createdAt).toLocaleString()}
                          </small>
                        </div>
                        <p style={{ fontSize: "12px", color: "#475569", margin: "2px 0" }}>{act.message}</p>
                        <small style={{ fontSize: "10px", color: "#64748b" }}>
                          Actor: {act.actorName} ({act.actorRole})
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No timeline events recorded yet.</div>
              )}
            </div>
          </section>
        </div>

        {/* Right: Parcel Overview, Documents & Financials */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Parcel Overview */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Cadastral Parcel Overview</h2>
                <p>{item.parcel?.parcelId} · {item.parcel?.village}</p>
              </div>
            </div>
            <div className="parcel-metrics">
              <div>
                <span>Survey Number</span>
                <strong>{item.parcel?.surveyNumber}</strong>
              </div>
              <div>
                <span>Total Area</span>
                <strong>{item.parcel?.totalArea} ha</strong>
              </div>
              <div>
                <span>Required Area</span>
                <strong>{item.parcel?.requiredArea} ha</strong>
              </div>
              <div>
                <span>Source System</span>
                <strong>{item.parcel?.sourceSystem || "BhoomiRashi MOCK"}</strong>
              </div>
            </div>
          </section>

          {/* Document Checklist for Current Stage */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Stage Document Checklist</h2>
                <p>Required statutory compliance documents</p>
              </div>
            </div>
            <div style={{ padding: "12px 18px" }}>
              {docs.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#334155", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <CheckCircle2 size={15} color="#16a34a" />
                  <span>{d}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Compensation Card */}
          {item.compensation && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Compensation Status</h2>
                  <p>PFMS Direct Benefit Transfer</p>
                </div>
                <StatusBadge status={item.compensation.status} />
              </div>
              <div style={{ padding: "12px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>Assessed Amount</span>
                  <strong style={{ display: "block", fontSize: "14px", color: "#1e293b" }}>
                    ₹{item.compensation.assessedAmount.toLocaleString("en-IN")}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>Paid Amount</span>
                  <strong style={{ display: "block", fontSize: "14px", color: "#16a34a" }}>
                    ₹{item.compensation.paidAmount.toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>
            </section>
          )}

          {/* R&R Card */}
          {item.rr && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>R&R Delivery</h2>
                  <p>Rehabilitation entitlements</p>
                </div>
                <StatusBadge status={item.rr.status} />
              </div>
              <div style={{ padding: "12px 18px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>Eligible Families</span>
                  <strong style={{ display: "block", fontSize: "14px", color: "#1e293b" }}>
                    {item.rr.eligibleFamilies}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>Benefits Delivered</span>
                  <strong style={{ display: "block", fontSize: "14px", color: "#2563eb" }}>
                    {item.rr.benefitsDelivered} / {item.rr.eligibleFamilies}
                  </strong>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
