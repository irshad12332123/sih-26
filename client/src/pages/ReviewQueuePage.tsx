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

export function ReviewQueuePage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Dialog State
  const [dialogMode, setDialogMode] = useState<"REJECT" | "CORRECTION" | null>(null);
  const [reasonText, setReasonText] = useState("");

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await api<any[]>("/tasks/my");
      setTasks(data);
      if (data.length > 0 && !selectedTask) {
        setSelectedTask(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load review queue");
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
          remarks: "Field verification verified and approved by Competent Reviewing Officer (REV-AMB-01).",
        }),
      });

      setMessage(
        `Review Approved! Case ${selectedTask.case?.caseId} advanced to Section 3G Compensation Determination.`,
      );
      await fetchReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
    } finally {
      setBusy(false);
    }
  };

  const handleActionWithReason = async () => {
    if (!selectedTask || !dialogMode) return;
    try {
      setBusy(true);
      setError("");
      setMessage("");

      if (dialogMode === "REJECT") {
        await api(`/tasks/${selectedTask.id}/reject`, {
          method: "POST",
          body: JSON.stringify({ reason: reasonText }),
        });
        setMessage(`Task rejected. Case put on hold.`);
      } else {
        await api(`/tasks/${selectedTask.id}/correction`, {
          method: "POST",
          body: JSON.stringify({ reason: reasonText }),
        });
        setMessage(`Correction requested. Dispatched back to Field Officer (FO-AMB-01).`);
      }

      setDialogMode(null);
      setReasonText("");
      await fetchReviews();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Review & Approval Queue"
        description="Independent scrutiny of field survey data, geo-tagged photo evidence, and legal compliance before statutory declaration."
      />

      {message && <div className="login-note" style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}>{message}</div>}
      {error && <div className="login-note" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }}>{error}</div>}

      <div className="content-grid project-grid" style={{ gridTemplateColumns: "1fr 1.6fr" }}>
        {/* Left: Review List */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Pending Reviews</h2>
              <p>Submitted for Competent Scrutiny</p>
            </div>
            <span className="live-dot" />
          </div>

          {loading ? (
            <div className="empty-state">Loading review queue…</div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">No pending reviews in your queue.</div>
          ) : (
            <div className="case-list">
              {tasks.map((t) => {
                const isCurrent = selectedTask?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
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
                        <strong>{t.case?.caseId} · {t.parcel?.parcelId}</strong>
                        <span>Survey {t.parcel?.surveyNumber} · {t.parcel?.village}</span>
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
                <h2>{selectedTask.case?.caseId} — {selectedTask.parcel?.parcelId}</h2>
                <p>{selectedTask.project?.name} · {selectedTask.parcel?.village}</p>
              </div>
              <StatusBadge status={selectedTask.status} />
            </div>

            {/* Checklist Scrutiny */}
            <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", marginBottom: "16px", border: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", marginBottom: "6px" }}>
                INSPECTION FINDINGS (SUBMITTED BY FIELD OFFICER FO-AMB-01)
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "12px" }}>
                <div>✓ Physical Boundary: <strong>Verified</strong></div>
                <div>✓ Land Use: <strong>Agricultural</strong></div>
                <div>✓ Structures: <strong>None Affected</strong></div>
                <div>✓ Encroachments: <strong>None Observed</strong></div>
              </div>
              <div style={{ marginTop: "8px", fontSize: "12px", color: "#334155", fontStyle: "italic" }}>
                "{selectedTask.remarks || selectedTask.evidence?.remarks || "Physical boundaries verified along corridor baseline."}"
              </div>
            </div>

            {/* Evidence Photos & GPS */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>
                  Geo-Tagged Photographs ({selectedTask.evidence?.photoUrls?.length || 1} attached)
                </span>
                <span style={{ fontSize: "11px", color: "#2563eb", background: "#eff6ff", padding: "2px 6px", borderRadius: "4px" }}>
                  📍 GPS: {selectedTask.evidence?.latitude?.toFixed(4) || "30.3642"}, {selectedTask.evidence?.longitude?.toFixed(4) || "76.7815"}
                </span>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                {(selectedTask.evidence?.photoUrls || [
                  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=80",
                ]).map((url: string, i: number) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Evidence ${i + 1}`}
                    style={{ width: "160px", height: "105px", objectFit: "cover", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                  />
                ))}
              </div>
            </div>

            {/* Map */}
            <div style={{ height: "180px", width: "100%", borderRadius: "8px", overflow: "hidden", marginBottom: "16px", border: "1px solid #e2e8f0" }}>
              <MapContainer
                center={[selectedTask.evidence?.latitude || 30.3642, selectedTask.evidence?.longitude || 76.7815]}
                zoom={14}
                scrollWheelZoom={false}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {selectedTask.project?.alignment && (
                  <Polyline positions={selectedTask.project.alignment} pathOptions={{ color: "#2563eb", weight: 4 }} />
                )}
                {selectedTask.parcel?.geometry && (
                  <Polygon
                    positions={selectedTask.parcel.geometry}
                    pathOptions={{ color: "#16a34a", fillColor: "#22c55e", fillOpacity: 0.4 }}
                  />
                )}
              </MapContainer>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", borderTop: "1px solid #e2e8f0", paddingTop: "14px" }}>
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
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                  <button className="button button-secondary button-sm" onClick={() => setDialogMode(null)}>
                    Cancel
                  </button>
                  <button className="button button-primary button-sm" onClick={handleActionWithReason} disabled={busy}>
                    Confirm {dialogMode === "REJECT" ? "Rejection" : "Correction Request"}
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
