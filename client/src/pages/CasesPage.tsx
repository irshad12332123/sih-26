import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
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
  UploadCloud,
  User,
} from "lucide-react";
import { api } from "../api";
import { PageHeader, ProgressBar, StatusBadge } from "../components/common";
import { Alert, ErrorBlock, LoadingBlock, Modal, TableLoadingRow } from "../components/ui";
import type { Case, DocumentRecord } from "../types";

type Detail = Case & {
  tasks: any[];
  activity?: any[];
  parcel: any;
  project: any;
  compensation: any;
  possession: any;
  rr: any;
  documents: DocumentRecord[];
  assignedOfficer: any;
};

const stageDocRequirements: Record<string, string[]> = {
  "Project Submission": ["Project Feasibility Alignment Map", "Baseline Cadastral Schedule"],
  "Administrative Review & Preliminary Notification": ["Preliminary Statutory Notification", "Administrative Sanction Order"],
  "Administrative Review": ["Preliminary Statutory Notification", "Administrative Sanction Order"],
  "Field Inspection": ["Field Inspection Report", "Geo-tagged Site Photographs"],
  "Field Verification": ["Field Inspection Report", "Geo-tagged Site Photographs"],
  "Evidence Scrutiny & Approval": ["Competent Authority Scrutiny & Verification Note"],
  "Field Verification Scrutiny & Approval": ["Competent Authority Scrutiny & Verification Note"],
  "Compensation Assessment": ["Compensation Assessment Schedule", "Market Valuation Matrix"],
  "Land Valuation & Compensation Assessment": ["Compensation Assessment Schedule", "Market Valuation Matrix"],
  "Compensation Award Approval": ["Statutory Compensation Award Declaration", "Competent Approval Order"],
  "Statutory Compensation Award Approval": ["Statutory Compensation Award Declaration", "Competent Approval Order"],
  "Disbursement & PFMS Payment": ["PFMS Direct Benefit Transfer Advice", "Disbursement Summary Receipt"],
  "Disbursement & DBT Payment": ["PFMS Direct Benefit Transfer Advice", "Disbursement Summary Receipt"],
  "R&R Assessment & Social Entitlement": ["Affected Families Enumeration Schedule", "Resettlement Action Plan"],
  "R&R Entitlements Assessment": ["Affected Families Enumeration Schedule", "Resettlement Action Plan"],
  "R&R Package Approval & Delivery": ["R&R Entitlement Delivery Sanction Order"],
  "Site Possession & Handover": ["Site Possession Certificate", "Panchnama of Physical Handover"],
  "Taking Site Possession (Form 3E)": ["Site Possession Certificate", "Panchnama of Physical Handover"],
  "Project Completion & Cadastral Handover": ["Corridor Handover Certificate", "Cadastral Record Update Order"],
  "Project Completion & Cadastral Closure": ["Corridor Handover Certificate", "Cadastral Record Update Order"],
};

export function CasesPage() {
  const [items, setItems] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // The topbar search deep-links here with ?q=…; keep the two in sync.
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") || "";

  const setQ = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("q", value);
    else next.delete("q");
    setSearchParams(next, { replace: true });
  };

  const refresh = async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      setItems((await api<Case[]>("/cases")) || []);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load acquisition cases.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const onChange = () => refresh({ silent: true });
    window.addEventListener("nlams:data-changed", onChange);
    return () => window.removeEventListener("nlams:data-changed", onChange);
  }, []);

  const filtered = useMemo(
    () =>
      items.filter((c) =>
        `${c.caseId} ${c.projectName || ""} ${c.parcelId} ${(c as any).parcelNumber || ""} ${c.village || ""} ${c.district || ""} ${c.surveyNumber || ""} ${c.officer || ""}`
          .toLowerCase()
          .includes(q.trim().toLowerCase()),
      ),
    [items, q],
  );

  return (
    <>
      <PageHeader
        title="Land Acquisition Cases"
        description="Persistent canonical cases connected to authoritative references, field evidence, compensation, and R&R lifecycles."
      />

      <Alert tone="error" message={error} onDismiss={() => setError("")} />

      <div className="filter-bar">
        <div className="field-search">
          ⌕<input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by case ID, parcel ID, survey number, village…"
            aria-label="Search acquisition cases"
          />
        </div>
        {q && (
          <button className="button button-secondary button-sm" onClick={() => setQ("")}>
            Clear search
          </button>
        )}
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
              {loading && items.length === 0 ? (
                <TableLoadingRow colSpan={8} label="Loading acquisition cases…" />
              ) : error && items.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 0 }}>
                    <ErrorBlock message={error} onRetry={() => refresh()} />
                  </td>
                </tr>
              ) : filtered.length === 0 && q ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "36px 20px", color: "#64748b", fontSize: "12.5px" }}>
                    No acquisition cases match “{q}”.
                    <button className="button button-secondary button-sm" style={{ marginLeft: "8px" }} onClick={() => setQ("")}>
                      Clear search
                    </button>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div style={{ maxWidth: "440px", margin: "0 auto" }}>
                      <div style={{ fontSize: "28px", marginBottom: "8px" }}>📋</div>
                      <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", margin: "0 0 6px" }}>
                        No Acquisition Cases Found
                      </h3>
                      <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 16px", lineHeight: "1.5" }}>
                        Cases are created automatically when an external project is synchronized (Side A) or when a native project is submitted (Side B).
                      </p>
                      <Link to="/projects" className="button button-primary button-sm">
                        View Projects Portfolio
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link className="table-title mono" to={`/cases/${c.id}`}>
                        {c.caseId}
                        <span className="table-sub">
                          {c.parcelId} {c.surveyNumber ? `· Survey ${c.surveyNumber}` : ""}
                        </span>
                      </Link>
                    </td>
                    <td>{c.projectName || "—"}</td>
                    <td>{[c.village, c.district].filter(Boolean).join(", ") || "—"}</td>
                    <td><strong style={{ fontSize: "12px", color: "#2563eb" }}>{c.currentStage || c.stage}</strong></td>
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
                    <td><small>{c.officer || "Assigned by jurisdiction"}</small></td>
                    <td><StatusBadge status={c.status} /></td>
                  </tr>
                ))
              )}
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
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docFileName, setDocFileName] = useState("");

  const refresh = async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const detail = await api<Detail>(`/cases/${id}`);
      setItem(detail);
      // The detail payload carries the timeline, but fall back to the
      // dedicated endpoint so the feed still works against older servers.
      if (Array.isArray(detail.activity)) {
        setActivity(detail.activity);
      } else {
        setActivity(await api<any[]>(`/cases/${id}/timeline`).catch(() => []));
      }
      setLoadError("");
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "This acquisition case could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading && !item) {
    return (
      <section className="panel">
        <LoadingBlock label="Loading acquisition case…" />
      </section>
    );
  }

  if (!item) {
    return (
      <>
        <Link to="/cases" className="back-link">
          <ArrowLeft size={15} /> Back to cases
        </Link>
        <section className="panel">
          <ErrorBlock
            message={loadError || `No acquisition case found for reference “${id}”.`}
            onRetry={() => refresh()}
          />
        </section>
      </>
    );
  }

  const tasks: any[] = Array.isArray(item.tasks) ? item.tasks : [];
  const active = tasks.find((t) => ["PENDING", "IN_PROGRESS", "OVERDUE"].includes(t.status));
  const docsReq = stageDocRequirements[item.currentStage] || ["Standard Acquisition Supporting Dossier"];
  const attachedDocs = item.documents || [];

  const handleCompleteActiveTask = async () => {
    try {
      setBusy(true);
      setError("");
      setMessage("");
      let res: any;
      if (active) {
        res = await api(`/tasks/${active.id}/complete`, {
          method: "POST",
          body: JSON.stringify({ remarks: `Approved and completed from case management portal.` }),
        });
      } else {
        res = await api(`/cases/${item.id}/advance`, {
          method: "POST",
          body: JSON.stringify({ remarks: `Stage advanced from case management portal.` }),
        });
      }
      setMessage(res?.message || "Stage completed and workflow routed to next stage successfully.");
      await refresh({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stage completion failed");
    } finally {
      setBusy(false);
    }
  };

  const handleAttachDocument = async () => {
    if (!docTitle.trim() || !docFileName.trim()) {
      setError("Provide both a document title and a file name before attaching.");
      return;
    }
    try {
      setBusy(true);
      setError("");
      await api("/documents", {
        method: "POST",
        body: JSON.stringify({
          caseId: item.id,
          parcelId: item.parcel?.parcelId,
          projectId: item.projectId,
          workflowStage: item.currentStage,
          documentType: "OTHER",
          title: docTitle,
          fileName: docFileName,
          mandatory: true,
          approvalRequired: true,
          remarks: "DEMO / SYNTHETIC DOCUMENT — Attached from Case Workspace",
        }),
      });
      setShowUploadModal(false);
      setDocTitle("");
      setDocFileName("");
      setMessage("Document attached successfully.");
      await refresh({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
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
          {item.status !== "Completed" && (
            <button className="button button-primary" onClick={handleCompleteActiveTask} disabled={busy}>
              <CheckCircle2 size={16} /> Complete Current Stage
            </button>
          )}
        </div>
      </div>

      <Alert tone="success" message={message} onDismiss={() => setMessage("")} />
      <Alert tone="error" message={error} onDismiss={() => setError("")} />
      <Alert tone="warning" message={loadError} onDismiss={() => setLoadError("")} />

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
            <strong>{item.assignedOfficer?.displayName || item.officer || "Assigned by jurisdiction"}</strong>
          </span>
        </div>
      </div>

      <div className="detail-grid">
        {/* Left: Workflow Stages & Activity Timeline */}
        <div className="stack-20">
          {/* Workflow Tasks */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Statutory Workflow Progress</h2>
                <p>Jurisdiction-aware stage progression & officer assignments</p>
              </div>
            </div>
            <div className="case-list">
              {tasks.length === 0 && (
                <div className="empty-state" style={{ padding: "28px 16px" }}>
                  No workflow tasks have been raised for this case yet.
                </div>
              )}
              {tasks.map((t: any) => (
                <div className="case-row" key={t.id}>
                  <div className="case-id">
                    <div className="case-symbol">
                      <FileCheck2 size={16} />
                    </div>
                    <div>
                      <strong>{t.stage?.name || "Workflow Stage"}</strong>
                      <span>
                        Legal basis: {t.stage?.legalSection ? t.stage.legalSection : "Statutory policy"} · Due {t.dueAt ? new Date(t.dueAt).toLocaleDateString() : "—"}
                      </span>
                      {t.assignedUser && (
                        <small style={{ color: "#2563eb", display: "block" }}>
                          Officer: {t.assignedUser.displayName} ({t.assignedUser.designation})
                        </small>
                      )}
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
                <h2>Chronological Case Activity Timeline ({activity.length})</h2>
                <p>Immutable event trail tracking all transitions, reviews, and documents</p>
              </div>
            </div>
            <div style={{ padding: "14px 18px" }}>
              {activity.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {activity.map((act: any) => (
                    <div
                      key={act.id}
                      style={{
                        display: "flex",
                        gap: "10px",
                        alignItems: "flex-start",
                        borderLeft: "2px solid #2563eb",
                        paddingLeft: "12px",
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
                <div className="empty-state">
                  <span>No timeline events recorded yet.</span>
                  <small style={{ fontSize: "11px" }}>
                    {item.project?.sourceType === "EXTERNAL"
                      ? "This case is mirrored from an external system of record — its workflow history lives in that system."
                      : "Events are recorded automatically as the case moves through statutory stages."}
                  </small>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right: Parcel Overview, Documents & Financials */}
        <div className="stack-20">
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
                <strong>{item.parcel?.sourceSystem || "N-LAMS"}</strong>
              </div>
            </div>
          </section>

          {/* Stage Document Checklist */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Stage Document Checklist</h2>
                <p>Required statutory compliance documents</p>
              </div>
              <button className="button button-secondary button-sm" onClick={() => setShowUploadModal(true)}>
                <UploadCloud size={13} /> Attach Document
              </button>
            </div>
            <div style={{ padding: "12px 18px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", marginBottom: "6px" }}>
                REQUIRED FOR CURRENT STAGE ({item.currentStage}):
              </div>
              {docsReq.map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#334155", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <CheckCircle2 size={15} color="#16a34a" />
                  <span>{d}</span>
                </div>
              ))}

              {attachedDocs.length > 0 && (
                <div style={{ marginTop: "12px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", marginBottom: "6px" }}>
                    ATTACHED & VALIDATED DOCUMENTS:
                  </div>
                  {attachedDocs.map((doc) => (
                    <div key={doc.id} style={{ background: "#f8fafc", padding: "8px", borderRadius: "6px", border: "1px solid #e2e8f0", marginBottom: "6px" }}>
                      <strong style={{ display: "block", fontSize: "12px", color: "#1e293b" }}>{doc.title}</strong>
                      <span style={{ fontSize: "10px", color: "#64748b" }}>
                        {doc.fileName} · {doc.fileSize} · Uploaded by {doc.uploadedByName}
                      </span>
                    </div>
                  ))}
                </div>
              )}
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
                    ₹{Number(item.compensation.assessedAmount || 0).toLocaleString("en-IN")}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>Paid Amount</span>
                  <strong style={{ display: "block", fontSize: "14px", color: "#16a34a" }}>
                    ₹{Number(item.compensation.paidAmount || 0).toLocaleString("en-IN")}
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

      {/* Upload Document Modal */}
      <Modal
        open={showUploadModal}
        width={480}
        title="Attach Statutory Supporting Document"
        onClose={() => setShowUploadModal(false)}
        footer={
          <>
            <button className="button button-secondary" onClick={() => setShowUploadModal(false)} disabled={busy}>
              Cancel
            </button>
            <button
              className="button button-primary"
              onClick={handleAttachDocument}
              disabled={busy || !docTitle.trim() || !docFileName.trim()}
            >
              {busy ? "Attaching…" : "Attach & Validate"}
            </button>
          </>
        }
      >
        <label className="input-label">
          Document Title *
          <input
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            placeholder="e.g. Ground Survey Field Sheet"
            required
          />
        </label>
        <label className="input-label" style={{ marginTop: "8px" }}>
          File Name *
          <input
            value={docFileName}
            onChange={(e) => setDocFileName(e.target.value)}
            placeholder="e.g. DEMO-SURVEY-SHEET-145-2.pdf"
            required
          />
        </label>
        <p style={{ fontSize: "11px", color: "#64748b", marginTop: "10px", marginBottom: 0 }}>
          A synthetic SHA-256 checksum and storage reference are generated for the demo registry.
        </p>
      </Modal>
    </>
  );
}
