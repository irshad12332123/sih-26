import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  FileText,
  Globe2,
  Layers,
  MapPin,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { MapContainer, Polygon, Polyline, Popup, TileLayer } from "react-leaflet";
import { api, csvDownload, currentUser } from "../api";
import { MiniStat, PageHeader, ProgressBar, StatusBadge } from "../components/common";
import type { Project, Parcel, DocumentRecord } from "../types";

export function ProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [masterParcels, setMasterParcels] = useState<Parcel[]>([]);
  const [query, setQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Project Multi-step Form State
  const [formStep, setFormStep] = useState(1);
  const [name, setName] = useState("Haryana State Infrastructure Corridor — Demo Project");
  const [projCode, setProjCode] = useState("HR-INFRA-2026-001");
  const [dept, setDept] = useState("Irrigation & Water Resources / State Infrastructure Authority");
  const [authority, setAuthority] = useState("State Infrastructure Authority (Haryana)");
  const [projType, setProjType] = useState("State Infrastructure Corridor");
  const [stateName, setStateName] = useState("Haryana");
  const [district, setDistrict] = useState("Ambala");
  const [tehsil, setTehsil] = useState("Ambala");
  const [villages, setVillages] = useState("Demo Kalan, Demo Khurd, Rampur Demo");
  const [targetDate, setTargetDate] = useState("2028-03-31");
  const [desc, setDesc] = useState("Synthetic demo infrastructure corridor in Ambala, Haryana. Connects agricultural parcels across multiple revenue villages.");
  const [bufferMeters, setBufferMeters] = useState(100);
  const [selectedParcelIds, setSelectedParcelIds] = useState<string[]>([
    "pcl-hr-amb-001",
    "pcl-hr-amb-002",
    "pcl-hr-amb-003",
    "pcl-hr-amb-004",
  ]);
  const [submitImmediately, setSubmitImmediately] = useState(true);
  const [creating, setCreating] = useState(false);

  const navigate = useNavigate();
  const user = currentUser();

  const refresh = () => {
    api<Project[]>("/projects").then(setItems).catch((err) => console.warn("Failed to load projects:", err));
    api<Parcel[]>("/master/parcels").then(setMasterParcels).catch((err) => console.warn("Failed to load master parcels:", err));
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = items.filter((p) =>
    `${p.name} ${p.projectId} ${p.state} ${p.district}`.toLowerCase().includes(query.toLowerCase()),
  );

  const toggleParcelSelection = (id: string) => {
    setSelectedParcelIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const selectedParcelsData = masterParcels.filter((m) => selectedParcelIds.includes(m.id));
  const totalSelectedArea = selectedParcelsData.reduce((s, p) => s + p.totalArea, 0);
  const totalSelectedReqArea = selectedParcelsData.reduce((s, p) => s + p.requiredArea, 0);

  const handleCreateProject = async () => {
    try {
      setCreating(true);
      const res = await api<Project>("/projects", {
        method: "POST",
        body: JSON.stringify({
          name,
          projectId: projCode,
          department: dept,
          authority,
          type: projType,
          state: stateName,
          district,
          tehsil,
          village: villages,
          targetDate,
          description: desc,
          bufferMeters,
          selectedParcelIds,
          submitImmediately,
          alignment: [
            [30.368, 76.782],
            [30.376, 76.804],
            [30.384, 76.820],
            [30.392, 76.838],
            [30.402, 76.860],
          ],
        }),
      });

      setShowCreateModal(false);
      setFormStep(1);
      await refresh();
      navigate(`/projects/${res.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <PageHeader
          title="Infrastructure Projects Portfolio"
          description="Monitored highway, railway, and state infrastructure corridors synchronized with statutory systems of record."
        />
        <button className="button button-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} /> Create Native Project
        </button>
      </div>

      <div className="filter-bar">
        <div className="field-search">
          ⌕<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search projects by name, code, state, or district…" />
        </div>
        <button
          className="button button-secondary button-sm"
          onClick={() => csvDownload(filtered as any, "nlams-projects.csv")}
        >
          Export CSV
        </button>
      </div>

      <div className="panel table-panel">
        <div className="table-top">
          <span>
            {filtered.length} Projects in Portfolio <small>· DEMO REPOSITORY PERSISTED</small>
          </span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Project & Authority</th>
                <th>Origin / Source</th>
                <th>Department</th>
                <th>Location</th>
                <th>Cases</th>
                <th>Land Required</th>
                <th>Progress</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div style={{ maxWidth: "480px", margin: "0 auto" }}>
                      <div style={{ fontSize: "28px", marginBottom: "8px" }}>📁</div>
                      <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", margin: "0 0 6px" }}>
                        No Infrastructure Projects in Portfolio
                      </h3>
                      <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 18px", lineHeight: "1.5" }}>
                        N-LAMS is in a clean baseline state. To demonstrate the system, choose one of the complementary workflows:
                      </p>
                      <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                        <Link to="/integrations" className="button button-secondary button-sm">
                          <RefreshCw size={14} /> Synchronize BhoomiRashi (Side A)
                        </Link>
                        <button className="button button-primary button-sm" onClick={() => setShowCreateModal(true)}>
                          <Plus size={14} /> Create Native Project (Side B)
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link className="table-title" to={`/projects/${p.id}`}>
                        {p.name}
                        <span className="table-sub">
                          {p.projectId} · {p.type}
                        </span>
                      </Link>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: "4px",
                          background: p.isNative ? "#eff6ff" : "#f1f5f9",
                          color: p.isNative ? "#2563eb" : "#475569",
                          display: "inline-block",
                        }}
                      >
                        {p.isNative ? "NATIVE N-LAMS" : p.sourceSystem || "EXTERNAL MOCK"}
                      </span>
                    </td>
                    <td>{p.department}</td>
                    <td>{p.district}, {p.state}</td>
                    <td>{Array.isArray(p.cases) ? p.cases.length : p.cases || 0}</td>
                    <td>{p.landRequiredHa || 0} ha</td>
                    <td>
                      <div className="table-progress">
                        <span>{p.progress}%</span>
                        <ProgressBar value={p.progress} />
                      </div>
                    </td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>
                      <Link to={`/projects/${p.id}`} className="round-arrow">
                        <ArrowUpRight size={15} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-step Native Project Creation Modal (Side B Demo Hero!) */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div className="panel" style={{ width: "720px", maxWidth: "95vw", padding: "22px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "14px" }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#2563eb" }}>
                  SIDE B DEMO · STEP {formStep} OF 2: {formStep === 1 ? "PROJECT PARAMETERS" : "PARCEL ASSOCIATION & SUBMISSION"}
                </span>
                <h2 style={{ fontSize: "17px", fontWeight: 700, margin: "2px 0", color: "#1e293b" }}>
                  {formStep === 1 ? "Create Native N-LAMS Project" : "Select / Associate Cadastral Parcels"}
                </h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "16px" }}
              >
                ✕
              </button>
            </div>

            {formStep === 1 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: "6px", fontSize: "11px", color: "#475569" }}>
                  <strong>Demo Jurisdiction:</strong> Haryana · Ambala District · State Infrastructure Authority Hierarchy.
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "10px" }}>
                  <label className="input-label">
                    Project Name
                    <input value={name} onChange={(e) => setName(e.target.value)} />
                  </label>
                  <label className="input-label">
                    Project Code
                    <input value={projCode} onChange={(e) => setProjCode(e.target.value)} />
                  </label>
                </div>

                <label className="input-label">
                  Department
                  <input value={dept} onChange={(e) => setDept(e.target.value)} />
                </label>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <label className="input-label">
                    Executing Project Authority
                    <input value={authority} onChange={(e) => setAuthority(e.target.value)} />
                  </label>
                  <label className="input-label">
                    Project Type
                    <input value={projType} onChange={(e) => setProjType(e.target.value)} />
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  <label className="input-label">
                    State
                    <input value={stateName} onChange={(e) => setStateName(e.target.value)} />
                  </label>
                  <label className="input-label">
                    District
                    <input value={district} onChange={(e) => setDistrict(e.target.value)} />
                  </label>
                  <label className="input-label">
                    Tehsil
                    <input value={tehsil} onChange={(e) => setTehsil(e.target.value)} />
                  </label>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "10px" }}>
                  <label className="input-label">
                    Covered Villages
                    <input value={villages} onChange={(e) => setVillages(e.target.value)} />
                  </label>
                  <label className="input-label">
                    Target Date
                    <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
                  </label>
                </div>

                <label className="input-label">
                  Corridor Description / Purpose
                  <textarea rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} style={{ width: "100%", padding: "6px 10px", fontSize: "12px", borderRadius: "6px", border: "1px solid #cbd5e1" }} />
                </label>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "10px" }}>
                  <button className="button button-secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button className="button button-primary" onClick={() => setFormStep(2)}>
                    Next: Select Parcels & GIS →
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Selected Metrics */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", background: "#eff6ff", padding: "10px 14px", borderRadius: "6px" }}>
                  <div>
                    <span style={{ fontSize: "10px", color: "#1e40af" }}>SELECTED PARCELS</span>
                    <strong style={{ display: "block", fontSize: "16px", color: "#1e3a8a" }}>{selectedParcelIds.length}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "10px", color: "#1e40af" }}>TOTAL AREA</span>
                    <strong style={{ display: "block", fontSize: "16px", color: "#1e3a8a" }}>{totalSelectedArea.toFixed(2)} ha</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "10px", color: "#1e40af" }}>REQUIRED AREA</span>
                    <strong style={{ display: "block", fontSize: "16px", color: "#2563eb" }}>{totalSelectedReqArea.toFixed(2)} ha</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: "10px", color: "#1e40af" }}>VILLAGES AFFECTED</span>
                    <strong style={{ display: "block", fontSize: "16px", color: "#1e3a8a" }}>
                      {new Set(selectedParcelsData.map((p) => p.village)).size}
                    </strong>
                  </div>
                </div>

                {/* Map with Alignment and Selected Parcels */}
                <div style={{ height: "200px", borderRadius: "6px", overflow: "hidden", border: "1px solid #cbd5e1" }}>
                  <MapContainer center={[30.380, 76.812]} zoom={12} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
                    <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Polyline positions={[[30.368, 76.782], [30.376, 76.804], [30.384, 76.820], [30.392, 76.838], [30.402, 76.860]]} pathOptions={{ color: "#2563eb", weight: 4 }} />
                    {masterParcels.map((p) => {
                      const isSelected = selectedParcelIds.includes(p.id);
                      return (
                        <Polygon
                          key={p.id}
                          positions={p.geometry}
                          pathOptions={{
                            color: isSelected ? "#16a34a" : "#94a3b8",
                            fillColor: isSelected ? "#22c55e" : "#cbd5e1",
                            fillOpacity: isSelected ? 0.45 : 0.2,
                            weight: isSelected ? 2 : 1,
                          }}
                        >
                          <Popup>
                            <strong>{p.parcelId}</strong>
                            <br />Survey {p.surveyNumber} · {p.village}
                            <br />Required: {p.requiredArea} ha
                          </Popup>
                        </Polygon>
                      );
                    })}
                  </MapContainer>
                </div>

                {/* Master Parcel Selection Table */}
                <div style={{ maxHeight: "180px", overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: "6px" }}>
                  <table style={{ width: "100%", fontSize: "11.5px" }}>
                    <thead style={{ background: "#f8fafc", position: "sticky", top: 0 }}>
                      <tr>
                        <th style={{ width: "30px", padding: "6px" }} />
                        <th style={{ padding: "6px" }}>Parcel ID</th>
                        <th style={{ padding: "6px" }}>Survey No</th>
                        <th style={{ padding: "6px" }}>Village / Tehsil</th>
                        <th style={{ padding: "6px" }}>Total Area</th>
                        <th style={{ padding: "6px" }}>Required Area</th>
                      </tr>
                    </thead>
                    <tbody>
                      {masterParcels.map((pcl) => {
                        const checked = selectedParcelIds.includes(pcl.id);
                        return (
                          <tr key={pcl.id} style={{ background: checked ? "#f0fdf4" : undefined }}>
                            <td style={{ textAlign: "center", padding: "6px" }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleParcelSelection(pcl.id)}
                              />
                            </td>
                            <td style={{ padding: "6px" }}><strong>{pcl.parcelId}</strong></td>
                            <td style={{ padding: "6px" }}>{pcl.surveyNumber}</td>
                            <td style={{ padding: "6px" }}>{pcl.village} ({pcl.tehsil})</td>
                            <td style={{ padding: "6px" }}>{pcl.totalArea} ha</td>
                            <td style={{ padding: "6px", color: "#2563eb", fontWeight: 700 }}>{pcl.requiredArea} ha</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Submission toggle */}
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", background: "#f8fafc", padding: "10px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                  <input
                    type="checkbox"
                    checked={submitImmediately}
                    onChange={(e) => setSubmitImmediately(e.target.checked)}
                  />
                  <div>
                    <strong>Submit project immediately into Administrative Workflow</strong>
                    <span style={{ display: "block", fontSize: "11px", color: "#64748b" }}>
                      Automatically triggers master routing to District Revenue Officer (CALA Ambala) and creates preliminary review task.
                    </span>
                  </div>
                </label>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                  <button className="button button-secondary" onClick={() => setFormStep(1)}>
                    ← Back to Details
                  </button>
                  <button className="button button-primary" onClick={handleCreateProject} disabled={creating || selectedParcelIds.length === 0}>
                    <Send size={14} />
                    {creating ? "Submitting Project…" : submitImmediately ? "Create & Submit Project (SUBMITTED)" : "Save Project Draft"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function ProjectDetailsPage() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = () => api<Project>(`/projects/${id}`).then(setProject).catch((err) => console.warn("Failed to load project:", err));
  useEffect(() => {
    refresh();
  }, [id]);

  if (!project) return <div className="empty-state">Loading project…</div>;
  const cases = Array.isArray(project.cases) ? project.cases : [];
  const parcels = Array.isArray(project.parcels) ? project.parcels : [];

  const handleSubmitDraft = async () => {
    try {
      setSubmitting(true);
      setError("");
      setMessage("");
      const res = await api<any>(`/projects/${project.id}/submit`, { method: "POST" });
      setMessage(res.message || "Project submitted into statutory workflow!");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const isSideA = !project.isNative && (project.sourceSystem?.includes("BHOOMIRASHI") || project.externalProjectId);

  return (
    <>
      <Link to="/projects" className="back-link">
        <ArrowLeft size={15} /> Back to projects
      </Link>

      <div className="detail-heading">
        <div>
          <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>{project.projectId}</span>
            <span>·</span>
            <span style={{ color: isSideA ? "#d97706" : "#2563eb", fontWeight: 700 }}>
              {isSideA ? `SOURCE: ${project.sourceSystem || "BHOOMIRASHI / DEMO EXTERNAL SYSTEM"}` : "N-LAMS NATIVE PROJECT"}
            </span>
            {project.externalProjectId && (
              <>
                <span>·</span>
                <span>Ext ID: <strong>{project.externalProjectId}</strong></span>
              </>
            )}
          </div>
          <h1>{project.name}</h1>
          <p>{project.description}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <StatusBadge status={project.status} />
          {project.status === "DRAFT" && (
            <button className="button button-primary" onClick={handleSubmitDraft} disabled={submitting}>
              <Send size={15} /> {submitting ? "Submitting…" : "SUBMIT PROJECT"}
            </button>
          )}
        </div>
      </div>

      {/* Side A / Non-replacement Banner */}
      {isSideA ? (
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ color: "#92400e", fontSize: "13px" }}>
              EXTERNAL INTEGRATION ACTIVE — BHOOMIRASHI IS AUTHORITATIVE
            </strong>
            <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#b45309" }}>
              N-LAMS does not replace the departmental/state system. N-LAMS provides the unified national coordination, GIS, and decision-support layer.
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: "11px", color: "#92400e" }}>
            <div>Last synchronized: <strong>{project.lastSyncedAt ? new Date(project.lastSyncedAt).toLocaleTimeString() : "Synchronized"}</strong></div>
            <div>Sync status: <strong style={{ color: "#16a34a" }}>✓ {project.syncStatus || "SUCCESS"}</strong></div>
          </div>
        </div>
      ) : (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <strong style={{ color: "#1e40af", fontSize: "13px" }}>
              N-LAMS NATIVE DEMONSTRATION WORKFLOW (HARYANA CORRIDOR)
            </strong>
            <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#3b82f6" }}>
              Administrative hierarchy based on Haryana revenue structure. Tasks automatically routed based on jurisdiction rules.
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: "11px", color: "#1e40af" }}>
            <div>Jurisdiction: <strong>Ambala District, Haryana</strong></div>
            <div>Workflow Status: <strong style={{ color: "#2563eb" }}>{project.status}</strong></div>
          </div>
        </div>
      )}

      {message && <div className="login-note" style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}>{message}</div>}
      {error && <div className="login-note" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }}>{error}</div>}

      {/* Top Stat Cards */}
      <div className="detail-stat-row">
        <MiniStat label="Land Required" value={`${project.landRequiredHa || 0} ha`} detail="Corridor Requirement" />
        <MiniStat label="Land Acquired" value={`${project.landAcquiredHa || 0} ha`} detail="Possession Complete" icon={<CheckCircle2 size={17} />} />
        <MiniStat label="Affected Parcels" value={String(parcels.length || project.affectedParcelsCount || 0)} detail="Cadastral Cadre" icon={<FileCheck2 size={17} />} />
        <MiniStat label="Target Date" value={project.targetDate} detail="Baseline Schedule" icon={<CalendarDays size={17} />} />
      </div>

      <div className="content-grid project-grid">
        {/* Cases & Parcels Portfolio */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Acquisition Cases Portfolio ({cases.length})</h2>
              <p>Cadastral parcels linked to project alignment corridor</p>
            </div>
          </div>
          <div className="case-list">
            {cases.map((c: any) => (
              <Link to={`/cases/${c.id}`} className="case-row" key={c.id}>
                <div className="case-id">
                  <div className="case-symbol">
                    <FileCheck2 size={16} />
                  </div>
                  <div>
                    <strong>{c.caseId}</strong>
                    <span>{c.currentStage} · Priority: {c.priority || "MEDIUM"}</span>
                  </div>
                </div>
                <div className="case-progress">
                  <strong>{c.progress}%</strong>
                  <ProgressBar value={c.progress} />
                </div>
                <StatusBadge status={c.status} />
              </Link>
            ))}
          </div>
        </section>

        {/* GIS Map */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Project Alignment & Parcels Map</h2>
              <p>Corridor geometry intersecting candidate cadastral parcels</p>
            </div>
          </div>

          <div style={{ height: "320px", width: "100%", borderRadius: "8px", overflow: "hidden", marginBottom: "12px" }}>
            <MapContainer
              center={project.alignment[0] || [30.368, 76.782]}
              zoom={12}
              scrollWheelZoom={false}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {project.alignment && (
                <Polyline positions={project.alignment} pathOptions={{ color: "#2563eb", weight: 4 }} />
              )}
              {parcels.map((p: any) => (
                <Polygon
                  key={p.id}
                  positions={p.geometry}
                  pathOptions={{
                    color: p.acquisitionStatus === "POSSESSION_COMPLETED" ? "#16a34a" : p.acquisitionStatus.includes("SUBMITTED") ? "#2563eb" : "#f59e0b",
                    fillColor: p.acquisitionStatus === "POSSESSION_COMPLETED" ? "#22c55e" : p.acquisitionStatus.includes("SUBMITTED") ? "#3b82f6" : "#fbbf24",
                    fillOpacity: 0.4,
                  }}
                >
                  <Popup>
                    <strong>{p.parcelId}</strong>
                    <br />Survey {p.surveyNumber} · {p.village} ({p.tehsil})
                    <br />Required: {p.requiredArea} ha
                    <br />Status: <StatusBadge status={p.acquisitionStatus} />
                  </Popup>
                </Polygon>
              ))}
            </MapContainer>
          </div>
        </section>
      </div>
    </>
  );
}
