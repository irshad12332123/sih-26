import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Globe2,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { api, getRoleDashboardPath, login } from "../api";
import { PageHeader, StatusBadge } from "../components/common";
import { Alert, ErrorBlock, LoadingBlock } from "../components/ui";

/** Shapes returned by the /master/* endpoints. */
type Officer = {
  id: string;
  officerId?: string;
  employeeReference?: string;
  displayName: string;
  designation?: string;
  role: string;
  department?: string;
  organization?: string;
  state?: string;
  district?: string;
  tehsil?: string;
  village?: string;
  jurisdictionType?: string;
  email: string;
  active?: boolean;
  source?: string;
  sourceReference?: string;
};

type MasterParcel = {
  id: string;
  parcelId: string;
  externalId?: string;
  surveyNumber: string;
  village: string;
  tehsil: string;
  district: string;
  state: string;
  ownerReference: string;
  totalArea: number;
  requiredArea: number;
  landStatus?: string;
  acquisitionStatus: string;
  sourceSystem?: string;
  sourceReference?: string;
};

type Jurisdictions = {
  states: { id: string; name: string; code: string }[];
  districts: { id: string; stateId: string; stateName: string; name: string; code: string }[];
  tehsils: { id: string; districtId: string; districtName: string; name: string; code: string }[];
  villages: {
    id: string;
    tehsilId: string;
    tehsilName: string;
    districtName: string;
    stateName: string;
    name: string;
    code: string;
    pincode?: string;
  }[];
};

const EMPTY_JURISDICTIONS: Jurisdictions = { states: [], districts: [], tehsils: [], villages: [] };

/** Case-insensitive "does any of these fields contain the term" helper. */
const matches = (term: string, ...fields: (string | undefined | null)[]) => {
  if (!term) return true;
  const needle = term.toLowerCase();
  return fields.some((field) => (field || "").toLowerCase().includes(needle));
};

export function MasterDataPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"officers" | "hierarchy" | "departments" | "parcels">("officers");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [switchError, setSwitchError] = useState("");
  const [switchingEmail, setSwitchingEmail] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [officers, setOfficers] = useState<Officer[]>([]);
  const [hierarchy, setHierarchy] = useState<Jurisdictions>(EMPTY_JURISDICTIONS);
  const [departments, setDepartments] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [parcels, setParcels] = useState<MasterParcel[]>([]);

  const loadMasterData = async () => {
    try {
      setLoading(true);
      setError("");
      const [off, jur, dep, org, par] = await Promise.all([
        api<Officer[]>("/master/officers"),
        api<Jurisdictions>("/master/jurisdictions"),
        api<any[]>("/master/departments"),
        api<any[]>("/master/organizations"),
        api<MasterParcel[]>("/master/parcels"),
      ]);
      setOfficers(off || []);
      setHierarchy({ ...EMPTY_JURISDICTIONS, ...(jur || {}) });
      setDepartments(dep || []);
      setOrganizations(org || []);
      setParcels(par || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load master authority databases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMasterData();
  }, []);

  // Reset the shared search box when switching between tabs — the term rarely
  // makes sense across two different datasets.
  useEffect(() => {
    setSearchTerm("");
  }, [activeTab]);

  const handleQuickLogin = async (officer: Officer) => {
    if (switchingEmail) return;
    try {
      setSwitchingEmail(officer.email);
      setSwitchError("");
      const user = await login(officer.email, "Demo@123");
      navigate(getRoleDashboardPath(user.role), { replace: true });
    } catch (err) {
      setSwitchError(
        err instanceof Error ? err.message : `Could not sign in as ${officer.displayName}.`,
      );
    } finally {
      setSwitchingEmail("");
    }
  };

  const filteredOfficers = useMemo(
    () =>
      officers.filter((o) =>
        matches(
          searchTerm,
          o.displayName,
          o.email,
          o.designation,
          o.role,
          o.department,
          o.organization,
          o.district,
          o.tehsil,
          o.village,
          o.officerId,
          o.employeeReference,
        ),
      ),
    [officers, searchTerm],
  );

  const filteredParcels = useMemo(
    () =>
      parcels.filter((p) =>
        matches(
          searchTerm,
          p.parcelId,
          p.externalId,
          p.surveyNumber,
          p.village,
          p.tehsil,
          p.district,
          p.ownerReference,
          p.landStatus,
        ),
      ),
    [parcels, searchTerm],
  );

  const tabs = [
    { id: "officers" as const, label: `Officers Directory (${officers.length})`, icon: Users },
    {
      id: "hierarchy" as const,
      label: `Administrative Jurisdictions (${hierarchy.districts.length} Districts · ${hierarchy.tehsils.length} Tehsils)`,
      icon: Globe2,
    },
    { id: "departments" as const, label: `Departments & Bodies (${departments.length})`, icon: Building2 },
    { id: "parcels" as const, label: `Cadastral Parcel Master (${parcels.length})`, icon: Layers },
  ];

  return (
    <>
      <PageHeader
        title="Master Authority & Officer Registry"
        description="Hierarchical government directory spanning National, State (Haryana), District (Ambala), Tehsil (Ambala / Saha), and Village jurisdictions."
      />

      <div className="trust-banner" style={{ marginBottom: "20px" }}>
        <strong>DEMO / SYNTHETIC MASTER REPOSITORY</strong>
        <span>
          Officer names, designations, and employee codes are synthetic demonstration personas structured to reflect the publicly documented Haryana Land Acquisition & Revenue hierarchy.
        </span>
      </div>

      <Alert tone="error" message={switchError} onDismiss={() => setSwitchError("")} />

      {loading ? (
        <section className="panel">
          <LoadingBlock label="Loading master authority registry…" />
        </section>
      ) : error ? (
        <section className="panel">
          <ErrorBlock message={error} onRetry={loadMasterData} />
        </section>
      ) : (
        <>
          <div className="tab-row" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`button ${activeTab === tab.id ? "button-primary" : "button-secondary"}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: OFFICERS DIRECTORY */}
          {activeTab === "officers" && (
            <section className="panel table-panel">
              <div className="table-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", height: "auto", padding: "12px 20px" }}>
                <span>
                  {filteredOfficers.length} Authorized Government Officers <small>· JURISDICTIONAL MAPPING</small>
                </span>
                <div className="search-field">
                  <Search size={14} />
                  <input
                    type="search"
                    placeholder="Search by name, role, tehsil…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Search officers"
                  />
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
                    {filteredOfficers.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "26px", color: "#64748b", fontSize: "12px" }}>
                          No officers match “{searchTerm}”.
                        </td>
                      </tr>
                    ) : (
                      filteredOfficers.map((o) => (
                        <tr key={o.id}>
                          <td>
                            <div>
                              <strong>{o.displayName}</strong>
                              <div style={{ fontSize: "11px", color: "#2563eb", fontWeight: 600 }}>{o.role}</div>
                              <div style={{ fontSize: "10px", color: "#64748b" }}>{o.email}</div>
                            </div>
                          </td>
                          <td>
                            <div>
                              <strong>{o.designation || "—"}</strong>
                              <div style={{ fontSize: "11px", color: "#475569" }}>{o.organization || o.department || "—"}</div>
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
                              {o.jurisdictionType || "UNSPECIFIED"}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: "12px" }}>
                              {[o.village, o.tehsil, o.district, o.state].filter(Boolean).join(", ") || "National Scope"}
                            </div>
                          </td>
                          <td>
                            <span className="mono" style={{ fontSize: "11px", color: "#475569" }}>
                              {o.employeeReference || o.officerId || o.id}
                            </span>
                          </td>
                          <td>
                            <span
                              title={o.source}
                              style={{ fontSize: "10px", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "2px 6px", borderRadius: "4px", display: "inline-block", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                            >
                              {o.sourceReference || o.source || "HR-HRMS"}
                            </span>
                          </td>
                          <td>
                            <button
                              className="button button-secondary button-sm"
                              onClick={() => handleQuickLogin(o)}
                              disabled={!!switchingEmail}
                              style={{ fontSize: "11px" }}
                            >
                              {switchingEmail === o.email ? (
                                <>
                                  <RefreshCw size={12} className="spin-icon" /> Switching…
                                </>
                              ) : (
                                "Switch Login"
                              )}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* TAB 2: ADMINISTRATIVE JURISDICTIONS */}
          {activeTab === "hierarchy" && (
            <div className="split-grid">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>State & District Hierarchy</h2>
                    <p>Haryana Administrative Structure</p>
                  </div>
                  <ShieldCheck size={20} color="#16a34a" />
                </div>
                <div style={{ padding: "8px 18px 18px" }}>
                  {hierarchy.states.length === 0 ? (
                    <div className="empty-state">No jurisdiction records available.</div>
                  ) : (
                    hierarchy.states.map((st) => {
                      const districts = hierarchy.districts.filter((d) => d.stateId === st.id || d.stateName === st.name);
                      return (
                        <div key={st.id} style={{ marginBottom: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "14px", color: "#1e293b", marginBottom: "8px", flexWrap: "wrap" }}>
                            <Globe2 size={16} color="#2563eb" />
                            <span>{st.name} ({st.code})</span>
                            <span style={{ fontSize: "10px", background: "#eff6ff", color: "#1e40af", padding: "1px 6px", borderRadius: "4px" }}>
                              {districts.length} district{districts.length === 1 ? "" : "s"} mapped
                            </span>
                          </div>

                          {districts.length === 0 ? (
                            <div style={{ marginLeft: "20px", fontSize: "11px", color: "#94a3b8" }}>
                              No districts mapped for this state in the demo master data.
                            </div>
                          ) : (
                            districts.map((d) => {
                              const tehsils = hierarchy.tehsils.filter(
                                (t) => t.districtId === d.id || t.districtName === d.name,
                              );
                              return (
                                <div key={d.id} style={{ marginLeft: "20px", marginBottom: "12px", borderLeft: "2px solid #e2e8f0", paddingLeft: "12px" }}>
                                  <div style={{ fontWeight: 600, fontSize: "13px", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <MapPin size={14} color="#f59e0b" />
                                    <span>District {d.name} (Code: {d.code})</span>
                                  </div>
                                  <div style={{ marginLeft: "16px", marginTop: "6px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                    {tehsils.length === 0 ? (
                                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>No tehsils mapped.</span>
                                    ) : (
                                      tehsils.map((t) => (
                                        <div
                                          key={t.id}
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
                                      ))
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Master Cadastral Revenue Villages</h2>
                    <p>Linked to State Land Records (Jamabandi / Haryana Revenue)</p>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "0 18px 18px" }}>
                  {hierarchy.villages.length === 0 ? (
                    <div className="empty-state">No revenue villages registered.</div>
                  ) : (
                    hierarchy.villages.map((v) => (
                      <div
                        key={v.id}
                        style={{
                          background: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          padding: "12px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <strong style={{ fontSize: "13px", color: "#1e293b" }}>Village {v.name}</strong>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>
                            Tehsil: {v.tehsilName} · District: {v.districtName} · LGD Code: {v.code}
                            {v.pincode ? ` · PIN ${v.pincode}` : ""}
                          </div>
                        </div>
                        <span style={{ fontSize: "11px", background: "#eff6ff", color: "#2563eb", padding: "2px 8px", borderRadius: "10px", fontWeight: 600 }}>
                          Cadastral Active
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: DEPARTMENTS & SPONSORING BODIES */}
          {activeTab === "departments" && (
            <div className="split-grid">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Sponsoring Departments</h2>
                    <p>Nodal acquisition project sponsoring bodies</p>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "0 18px 18px" }}>
                  {departments.length === 0 ? (
                    <div className="empty-state">No departments registered.</div>
                  ) : (
                    departments.map((d) => (
                      <div key={d.id || d.code} style={{ padding: "14px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", gap: "8px" }}>
                          <strong style={{ fontSize: "14px", color: "#1e293b" }}>{d.name}</strong>
                          <span className="mono" style={{ fontSize: "11px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", whiteSpace: "nowrap" }}>
                            {d.code}
                          </span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                          State / Jurisdiction: <strong>{d.state || "National"}</strong>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Executing Authorities & PSUs</h2>
                    <p>Infrastructure project developers</p>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "0 18px 18px" }}>
                  {organizations.length === 0 ? (
                    <div className="empty-state">No executing authorities registered.</div>
                  ) : (
                    organizations.map((org) => (
                      <div key={org.id || org.code} style={{ padding: "14px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#fff" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", gap: "8px" }}>
                          <strong style={{ fontSize: "14px", color: "#1e293b" }}>{org.name}</strong>
                          <span className="mono" style={{ fontSize: "11px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", whiteSpace: "nowrap" }}>
                            {org.code}
                          </span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                          Category: <strong>{org.type}</strong> · Jurisdiction:{" "}
                          <strong>{[org.district, org.state].filter(Boolean).join(", ") || "National"}</strong>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}

          {/* TAB 4: MASTER PARCELS POOL */}
          {activeTab === "parcels" && (
            <section className="panel table-panel">
              <div className="table-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", height: "auto", padding: "12px 20px" }}>
                <span>
                  {filteredParcels.length} Cadastral Parcels in Master Cadastral Layer <small>· STATE LAND RECORDS POOL</small>
                </span>
                <div className="search-field">
                  <Search size={14} />
                  <input
                    type="search"
                    placeholder="Search survey, village, owner…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Search cadastral parcels"
                  />
                </div>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Cadastral Parcel ID</th>
                      <th>Survey / Khasra No</th>
                      <th>Village & Tehsil</th>
                      <th>Khatedar / Owner Reference</th>
                      <th>Land Classification</th>
                      <th>Total Area</th>
                      <th>Required Area</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredParcels.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: "26px", color: "#64748b", fontSize: "12px" }}>
                          No cadastral parcels match “{searchTerm}”.
                        </td>
                      </tr>
                    ) : (
                      filteredParcels.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <strong className="mono" style={{ color: "#2563eb" }}>{p.parcelId}</strong>
                            {p.externalId && <div className="table-sub">Ext: {p.externalId}</div>}
                          </td>
                          <td><strong>{p.surveyNumber}</strong></td>
                          <td>{p.village}, {p.tehsil}</td>
                          <td><span className="mono" style={{ fontSize: "11px" }}>{p.ownerReference}</span></td>
                          <td>
                            <span style={{ fontSize: "11px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>
                              {p.landStatus || "UNCLASSIFIED"}
                            </span>
                          </td>
                          <td><strong>{p.totalArea} ha</strong></td>
                          <td><strong style={{ color: "#2563eb" }}>{p.requiredArea} ha</strong></td>
                          <td><StatusBadge status={p.acquisitionStatus} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
