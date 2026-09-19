import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileCheck2,
  Image as ImageIcon,
  MapPin,
  Navigation,
  Send,
  UploadCloud,
  X,
} from "lucide-react";
import { MapContainer, Polygon, Polyline, Popup, TileLayer, Marker } from "react-leaflet";
import { api, currentUser } from "../api";
import { PageHeader, StatusBadge } from "../components/common";

export function FieldTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Verification Form State
  const [checklist, setChecklist] = useState({
    physicallyIdentified: true,
    boundaryVerified: true,
    landUseVerified: true,
    structureAffected: false,
    encroachmentObserved: false,
  });
  const [remarks, setRemarks] = useState(
    "Physical boundaries verified on site. Land is under seasonal cultivation; no residential structure or active encroachment observed within the 100m corridor.",
  );
  const [isDemoGps, setIsDemoGps] = useState(true);
  const [latitude, setLatitude] = useState(30.3642);
  const [longitude, setLongitude] = useState(76.7815);
  const [photoUrls, setPhotoUrls] = useState<string[]>([
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=80",
  ]);

  const navigate = useNavigate();
  const user = currentUser();

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await api<any[]>("/tasks/my");
      setTasks(data);
      if (data.length > 0 && !selectedTask) {
        setSelectedTask(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load field tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCaptureGps = () => {
    if (navigator.geolocation && !isDemoGps) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
          setIsDemoGps(false);
        },
        () => {
          setIsDemoGps(true);
          setLatitude(30.3642);
          setLongitude(76.7815);
        },
      );
    } else {
      setIsDemoGps(true);
      setLatitude(30.3642);
      setLongitude(76.7815);
    }
  };

  const handleAddSamplePhoto = () => {
    setPhotoUrls((prev) => [
      ...prev,
      "https://images.unsplash.com/photo-1592982537447-7440770cbfc9?w=600&auto=format&fit=crop&q=80",
    ]);
  };

  const handleSubmitVerification = async () => {
    if (!selectedTask) return;
    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      const res = await api<any>(`/tasks/${selectedTask.id}/field-verification`, {
        method: "POST",
        body: JSON.stringify({
          ...checklist,
          remarks,
          latitude,
          longitude,
          isDemoGps,
          photoUrls,
        }),
      });

      setMessage(
        `Field verification submitted successfully for ${selectedTask.parcel?.parcelId || "Parcel"}! Transferred to Reviewer queue.`,
      );
      await fetchTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Field Officer Operations"
        description="Physical boundary verification, cadastral ground checks, and geo-tagged photographic evidence capture."
      />

      {message && <div className="login-note" style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}>{message}</div>}
      {error && <div className="login-note" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }}>{error}</div>}

      <div className="content-grid project-grid" style={{ gridTemplateColumns: "1fr 1.6fr" }}>
        {/* Left: Task List */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Assigned Field Tasks</h2>
              <p>Scoped to your jurisdiction: Ambala / Demo Village</p>
            </div>
            <span className="live-dot" />
          </div>

          {loading ? (
            <div className="empty-state">Loading assigned tasks…</div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">No pending field verification tasks assigned.</div>
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
                        <ClipboardCheck size={16} />
                      </div>
                      <div>
                        <strong>{t.parcel?.parcelId || "Parcel"} · Survey {t.parcel?.surveyNumber}</strong>
                        <span>{t.case?.caseId} · {t.parcel?.village}</span>
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

        {/* Right: Active Field Verification Form */}
        {selectedTask ? (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">FIELD VERIFICATION PROTOCOL</div>
                <h2>{selectedTask.parcel?.parcelId} — Survey {selectedTask.parcel?.surveyNumber}</h2>
                <p>{selectedTask.project?.name} · {selectedTask.parcel?.village}, {selectedTask.parcel?.district}</p>
              </div>
              <StatusBadge status={selectedTask.status} />
            </div>

            {/* Map Preview */}
            <div style={{ height: "220px", width: "100%", borderRadius: "8px", overflow: "hidden", marginBottom: "16px", border: "1px solid #e2e8f0" }}>
              <MapContainer
                center={[latitude, longitude]}
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
                    pathOptions={{ color: "#f59e0b", fillColor: "#fbbf24", fillOpacity: 0.4 }}
                  />
                )}
              </MapContainer>
            </div>

            {/* Checklist */}
            <div style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px", color: "#1e293b" }}>
                1. Physical Inspection Checklist
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#334155" }}>
                  <input
                    type="checkbox"
                    checked={checklist.physicallyIdentified}
                    onChange={(e) => setChecklist({ ...checklist, physicallyIdentified: e.target.checked })}
                  />
                  Parcel physically identifiable
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#334155" }}>
                  <input
                    type="checkbox"
                    checked={checklist.boundaryVerified}
                    onChange={(e) => setChecklist({ ...checklist, boundaryVerified: e.target.checked })}
                  />
                  Cadastral boundary verified
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#334155" }}>
                  <input
                    type="checkbox"
                    checked={checklist.landUseVerified}
                    onChange={(e) => setChecklist({ ...checklist, landUseVerified: e.target.checked })}
                  />
                  Agricultural land use confirmed
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#334155" }}>
                  <input
                    type="checkbox"
                    checked={checklist.structureAffected}
                    onChange={(e) => setChecklist({ ...checklist, structureAffected: e.target.checked })}
                  />
                  Structure / Building affected
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "#334155" }}>
                  <input
                    type="checkbox"
                    checked={checklist.encroachmentObserved}
                    onChange={(e) => setChecklist({ ...checklist, encroachmentObserved: e.target.checked })}
                  />
                  Encroachment observed
                </label>
              </div>
            </div>

            {/* Geo-tagged Photo Evidence */}
            <div style={{ marginBottom: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
                  2. Geo-Tagged Field Evidence
                </h3>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    className="button button-secondary button-sm"
                    onClick={handleCaptureGps}
                  >
                    <Navigation size={13} /> {isDemoGps ? "DEMO GPS (30.3642, 76.7815)" : "Device GPS"}
                  </button>
                  <button
                    type="button"
                    className="button button-secondary button-sm"
                    onClick={handleAddSamplePhoto}
                  >
                    <UploadCloud size={13} /> Add Site Photo
                  </button>
                </div>
              </div>

              {/* Photo Thumbnails */}
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {photoUrls.map((url, i) => (
                  <div
                    key={i}
                    style={{
                      position: "relative",
                      width: "120px",
                      height: "85px",
                      borderRadius: "6px",
                      overflow: "hidden",
                      border: "1px solid #cbd5e1",
                    }}
                  >
                    <img src={url} alt={`Site evidence ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <span
                      style={{
                        position: "absolute",
                        bottom: "2px",
                        left: "2px",
                        background: "rgba(0,0,0,0.65)",
                        color: "#fff",
                        fontSize: "8px",
                        padding: "1px 4px",
                        borderRadius: "3px",
                      }}
                    >
                      {latitude.toFixed(4)}, {longitude.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Officer Remarks */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "13px", fontWeight: 700, display: "block", marginBottom: "6px", color: "#1e293b" }}>
                3. Field Verification Remarks
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12px",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Action Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: "14px" }}>
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                Submission transfers task to Reviewer (REV-AMB-01) for approval.
              </span>
              <button
                className="button button-primary"
                onClick={handleSubmitVerification}
                disabled={submitting || selectedTask.status === "COMPLETED"}
              >
                <Send size={15} />
                {submitting ? "Submitting…" : selectedTask.status === "COMPLETED" ? "Verification Submitted" : "Submit Verification"}
              </button>
            </div>
          </section>
        ) : (
          <div className="panel empty-state">Select a task from the list to begin verification.</div>
        )}
      </div>
    </>
  );
}
