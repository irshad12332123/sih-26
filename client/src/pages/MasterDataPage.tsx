import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Database,
  Globe2,
  Layers,
  MapPin,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { api, login } from "../api";
import { PageHeader, StatusBadge } from "../components/common";

export function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<"officers" | "hierarchy" | "departments" | "parcels">("officers");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [officers, setOfficers] = useState<any[]>([]);
  const [hierarchy, setHierarchy] = useState<{
    states: any[];
    districts: any[];
    tehsils: any[];
    villages: any[];
  }>({ states: [], districts: [], tehsils: [], villages: [] });
  const [departments, setDepartments] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [parcels, setParcels] = useState<any[]>([]);

  useEffect(() => {
    async function loadMasterData() {
      try {
        setLoading(true);
        const [off, jur, dep, org, par] = await Promise.all([
          api<any[]>("/master/officers"),
          api<any>("/master/jurisdictions"),
          api<any[]>("/master/departments"),
          api<any[]>("/master/organizations"),
          api<any[]>("/master/parcels"),
        ]);
        setOfficers(off);
        setHierarchy(jur);
        setDepartments(dep);
        setOrganizations(org);
        setParcels(par);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load master authority databases");
      } finally {
        setLoading(false);
      }
    }
    loadMasterData();
  }, []);

  const handleQuickLogin = async (email: string) => {
    try {
      await login(email, "Demo@123");
      window.location.reload();
    } catch {
      alert("Failed to switch user account.");
    }
  };

  const filteredOfficers = officers.filter(
    (o) =>
      o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.district && o.district.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.tehsil && o.tehsil.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.village && o.village.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const filteredParcels = parcels.filter(
    (p) =>
      p.parcelId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.surveyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.village.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ownerName.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <>
      <PageHeader
        title="Master Authority & Officer Registry"
        description="Hierarchical government directory spanning National, State (Haryana), District (Ambala), Tehsil (Ambala / Saha), and Village jurisdictions."
      />

      {/* Demo Architecture Notice */}
      <div className="trust-banner" style={{ marginBottom: "20px" }}>
        <strong>DEMO / SYNTHETIC MASTER REPOSITORY</strong>
        <span>
          Officer names, designations, and employee codes are synthetic demonstration personas structured to reflect the publicly documented Haryana Land Acquisition & Revenue hierarchy.
        </span>
      </div>

      {error && <div className="login-note" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }}>{error}</div>}

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: "10px", borderBottom: "1px solid #e2e8f0", marginBottom: "20px" }}>
        <button
          className={`button ${activeTab === "officers" ? "button-primary" : "button-secondary"}`}
          onClick={() => setActiveTab("officers")}
          style={{ borderRadius: "8px 8px 0 0", borderBottom: "none" }}
        >
          <Users size={16} /> Officers Directory ({officers.length})
        </button>
        <button
          className={`button ${activeTab === "hierarchy" ? "button-primary" : "button-secondary"}`}
          onClick={() => setActiveTab("hierarchy")}
          style={{ borderRadius: "8px 8px 0 0", borderBottom: "none" }}
        >
          <Globe2 size={16} /> Administrative Jurisdictions ({hierarchy.districts.length} Districts · {hierarchy.tehsils.length} Tehsils)
        </button>
        <button
          className={`button ${activeTab === "departments" ? "button-primary" : "button-secondary"}`}
          onClick={() => setActiveTab("departments")}
          style={{ borderRadius: "8px 8px 0 0", borderBottom: "none" }}
        >
          <Building2 size={16} /> Departments & Bodies ({departments.length})
        </button>
        <button
          className={`button ${activeTab === "parcels" ? "button-primary" : "button-secondary"}`}
          onClick={() => setActiveTab("parcels")}
          style={{ borderRadius: "8px 8px 0 0", borderBottom: "none" }}
        >
          <Layers size={16} /> Cadastral Parcel Master ({parcels.length})
        </button>
      </div>

      {/* TAB 1: OFFICERS DIRECTORY */}
      {activeTab === "officers" && (
        <section className="panel table-panel">
          <div className="table-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>
              {filteredOfficers.length} Authorized Government Officers <small>· JURISDICTIONAL MAPPING</small>
            </span>
            <div style={{ position: "relative", width: "280px" }}>
              <input
                type="text"
                placeholder="Search by name, role, tehsil…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px 6px 28px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12px",
                }}
              />
              <Search size={14} style={{ position: "absolute", left: "8px", top: "9px", color: "#64748b" }} />
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Officer Name & Role</th>
                  <th>Designation & Department</th>
                  <th>Jurisdiction Level</th>
                  <th>Assigned Territory</th>
                  <th>Employee Ref</th>
                  <th>Source System</th>
                  <th>Switch Persona</th>
                </tr>
              </thead>
              <tbody>
                {filteredOfficers.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <div>
                        <strong>{o.name}</strong>
                        <div style={{ fontSize: "11px", color: "#2563eb", fontWeight: 600 }}>{o.role}</div>
                        <div style={{ fontSize: "10px", color: "#64748b" }}>{o.email}</div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <strong>{o.designation}</strong>
                        <div style={{ fontSize: "11px", color: "#475569" }}>{o.organization || o.department}</div>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "12px",
                          background:
                            o.jurisdictionType === "NATIONAL"
                              ? "#eff6ff"
                              : o.jurisdictionType === "STATE"
                              ? "#ecfdf5"
                              : o.jurisdictionType === "DISTRICT"
                              ? "#fef3c7"
                              : "#f1f5f9",
                          color:
                            o.jurisdictionType === "NATIONAL"
                              ? "#1e40af"
                              : o.jurisdictionType === "STATE"
                              ? "#065f46"
                              : o.jurisdictionType === "DISTRICT"
                              ? "#92400e"
                              : "#334155",
                        }}
                      >
                        {o.jurisdictionType}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: "12px" }}>
                        {o.village ? `${o.village}, ` : ""}
                        {o.tehsil ? `${o.tehsil}, ` : ""}
                        {o.district ? `${o.district}, ` : ""}
                        {o.state || "National Scope"}
                      </div>
                    </td>
                    <td>
                      <span className="mono" style={{ fontSize: "11px", color: "#475569" }}>
                        {o.employeeRef || o.id}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "10px", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "2px 6px", borderRadius: "4px" }}>
                        {o.sourceSystem || "HR-HRMS"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="button button-secondary button-sm"
                        onClick={() => handleQuickLogin(o.email)}
                        style={{ fontSize: "11px" }}
                      >
                        Switch Login
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 2: ADMINISTRATIVE JURISDICTIONS */}
      {activeTab === "hierarchy" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {/* Districts & Tehsils Tree */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>State & District Hierarchy</h2>
                <p>Haryana Administrative Structure</p>
              </div>
              <ShieldCheck size={20} color="#16a34a" />
            </div>
            <div style={{ padding: "8px 0" }}>
              {hierarchy.states.map((st) => (
                <div key={st.code} style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "14px", color: "#1e293b", marginBottom: "8px" }}>
                    <Globe2 size={16} color="#2563eb" />
                    <span>{st.name} ({st.code})</span>
                    <span style={{ fontSize: "10px", background: "#eff6ff", color: "#1e40af", padding: "1px 6px", borderRadius: "4px" }}>State HQ: Chandigarh</span>
                  </div>

                  {hierarchy.districts
                    .filter((d) => d.stateCode === st.code)
                    .map((d) => (
                      <div key={d.code} style={{ marginLeft: "20px", marginBottom: "12px", borderLeft: "2px solid #e2e8f0", paddingLeft: "12px" }}>
                        <div style={{ fontWeight: 600, fontSize: "13px", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                          <MapPin size={14} color="#f59e0b" />
                          <span>District {d.name} (LG Code: {d.lgdCode || "N/A"})</span>
                        </div>

                        <div style={{ marginLeft: "16px", marginTop: "6px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {hierarchy.tehsils
                            .filter((t) => t.districtCode === d.code)
                            .map((t) => (
                              <div
                                key={t.code}
                                style={{
                                  background: "#f8fafc",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "6px",
                                  padding: "4px 8px",
                                  fontSize: "11px",
                                  color: "#334155",
                                }}
                              >
                                <strong>Tehsil: {t.name}</strong> ({t.code})
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </section>

          {/* Revenue Villages */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Master Cadastral Revenue Villages</h2>
                <p>Linked to State Land Records (Jamabandi / Haryana Revenue)</p>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {hierarchy.villages.map((v) => (
                <div
                  key={v.code}
                  style={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "13px", color: "#1e293b" }}>Village {v.name}</strong>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      Tehsil: {v.tehsilCode} · District: {v.districtCode} · Census / LGD: {v.censusCode || "DEMO-HR-001"}
                    </div>
                  </div>
                  <span style={{ fontSize: "11px", background: "#eff6ff", color: "#2563eb", padding: "2px 8px", borderRadius: "10px", fontWeight: 600 }}>
                    Cadastral Active
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: DEPARTMENTS & SPONSORING BODIES */}
      {activeTab === "departments" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          {/* Departments */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Sponsoring Departments</h2>
                <p>Nodal acquisition project sponsoring bodies</p>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {departments.map((d) => (
                <div
                  key={d.code}
                  style={{
                    padding: "14px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    background: "#fff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <strong style={{ fontSize: "14px", color: "#1e293b" }}>{d.name}</strong>
                    <span className="mono" style={{ fontSize: "11px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                      {d.code}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    State / Jurisdiction: <strong>{d.state || "National"}</strong>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Organizations / Executing Agencies */}
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Executing Authorities & PSUs</h2>
                <p>Infrastructure project developers</p>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {organizations.map((org) => (
                <div
                  key={org.code}
                  style={{
                    padding: "14px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    background: "#fff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <strong style={{ fontSize: "14px", color: "#1e293b" }}>{org.name}</strong>
                    <span className="mono" style={{ fontSize: "11px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                      {org.code}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#64748b" }}>
                    Category: <strong>{org.type}</strong> · Department Code: <strong>{org.departmentCode}</strong>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* TAB 4: MASTER PARCELS POOL */}
      {activeTab === "parcels" && (
        <section className="panel table-panel">
          <div className="table-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>
              {filteredParcels.length} Cadastral Parcels in Master Cadastral Layer <small>· STATE LAND RECORDS POOL</small>
            </span>
            <div style={{ position: "relative", width: "280px" }}>
              <input
                type="text"
                placeholder="Search survey, village, owner…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px 6px 28px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12px",
                }}
              />
              <Search size={14} style={{ position: "absolute", left: "8px", top: "9px", color: "#64748b" }} />
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Cadastral Parcel ID</th>
                  <th>Survey / Khasra No</th>
                  <th>Village & Tehsil</th>
                  <th>Primary Khatedar / Owner</th>
                  <th>Land Classification</th>
                  <th>Area (Hectares)</th>
                  <th>Market Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredParcels.map((p) => (
                  <tr key={p.id}>
                    <td><strong className="mono" style={{ color: "#2563eb" }}>{p.parcelId}</strong></td>
                    <td><strong>{p.surveyNumber}</strong></td>
                    <td>{p.village}, {p.tehsil}</td>
                    <td>{p.ownerName}</td>
                    <td><span style={{ fontSize: "11px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>{p.landType}</span></td>
                    <td><strong>{p.areaHectares} ha</strong></td>
                    <td>₹{(p.marketValue || 0).toLocaleString("en-IN")}</td>
                    <td><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
