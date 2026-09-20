import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { MapContainer, Polygon, Polyline, TileLayer } from "react-leaflet";
import { api, currentUser } from "../api";
import { PageHeader, StatusBadge } from "../components/common";
import { Alert, ErrorBlock, LoadingBlock } from "../components/ui";

const DEMO_LAT = 30.3642;
const DEMO_LNG = 76.7815;

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
  const [latitude, setLatitude] = useState(DEMO_LAT);
  const [longitude, setLongitude] = useState(DEMO_LNG);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsNote, setGpsNote] = useState("");
  const [loadError, setLoadError] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([
    "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=80",
  ]);

  const user = currentUser();

  const fetchTasks = async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const data = (await api<any[]>("/tasks/my")) || [];
      setTasks(data);
      setLoadError("");
      // Keep the pane in sync: re-point at the refreshed record, or fall back
      // to the next task once the current one has been submitted.
      setSelectedTask((current: any) => {
        if (!current) return data[0] || null;
        return data.find((t) => t.id === current.id) || data[0] || null;
      });
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load field tasks",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Reset the capture form whenever a different task is opened.
  useEffect(() => {
    setGpsNote("");
  }, [selectedTask?.id]);

  /** Switches between the demo coordinate and a real device fix. */
  const handleCaptureGps = () => {
    if (!isDemoGps) {
      setIsDemoGps(true);
      setLatitude(DEMO_LAT);
      setLongitude(DEMO_LNG);
      setGpsNote("Reverted to the demo coordinate.");
      return;
    }
    if (!navigator.geolocation) {
      setGpsNote("This browser does not expose device location — keeping the demo coordinate.");
      return;
    }
    setGpsBusy(true);
    setGpsNote("Requesting device location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude);
        setLongitude(pos.coords.longitude);
        setIsDemoGps(false);
        setGpsBusy(false);
        setGpsNote(`Device fix captured (±${Math.round(pos.coords.accuracy)} m).`);
      },
      (geoError) => {
        setIsDemoGps(true);
        setLatitude(DEMO_LAT);
        setLongitude(DEMO_LNG);
        setGpsBusy(false);
        setGpsNote(
          geoError.code === geoError.PERMISSION_DENIED
            ? "Location permission denied — using the demo coordinate."
            : "Device location unavailable — using the demo coordinate.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
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

      <Alert tone="success" message={message} onDismiss={() => setMessage("")} />
      <Alert tone="error" message={error} onDismiss={() => setError("")} />

      <div className="workspace-grid">
        {/* Left: Task List */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Assigned Field Tasks</h2>
              <p>Scoped to your jurisdiction: Ambala / Demo Village</p>
            </div>
            <span className="live-dot" />
          </div>

          {loading && tasks.length === 0 ? (
            <LoadingBlock label="Loading assigned tasks…" />
          ) : loadError && tasks.length === 0 ? (
            <ErrorBlock message={loadError} onRetry={() => fetchTasks()} />
          ) : tasks.length === 0 ? (
            <div className="empty-state">
              <span>No pending field verification tasks assigned.</span>
              <small style={{ fontSize: "11px" }}>
                Tasks appear here once a District Officer approves the administrative review for a parcel in your jurisdiction.
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
                        <ClipboardCheck size={16} />
                      </div>
                      <div>
                        <strong>
                          {t.parcel?.parcelId || "Parcel"}
                          {t.parcel?.surveyNumber ? ` · Survey ${t.parcel.surveyNumber}` : ""}
                        </strong>
                        <span>
                          {[t.case?.caseId, t.parcel?.village, t.stage?.name].filter(Boolean).join(" · ")}
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

        {/* Right: Active Field Verification Form */}
        {selectedTask ? (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">FIELD VERIFICATION PROTOCOL</div>
                <h2>
                  {selectedTask.parcel?.parcelId || selectedTask.case?.caseId || "Assigned task"}
                  {selectedTask.parcel?.surveyNumber ? ` — Survey ${selectedTask.parcel.surveyNumber}` : ""}
                </h2>
                <p>
                  {[selectedTask.project?.name, selectedTask.parcel?.village, selectedTask.parcel?.district]
                    .filter(Boolean)
                    .join(" · ") || "Jurisdiction details unavailable"}
                </p>
              </div>
              <StatusBadge status={selectedTask.status} />
            </div>

            {/* Map Preview */}
            <div style={{ height: "220px", width: "100%", borderRadius: "8px", overflow: "hidden", marginBottom: "16px", border: "1px solid #e2e8f0" }}>
              <MapContainer
                key={`${selectedTask.id}-${latitude.toFixed(4)}-${longitude.toFixed(4)}`}
                center={[latitude, longitude]}
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
              <div className="checkbox-grid">
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
                    disabled={gpsBusy}
                    title={isDemoGps ? "Capture a live device fix instead" : "Switch back to the demo coordinate"}
                  >
                    <Navigation size={13} className={gpsBusy ? "spin-icon" : ""} />
                    {gpsBusy
                      ? "Locating…"
                      : isDemoGps
                        ? `Use device GPS (demo: ${DEMO_LAT}, ${DEMO_LNG})`
                        : `Device fix ${latitude.toFixed(4)}, ${longitude.toFixed(4)} — reset`}
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

              {gpsNote && (
                <p style={{ fontSize: "11px", color: "#64748b", margin: "0 0 8px" }}>{gpsNote}</p>
              )}

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
                    {photoUrls.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Remove site photo ${i + 1}`}
                        onClick={() => setPhotoUrls((prev) => prev.filter((_, index) => index !== i))}
                        style={{
                          position: "absolute",
                          top: "3px",
                          right: "3px",
                          background: "rgba(15,23,42,.72)",
                          color: "#fff",
                          border: 0,
                          borderRadius: "4px",
                          lineHeight: 0,
                          padding: "3px",
                        }}
                      >
                        <X size={11} />
                      </button>
                    )}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: "14px", gap: "12px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", color: "#64748b", flex: 1, minWidth: "200px" }}>
                {remarks.trim().length < 10
                  ? "Enter at least 10 characters of field remarks before submitting."
                  : "Submission transfers the task to the Revenue Scrutiny Officer for approval."}
              </span>
              <button
                className="button button-primary"
                onClick={handleSubmitVerification}
                disabled={submitting || selectedTask.status === "COMPLETED" || remarks.trim().length < 10}
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
