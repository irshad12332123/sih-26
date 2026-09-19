import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  Globe2,
  Layers,
  MapPin,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { MapContainer, Polygon, Polyline, Popup, TileLayer } from "react-leaflet";
import { api, csvDownload } from "../api";
import { MiniStat, PageHeader, ProgressBar, StatusBadge } from "../components/common";

type Project = {
  id: string;
  projectId: string;
  name: string;
  department: string;
  authority: string;
  type: string;
  state: string;
  district: string;
  tehsil?: string;
  village?: string;
  status: string;
  progress: number;
  targetDate: string;
  description: string;
  alignment: [number, number][];
  bufferMeters?: number;
  cases: any[];
  parcels?: any[];
  sourceSystem?: string;
  externalProjectId?: string;
  landRequiredHa?: number;
  landAcquiredHa?: number;
  affectedParcelsCount?: number;
  bhoomiRashiStats?: {
    section3A: string;
    section3CObjections: number;
    section3D: string;
    section3GCases: number;
    section3HPayments: number;
    section3EPossessions: number;
  };
};

export function ProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [query, setQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Project Form
  const [formStep, setFormStep] = useState(1);
  const [name, setName] = useState("Ambala Western Ring Road Corridor");
  const [dept, setDept] = useState("Ministry of Road Transport & Highways — DEMO");
  const [projType, setProjType] = useState("Expressway Corridor");
  const [stateName, setStateName] = useState("Haryana");
  const [district, setDistrict] = useState("Ambala");
  const [targetDate, setTargetDate] = useState("2027-12-31");
  const [desc, setDesc] = useState("Strategic ring road expansion bypassing congested urban sector.");
  const [bufferMeters, setBufferMeters] = useState(100);
  const [creating, setCreating] = useState(false);

  const refresh = () => api<Project[]>("/projects").then(setItems);
  useEffect(() => {
    refresh();
  }, []);

  const filtered = items.filter((p) =>
    `${p.name} ${p.projectId} ${p.state} ${p.district}`.toLowerCase().includes(query.toLowerCase()),
  );

  const handleCreateProject = async () => {
    try {
      setCreating(true);
      const res = await api<Project>("/projects", {
        method: "POST",
        body: JSON.stringify({
          name,
          department: dept,
          type: projType,
          state: stateName,
          district,
          targetDate,
          description: desc,
          bufferMeters,
          alignment: [
            [30.362, 76.776],
            [30.380, 76.812],
            [30.395, 76.850],
            [30.407, 76.873],
          ],
        }),
      });
      setShowCreateModal(false);
      setFormStep(1);
      await refresh();
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
          description="Monitored highway, railway, and energy corridors synchronized with statutory systems of record."
        />
        <button className="button button-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={16} /> New Project
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
            {filtered.length} Projects in Portfolio <small>· BHOOMIRASHI & DATABASE CONNECTED</small>
          </span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Project & Authority</th>
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
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link className="table-title" to={`/projects/${p.id}`}>
                      {p.name}
                      <span className="table-sub">
                        {p.projectId} · {p.type} {p.sourceSystem ? `· ${p.sourceSystem}` : ""}
                      </span>
                    </Link>
                  </td>
                  <td>{p.department}</td>
                  <td>{p.district}, {p.state}</td>
                  <td>{Array.isArray(p.cases) ? p.cases.length : p.cases || 12}</td>
                  <td>{p.landRequiredHa || 248.6} ha</td>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-step Project Creation Modal */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div className="panel" style={{ width: "560px", maxWidth: "90vw", padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "14px" }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#2563eb" }}>STEP {formStep} OF 2</span>
                <h2 style={{ fontSize: "16px", fontWeight: 700, margin: "2px 0" }}>
                  {formStep === 1 ? "Project Baseline Parameters" : "Corridor Alignment & Buffer"}
                </h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            {formStep === 1 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <label className="input-label">
                  Project Name
                  <input value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <label className="input-label">
                    State
                    <input value={stateName} onChange={(e) => setStateName(e.target.value)} />
                  </label>
                  <label className="input-label">
                    District
                    <input value={district} onChange={(e) => setDistrict(e.target.value)} />
                  </label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <label className="input-label">
                    Project Type
                    <input value={projType} onChange={(e) => setProjType(e.target.value)} />
                  </label>
                  <label className="input-label">
                    Target Completion Date
                    <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
                  </label>
                </div>
                <label className="input-label">
                  Department
                  <input value={dept} onChange={(e) => setDept(e.target.value)} />
                </label>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "10px" }}>
                  <button className="button button-secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button className="button button-primary" onClick={() => setFormStep(2)}>
                    Next: Corridor Alignment →
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ fontSize: "12px", color: "#475569" }}>
                  Define candidate corridor acquisition buffer along the Ambala corridor baseline:
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  {[50, 100, 200].map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`button ${bufferMeters === m ? "button-primary" : "button-secondary"} button-sm`}
                      onClick={() => setBufferMeters(m)}
                    >
                      {m}m Buffer
                    </button>
                  ))}
                </div>
                <div style={{ height: "180px", borderRadius: "6px", overflow: "hidden", border: "1px solid #cbd5e1" }}>
                  <MapContainer center={[30.380, 76.812]} zoom={11} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
                    <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Polyline positions={[[30.362, 76.776], [30.380, 76.812], [30.395, 76.850], [30.407, 76.873]]} pathOptions={{ color: "#2563eb", weight: 4 }} />
                  </MapContainer>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
                  <button className="button button-secondary" onClick={() => setFormStep(1)}>
                    ← Back
                  </button>
                  <button className="button button-primary" onClick={handleCreateProject} disabled={creating}>
                    {creating ? "Saving Project…" : "Save Project & Ready Discovery"}
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
  const [bufferMeters, setBufferMeters] = useState(100);
  const [discovering, setDiscovering] = useState(false);
  const [discoveryResult, setDiscoveryResult] = useState<any | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = () => api<Project>(`/projects/${id}`).then(setProject);
  useEffect(() => {
    refresh();
  }, [id]);

  if (!project) return <div className="empty-state">Loading project…</div>;
  const cases = Array.isArray(project.cases) ? project.cases : [];
  const parcels = Array.isArray(project.parcels) ? project.parcels : [];

  const handleDiscoverParcels = async () => {
    try {
      setDiscovering(true);
      setError("");
      setMessage("");
      const res = await api<any>(`/projects/${project.id}/discover-parcels`, {
        method: "POST",
        body: JSON.stringify({ bufferMeters }),
      });
      setDiscoveryResult(res);
      setMessage(
        `Discovered ${res.candidateParcels} candidate parcels along ${bufferMeters}m corridor! Created ${res.casesCreated} cases & started workflows.`,
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed");
    } finally {
      setDiscovering(false);
    }
  };

  return (
    <>
      <Link to="/projects" className="back-link">
        <ArrowLeft size={15} /> Back to projects
      </Link>

      <div className="detail-heading">
        <div>
          <div className="eyebrow">
            {project.projectId} · {project.sourceSystem || "BhoomiRashi MOCK"}
          </div>
          <h1>{project.name}</h1>
          <p>{project.description}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <StatusBadge status={project.status} />
        </div>
      </div>

      {message && <div className="login-note" style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}>{message}</div>}
      {error && <div className="login-note" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }}>{error}</div>}

      {/* Top Stat Cards */}
      <div className="detail-stat-row">
        <MiniStat label="Land Required" value={`${project.landRequiredHa || 248.6} ha`} detail="Total Corridor Requisite" />
        <MiniStat label="Land Acquired" value={`${project.landAcquiredHa || 137.4} ha`} detail="Possession & 3E Complete" icon={<CheckCircle2 size={17} />} />
        <MiniStat label="Affected Parcels" value={String(project.affectedParcelsCount || 482)} detail="Cadastral Cadre" icon={<FileCheck2 size={17} />} />
        <MiniStat label="Target Date" value={project.targetDate} detail="Baseline Schedule" icon={<CalendarDays size={17} />} />
      </div>

      {/* Statutory Stages Breakdown (BhoomiRashi Synced) */}
      <div className="panel" style={{ padding: "14px 18px", marginBottom: "20px" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", marginBottom: "8px" }}>
          STATUTORY ACQUISITION MILESTONES (SYNCHRONIZED WITH BHOOMIRASHI MOCK)
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px", textAlign: "center" }}>
          <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "6px" }}>
            <span style={{ fontSize: "10px", color: "#64748b" }}>3A Notice</span>
            <strong style={{ display: "block", fontSize: "12px", color: "#16a34a" }}>COMPLETED</strong>
          </div>
          <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "6px" }}>
            <span style={{ fontSize: "10px", color: "#64748b" }}>3C Objections</span>
            <strong style={{ display: "block", fontSize: "12px", color: "#2563eb" }}>17 Heard</strong>
          </div>
          <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "6px" }}>
            <span style={{ fontSize: "10px", color: "#64748b" }}>3D Declaration</span>
            <strong style={{ display: "block", fontSize: "12px", color: "#16a34a" }}>COMPLETED</strong>
          </div>
          <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "6px" }}>
            <span style={{ fontSize: "10px", color: "#64748b" }}>3G Awards</span>
            <strong style={{ display: "block", fontSize: "12px", color: "#d97706" }}>312 Cases</strong>
          </div>
          <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "6px" }}>
            <span style={{ fontSize: "10px", color: "#64748b" }}>3H Payments</span>
            <strong style={{ display: "block", fontSize: "12px", color: "#16a34a" }}>278 Paid</strong>
          </div>
          <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "6px" }}>
            <span style={{ fontSize: "10px", color: "#64748b" }}>3E Possession</span>
            <strong style={{ display: "block", fontSize: "12px", color: "#2563eb" }}>193 Parcels</strong>
          </div>
          <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "6px" }}>
            <span style={{ fontSize: "10px", color: "#64748b" }}>R&R Completion</span>
            <strong style={{ display: "block", fontSize: "12px", color: "#16a34a" }}>82% Delivered</strong>
          </div>
        </div>
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

        {/* GIS Map & Parcel Discovery */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Project Alignment Corridor</h2>
              <p>PostGIS-compatible corridor geometry & candidate parcels</p>
            </div>
          </div>

          <div style={{ height: "260px", width: "100%", borderRadius: "8px", overflow: "hidden", marginBottom: "12px" }}>
            <MapContainer
              center={project.alignment[0] || [30.362, 76.776]}
              zoom={11}
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
                  pathOptions={{ color: "#f59e0b", fillColor: "#fbbf24", fillOpacity: 0.35 }}
                >
                  <Popup>
                    <strong>{p.parcelId}</strong>
                    <br />Survey {p.surveyNumber} · {p.village}
                    <br />Required: {p.requiredArea} ha
                  </Popup>
                </Polygon>
              ))}
            </MapContainer>
          </div>

          {/* Alignment & Discovery Controls */}
          <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e293b" }}>
                Candidate Acquisition Corridor Buffer:
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                {[50, 100, 200].map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`button ${bufferMeters === m ? "button-primary" : "button-secondary"} button-sm`}
                    onClick={() => setBufferMeters(m)}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>

            <button
              className="button button-primary"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={handleDiscoverParcels}
              disabled={discovering}
            >
              <Sparkles size={15} />
              {discovering ? "Discovering Candidate Parcels…" : "DISCOVER AFFECTED PARCELS"}
            </button>

            {discoveryResult && (
              <div style={{ marginTop: "10px", fontSize: "11px", color: "#065f46", background: "#ecfdf5", padding: "8px", borderRadius: "6px" }}>
                ✓ Result: {discoveryResult.candidateParcels} candidate parcels found, {discoveryResult.newParcelsImported} imported, {discoveryResult.casesCreated} cases created, {discoveryResult.workflowsStarted} workflows initiated.
              </div>
            )}

            <div style={{ marginTop: "8px", fontSize: "10px", color: "#64748b", lineHeight: "1.4" }}>
              <strong>Notice:</strong> Candidate affected parcels are identified from the project alignment. Authoritative parcel and ownership records are synchronized from connected land-record systems.
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
