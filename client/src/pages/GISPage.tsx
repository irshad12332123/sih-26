import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  ChevronRight,
  Eye,
  FileCheck2,
  Layers,
  MapPin,
  Navigation,
  ShieldCheck,
} from "lucide-react";
import { MapContainer, Polygon, Polyline, Popup, TileLayer, Tooltip } from "react-leaflet";
import { api } from "../api";
import { PageHeader, StatusBadge } from "../components/common";

const statusColors: Record<string, { stroke: string; fill: string }> = {
  SUBMITTED: { stroke: "#f59e0b", fill: "#fbbf24" },
  UNDER_REVIEW: { stroke: "#3b82f6", fill: "#60a5fa" },
  VERIFIED: { stroke: "#10b981", fill: "#34d399" },
  COMPENSATION_DETERMINED: { stroke: "#8b5cf6", fill: "#a78bfa" },
  AWARDED: { stroke: "#8b5cf6", fill: "#a78bfa" },
  COMPLETED: { stroke: "#059669", fill: "#10b981" },
  HANDED_OVER: { stroke: "#059669", fill: "#10b981" },
  DEFAULT: { stroke: "#64748b", fill: "#94a3b8" },
};

export function GISPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [project, setProject] = useState<any | null>(null);
  const [geoData, setGeoData] = useState<any | null>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [selectedParcel, setSelectedParcel] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAlignment, setShowAlignment] = useState(true);
  const [showParcels, setShowParcels] = useState(true);

  // Load Projects
  useEffect(() => {
    async function loadProjects() {
      try {
        setLoading(true);
        const [projList, caseList] = await Promise.all([
          api<any[]>("/projects"),
          api<any[]>("/cases"),
        ]);
        setProjects(projList);
        setCases(caseList);
        if (projList.length > 0) {
          setSelectedProjectId(projList[0].id);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  // Load GIS data for selected project
  useEffect(() => {
    if (!selectedProjectId) return;
    async function loadProjectGIS() {
      try {
        const found = projects.find((p) => p.id === selectedProjectId);
        setProject(found || null);
        const geo = await api<any>(`/gis/projects/${selectedProjectId}/parcels`);
        setGeoData(geo);
        if (geo?.features?.length > 0) {
          setSelectedParcel(geo.features[0].properties);
        } else {
          setSelectedParcel(null);
        }
      } catch {
        // ignore
      }
    }
    loadProjectGIS();
  }, [selectedProjectId, projects]);

  const mapCenter: [number, number] = project?.alignment?.[0]
    ? [project.alignment[0][0], project.alignment[0][1]]
    : [30.3642, 76.7815];

  const matchedCase = cases.find(
    (c) => c.parcelId === selectedParcel?.parcelId || c.parcel?.parcelId === selectedParcel?.parcelId,
  );

  return (
    <>
      <PageHeader
        title="Cadastral GIS & Corridor Spatial Monitoring"
        description="Spatial alignment overlays, cadastral land parcel boundaries, and real-time acquisition progress tracking."
      />

      {/* Simulated Notice */}
      <div className="trust-banner" style={{ marginBottom: "16px" }}>
        <strong>DEMO / SIMULATED PARCEL DATA</strong>
        <span>
          Spatial geometry is synthetic and compatible with PostGIS and WFS/WMS ingestion standards. Authoritative cadastral registries remain the source of record.
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "16px", height: "calc(100vh - 220px)", minHeight: "560px" }}>
        {/* Left Sidebar: Controls & Inspector */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", overflowY: "auto" }}>
          {/* Project Selector Panel */}
          <section className="panel" style={{ padding: "14px" }}>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
              Active Infrastructure Project
            </label>
            {projects.length === 0 ? (
              <div style={{ fontSize: "12px", color: "#64748b" }}>
                No projects loaded in baseline state.
                <div style={{ marginTop: "8px" }}>
                  <Link to="/integrations" className="button button-secondary button-sm" style={{ width: "100%", justifyContent: "center" }}>
                    Go to Integration Center
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "12px", fontWeight: 600 }}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id})
                    </option>
                  ))}
                </select>

                {project && (
                  <div style={{ marginTop: "10px", fontSize: "11px", color: "#475569" }}>
                    <div>State / District: <strong>{project.state} / {project.district}</strong></div>
                    <div>Source System: <strong>{project.sourceSystem || "N-LAMS Native"}</strong></div>
                    <div>Affected Parcels: <strong>{geoData?.features?.length || project.parcelsCount || 0}</strong></div>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Layer Controls & Legend */}
          <section className="panel" style={{ padding: "14px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>
              Spatial Layers
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input type="checkbox" checked={showAlignment} onChange={(e) => setShowAlignment(e.target.checked)} />
                <span style={{ height: "10px", width: "16px", background: "#2563eb", borderRadius: "2px", display: "inline-block" }} />
                Corridor Alignment (Highway Centerline)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input type="checkbox" checked={showParcels} onChange={(e) => setShowParcels(e.target.checked)} />
                <span style={{ height: "10px", width: "16px", background: "#fbbf24", borderRadius: "2px", display: "inline-block" }} />
                Cadastral Survey Parcels (Polygons)
              </label>
            </div>

            <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", marginBottom: "6px" }}>
                STATUS LEGEND
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", fontSize: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ height: "8px", width: "8px", background: "#fbbf24", borderRadius: "50%" }} />
                  <span>Submitted</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ height: "8px", width: "8px", background: "#3b82f6", borderRadius: "50%" }} />
                  <span>Under Review</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ height: "8px", width: "8px", background: "#10b981", borderRadius: "50%" }} />
                  <span>Verified</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ height: "8px", width: "8px", background: "#8b5cf6", borderRadius: "50%" }} />
                  <span>Award / Paid</span>
                </div>
              </div>
            </div>
          </section>

          {/* Parcel Inspector Panel */}
          {selectedParcel ? (
            <section className="panel" style={{ padding: "14px", flex: 1 }}>
              <div className="eyebrow" style={{ fontSize: "10px" }}>SELECTED CADASTRAL PARCEL</div>
              <h3 style={{ fontSize: "14px", margin: "2px 0 6px 0", color: "#1e293b" }}>
                {selectedParcel.externalId || selectedParcel.parcelId}
              </h3>
              <div style={{ marginBottom: "10px" }}>
                <StatusBadge status={selectedParcel.acquisitionStatus || "SUBMITTED"} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Survey Number:</span>
                  <strong>{selectedParcel.surveyNumber}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Village:</span>
                  <strong>{selectedParcel.village || "Demo Village"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Khatedar / Owner:</span>
                  <strong>{selectedParcel.ownerName || "Registered Owner"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Land Classification:</span>
                  <strong>{selectedParcel.landType || "Agricultural"}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Acquisition Area:</span>
                  <strong>{selectedParcel.areaHectares || 1.2} ha</strong>
                </div>
              </div>

              {matchedCase && (
                <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>
                    LINKED CASE: <strong>{matchedCase.caseId}</strong>
                  </div>
                  <Link
                    to={`/cases/${matchedCase.id}`}
                    className="button button-primary button-sm"
                    style={{ width: "100%", justifyContent: "center", marginTop: "4px" }}
                  >
                    Open Case Dossier <ChevronRight size={14} />
                  </Link>
                </div>
              )}
            </section>
          ) : (
            <section className="panel empty-state" style={{ padding: "14px" }}>
              Click any parcel on the map to inspect cadastral records.
            </section>
          )}
        </div>

        {/* Right: Leaflet Map Container */}
        <section className="panel" style={{ padding: 0, overflow: "hidden", position: "relative", borderRadius: "10px" }}>
          <MapContainer
            key={selectedProjectId}
            center={mapCenter}
            zoom={13}
            scrollWheelZoom={true}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Corridor Alignment */}
            {showAlignment && project?.alignment && (
              <Polyline
                positions={project.alignment}
                pathOptions={{ color: "#2563eb", weight: 5, opacity: 0.9 }}
              />
            )}

            {/* Cadastral Parcels */}
            {showParcels &&
              geoData?.features?.map((f: any) => {
                const status = f.properties.acquisitionStatus || "DEFAULT";
                const colors = statusColors[status] || statusColors.DEFAULT;
                const isSelected = selectedParcel?.externalId === f.properties.externalId || selectedParcel?.parcelId === f.properties.parcelId;

                const positions = f.geometry.coordinates[0].map(([lng, lat]: number[]) => [lat, lng]);

                return (
                  <Polygon
                    key={f.id}
                    positions={positions}
                    pathOptions={{
                      color: isSelected ? "#dc2626" : colors.stroke,
                      weight: isSelected ? 3 : 2,
                      fillColor: colors.fill,
                      fillOpacity: isSelected ? 0.6 : 0.4,
                    }}
                    eventHandlers={{
                      click: () => setSelectedParcel(f.properties),
                    }}
                  >
                    <Tooltip sticky>
                      <strong>{f.properties.externalId || f.properties.parcelId}</strong>
                      <div>Survey: {f.properties.surveyNumber}</div>
                      <div>Status: {f.properties.acquisitionStatus}</div>
                    </Tooltip>
                    <Popup>
                      <div style={{ fontSize: "12px", minWidth: "160px" }}>
                        <strong>{f.properties.externalId || f.properties.parcelId}</strong>
                        <div style={{ margin: "4px 0" }}>Survey Number: {f.properties.surveyNumber}</div>
                        <div>Village: {f.properties.village}</div>
                        <div style={{ marginTop: "6px" }}>
                          <StatusBadge status={f.properties.acquisitionStatus} />
                        </div>
                      </div>
                    </Popup>
                  </Polygon>
                );
              })}
          </MapContainer>
        </section>
      </div>
    </>
  );
}
