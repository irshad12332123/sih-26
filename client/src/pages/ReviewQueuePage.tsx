import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  FileCheck2,
  Image as ImageIcon,
  MapPin,
  RotateCcw,
  ShieldAlert,
  ThumbsUp,
  UserCheck,
  XCircle,
} from "lucide-react";
import { MapContainer, Polygon, Polyline, TileLayer } from "react-leaflet";
import { api } from "../api";
import { PageHeader, StatusBadge } from "../components/common";
import { Alert, ErrorBlock, LoadingBlock } from "../components/ui";

export function ReviewQueuePage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [loadError, setLoadError] = useState("");

  // Dialog State
  const [dialogMode, setDialogMode] = useState<"REJECT" | "CORRECTION" | null>(null);
  const [reasonText, setReasonText] = useState("");

  const fetchReviews = async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const data = (await api<any[]>("/tasks/my")) || [];
      setTasks(data);
      setLoadError("");
      // After an approve/reject the current task leaves the queue — move the
      // inspector onto the refreshed record or the next pending one.
      setSelectedTask((current: any) => {
        if (!current) return data[0] || null;
        return data.find((t) => t.id === current.id) || data[0] || null;
      });
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load review queue",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleApprove = async () => {
    if (!selectedTask) return;
    try {
      setBusy(true);
      setError("");
      setMessage("");

      const res = await api<any>(`/tasks/${selectedTask.id}/approve`, {
        method: "POST",
        body: JSON.stringify({
          remarks: `${selectedTask.stage?.name || "Stage"} verified and approved by the Competent Reviewing Officer.`,
        }),
      });

      setMessage(
        res?.nextStage
          ? `Review approved. Case ${selectedTask.case?.caseId || ""} advanced to ${res.nextStage}.`
          : res?.message || "Review approved and the case was routed onward.",
      );
      await fetchReviews({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setBusy(false);
    }
  };

  const handleActionWithReason = async () => {
    if (!selectedTask || !dialogMode) return;
    if (reasonText.trim().length < 10) {
      setError(
        dialogMode === "REJECT"
          ? "Record a rejection reason of at least 10 characters — it is written to the immutable audit trail."
          : "Describe the required correction in at least 10 characters so the field officer knows what to redo.",
      );
      return;
    }
    try {
      setBusy(true);
      setError("");
      setMessage("");

      if (dialogMode === "REJECT") {
        await api(`/tasks/${selectedTask.id}/reject`, {
          method: "POST",
          body: JSON.stringify({ reason: reasonText.trim() }),
        });
        setMessage("Task rejected. The case has been placed on hold.");
      } else {
        await api(`/tasks/${selectedTask.id}/correction`, {
          method: "POST",
          body: JSON.stringify({ reason: reasonText.trim() }),
        });
        setMessage("Correction requested. A new task was dispatched to the field officer for this jurisdiction.");
      }

      setDialogMode(null);
      setReasonText("");
      await fetchReviews({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const evidence = selectedTask?.evidence;
  const checklist = evidence?.checklist;
  // "ok" marks the reassuring outcome so the reviewer's eye is drawn to
  // anything that needs attention.
  const findings = checklist
    ? [
        {
          label: "Parcel identified",
          value: checklist.physicallyIdentified ? "Confirmed" : "Not confirmed",
          ok: !!checklist.physicallyIdentified,
        },
        {
          label: "Cadastral boundary",
          value: checklist.boundaryVerified ? "Verified" : "Not verified",
          ok: !!checklist.boundaryVerified,
        },
        {
          label: "Land use",
          value: checklist.landUseVerified ? "Verified" : "Not verified",
          ok: !!checklist.landUseVerified,
        },
        {
          label: "Structures",
          value: checklist.structureAffected ? "Affected" : "None affected",
          ok: !checklist.structureAffected,
        },
        {
          label: "Encroachment",
          value: checklist.encroachmentObserved ? "Observed" : "None observed",
          ok: !checklist.encroachmentObserved,
        },
      ]
    : [];
  const photos: string[] = Array.isArray(evidence?.photoUrls) ? evidence.photoUrls : [];

  return (
    <>
      <PageHeader
        title="Review & Approval Queue"
        description="Independent scrutiny of field survey data, geo-tagged photo evidence, and legal compliance before statutory declaration."
      />

      <Alert tone="success" message={message} onDismiss={() => setMessage("")} />
      <Alert tone="error" message={error} onDismiss={() => setError("")} />

      <div className="workspace-grid">
        {/* Left: Review List */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Pending Reviews</h2>
              <p>Submitted for Competent Scrutiny</p>
            </div>
            <span className="live-dot" />
          </div>

          {loading && tasks.length === 0 ? (
            <LoadingBlock label="Loading review queue…" />
          ) : loadError && tasks.length === 0 ? (
            <ErrorBlock message={loadError} onRetry={() => fetchReviews()} />
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <span>No pending reviews in your queue.</span>
              <small style={{ fontSize: "11px" }}>
                Dossiers arrive here once field officers submit geo-tagged verification evidence for your jurisdiction.
              </small>
            </div>
          ) : (
            <div className="case-list">
              {tasks.map((t) => {
                const isCurrent = selectedTask?.id === t.id;
                return (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isCurrent}
                    onClick={() => setSelectedTask(t)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedTask(t);
                      }
                    }}
                    className={`case-row ${isCurrent ? "active-task-row" : ""}`}
                    style={{
                      cursor: "pointer",
                      borderLeft: isCurrent ? "4px solid #2563eb" : "4px solid transparent",
                      background: isCurrent ? "#f8faff" : undefined,
                    }}
                  >
                    <div className="case-id">
                      <div className="case-symbol" style={{ background: isCurrent ? "#2563eb" : "#e2e8f0", color: isCurrent ? "#fff" : "#64748b" }}>
                        <UserCheck size={16} />
                      </div>
                      <div>
                        <strong>{[t.case?.caseId, t.parcel?.parcelId].filter(Boolean).join(" · ") || "Assigned task"}</strong>
                        <span>
                          {[
                            t.parcel?.surveyNumber ? `Survey ${t.parcel.surveyNumber}` : null,
                            t.parcel?.village,
                            t.stage?.name,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                    </div>
                    <div>
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Right: Detailed Inspection */}
        {selectedTask ? (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">FIELD EVIDENCE DOSSIER</div>
                <h2>{[selectedTask.case?.caseId, selectedTask.parcel?.parcelId].filter(Boolean).join(" — ") || "Assigned task"}</h2>
                <p>
                  {[selectedTask.project?.name, selectedTask.parcel?.village, selectedTask.stage?.name]
                    .filter(Boolean)
                    .join(" · ") || "Awaiting scrutiny"}
                </p>
              </div>
              <StatusBadge status={selectedTask.status} />
            </div>

            {/* Checklist Scrutiny — rendered from the evidence actually submitted */}
            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", marginBottom: "16px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", marginBottom: "6px" }}>
                INSPECTION FINDINGS
                {evidence?.uploadedByName ? ` (SUBMITTED BY ${evidence.uploadedByName.toUpperCase()})` : ""}
              </div>
              {evidence?.checklist ? (
                <div className="checkbox-grid" style={{ fontSize: "12px" }}>
                  {findings.map((finding) => (
                    <div key={finding.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {finding.ok ? (
                        <CheckCircle2 size={13} color="#16a34a" />
                      ) : (
                        <ShieldAlert size={13} color="#d97706" />
                      )}
                      <span>
                        {finding.label}: <strong>{finding.value}</strong>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: "12px", color: "#b45309" }}>
                  No structured field checklist was captured for this task yet.
                </div>
              )}
              <div style={{ marginTop: "8px", fontSize: "12px", color: "#334155", fontStyle: "italic" }}>
                “{evidence?.remarks || selectedTask.remarks || "No field remarks recorded."}”
              </div>
            </div>

            {/* Evidence Photos & GPS */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>
                  Geo-Tagged Photographs ({photos.length} attached)
                </span>
                {evidence?.latitude !== undefined && evidence?.longitude !== undefined ? (
                  <span style={{ fontSize: "11px", color: "#2563eb", background: "#eff6ff", padding: "2px 6px", borderRadius: "4px" }}>
                    📍 GPS: {Number(evidence.latitude).toFixed(4)}, {Number(evidence.longitude).toFixed(4)}
                    {evidence.isDemoGps ? " (demo fix)" : ""}
                  </span>
                ) : (
                  <span style={{ fontSize: "11px", color: "#b45309" }}>No GPS coordinate captured</span>
                )}
              </div>
              {photos.length === 0 ? (
                <div style={{ fontSize: "12px", color: "#64748b", padding: "10px", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "6px" }}>
                  No photographic evidence has been attached to this task.
                </div>
              ) : (
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {photos.map((url: string, i: number) => (
                    <img
                      key={`${url}-${i}`}
                      src={url}
                      alt={`Field evidence photograph ${i + 1}`}
                      loading="lazy"
                      style={{ width: "160px", maxWidth: "100%", height: "105px", objectFit: "cover", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Map */}
            <div style={{ height: "180px", width: "100%", borderRadius: "8px", overflow: "hidden", marginBottom: "16px", border: "1px solid #e2e8f0" }}>
              <MapContainer
                key={selectedTask.id}
                center={[Number(evidence?.latitude) || 30.3642, Number(evidence?.longitude) || 76.7815]}
                zoom={14}
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {Array.isArray(selectedTask.project?.alignment) && selectedTask.project.alignment.length > 1 && (
                  <Polyline positions={selectedTask.project.alignment} pathOptions={{ color: "#2563eb", weight: 4 }} />
                )}
                {Array.isArray(selectedTask.parcel?.geometry) && selectedTask.parcel.geometry.length > 2 && (
                  <Polygon
                    positions={selectedTask.parcel.geometry}
                    pathOptions={{ color: "#16a34a", fillColor: "#22c55e", fillOpacity: 0.4 }}
                  />
                )}
              </MapContainer>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: "14px", flexWrap: "wrap" }}>
              <button
                className="button button-secondary button-sm"
                onClick={() => {
                  setDialogMode("CORRECTION");
                  setReasonText("Please provide an additional close-up photo of the northern boundary marker.");
                }}
                disabled={busy}
              >
                <RotateCcw size={14} /> Request Correction
              </button>
              <button
                className="button button-secondary button-sm"
                onClick={() => {
                  setDialogMode("REJECT");
                  setReasonText("Land use mismatch with cadastral record.");
                }}
                disabled={busy}
                style={{ color: "#dc2626" }}
              >
                <XCircle size={14} /> Reject
              </button>
              <button
                className="button button-primary"
                onClick={handleApprove}
                disabled={busy}
              >
                <CheckCircle2 size={16} />
                {busy ? "Approving…" : "Approve & Advance Stage"}
              </button>
            </div>

            {/* Reason Modal */}
            {dialogMode && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px",
                  background: "#fff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
              >
                <h4 style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b", marginBottom: "6px" }}>
                  {dialogMode === "REJECT" ? "Reason for Rejection" : "Specific Correction Request"}
                </h4>
                <textarea
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  rows={2}
                  style={{ width: "100%", padding: "6px 10px", fontSize: "12px", borderRadius: "4px", border: "1px solid #cbd5e1", marginBottom: "8px" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" }}>
                  <button className="button button-secondary button-sm" onClick={() => setDialogMode(null)} disabled={busy}>
                    Cancel
                  </button>
                  <button
                    className="button button-primary button-sm"
                    onClick={handleActionWithReason}
                    disabled={busy || reasonText.trim().length < 10}
                  >
                    {busy ? "Submitting…" : `Confirm ${dialogMode === "REJECT" ? "Rejection" : "Correction Request"}`}
                  </button>
                </div>
              </div>
            )}
          </section>
        ) : (
          <div className="panel empty-state">Select a case to inspect evidence.</div>
        )}
      </div>
    </>
  );
}
