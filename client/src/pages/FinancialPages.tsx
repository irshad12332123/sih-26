import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  Plus,
  RefreshCw,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import { api, currentUser } from "../api";
import { PageHeader, StatusBadge } from "../components/common";
import { Alert, ErrorBlock, Modal, TableLoadingRow } from "../components/ui";

type Compensation = {
  id: string;
  caseId: string;
  caseReference: string;
  parcelId: string;
  village: string;
  assessedAmount: number;
  approvedAmount: number;
  paidAmount: number;
  status: string;
  paymentReference?: string;
  sourceSystem: string;
  lastSyncedAt?: string;
};

type RR = {
  id: string;
  caseId: string;
  caseReference: string;
  parcelId: string;
  village: string;
  affectedFamilies: number;
  displacedFamilies: number;
  eligibleFamilies: number;
  benefitsDelivered: number;
  status: string;
  sourceSystem: string;
};

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;

const canUpdate = () =>
  [
    "SUPER_ADMIN",
    "NATIONAL_ADMIN",
    "DEPARTMENT_ADMIN",
    "PROJECT_OFFICER",
    "DISTRICT_OFFICER",
    "COMPENSATION_OFFICER",
    "COMPENSATION_REVIEWER",
    "RR_OFFICER",
    "RR_REVIEWER",
  ].includes(currentUser()?.role || "");

function Metric({
  label,
  value,
  sub,
  iconColor,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  iconColor?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${iconColor || "blue"}`}>
        {icon || <CircleDollarSign size={19} />}
      </div>
      <div className="stat-label">{label}</div>
      <strong className="stat-value">{value}</strong>
      <span className="stat-delta">{sub || "Live database metric"}</span>
    </div>
  );
}

export function CompensationPage() {
  const [rows, setRows] = useState<Compensation[]>([]);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Valuation Assessment Modal State
  const [activeValuationRow, setActiveValuationRow] = useState<Compensation | null>(null);
  const [baseMarketRate, setBaseMarketRate] = useState(1500000);
  const [areaInHa, setAreaInHa] = useState(1.2);
  const [solatiumPercent, setSolatiumPercent] = useState(100); // 100% statutory RFCTLARR solatium
  const [multiplierFactor, setMultiplierFactor] = useState(1.25); // Rural multiplier

  const calculatedBase = baseMarketRate * areaInHa * multiplierFactor;
  const calculatedSolatium = calculatedBase * (solatiumPercent / 100);
  const calculatedTotal = calculatedBase + calculatedSolatium;

  const refresh = async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoaded(false);
    setError("");
    try {
      setRows((await api<Compensation[]>("/compensation")) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compensation records could not be loaded.");
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    refresh();
    const onChange = () => refresh({ silent: true });
    window.addEventListener("nlams:data-changed", onChange);
    return () => window.removeEventListener("nlams:data-changed", onChange);
  }, []);

  // Seed the calculator from the record being assessed so the officer is not
  // recomputing against an unrelated default area.
  const openValuation = (row: Compensation) => {
    setActiveValuationRow(row);
    setBaseMarketRate(1500000);
    setSolatiumPercent(100);
    setMultiplierFactor(1.25);
    setAreaInHa(
      row.assessedAmount > 0
        ? Number((row.assessedAmount / (1500000 * 1.25 * 2)).toFixed(2))
        : 1.2,
    );
  };

  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, row) => ({
          assessed: sum.assessed + row.assessedAmount,
          approved: sum.approved + row.approvedAmount,
          paid: sum.paid + row.paidAmount,
        }),
        { assessed: 0, approved: 0, paid: 0 },
      ),
    [rows],
  );

  const handleSaveAssessment = async () => {
    if (!activeValuationRow) return;
    if (!(calculatedTotal > 0) || !Number.isFinite(calculatedTotal)) {
      setError("Enter a positive circle rate, area and multiplier before saving the assessment.");
      return;
    }
    setBusy(activeValuationRow.id);
    try {
      await api(`/compensation/${activeValuationRow.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "ASSESSED",
          assessedAmount: Math.round(calculatedTotal),
        }),
      });
      setMessage(
        `Land Valuation Assessment computed for ${activeValuationRow.caseReference}: ${money(
          Math.round(calculatedTotal),
        )} (Base + ${solatiumPercent}% Solatium).`,
      );
      setActiveValuationRow(null);
      await refresh({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Assessment update failed.");
    } finally {
      setBusy("");
    }
  };

  async function handleApproveAward(row: Compensation) {
    setBusy(row.id);
    try {
      // PATCH /compensation/:id responds with the updated record itself.
      const updated = await api<Compensation>(`/compensation/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "APPROVED",
          approvedAmount: row.assessedAmount,
        }),
      });
      setMessage(
        `Compensation Award approved for ${row.caseReference} (${money(
          updated.approvedAmount || row.assessedAmount,
        )}). Mock PFMS DBT disbursement executed${
          updated.paymentReference ? ` (Ref: ${updated.paymentReference})` : ""
        }.`,
      );
      await refresh({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed.");
    } finally {
      setBusy("");
    }
  }

  async function handlePFMSSync(row: Compensation) {
    setBusy(row.id);
    try {
      const result = await api<Compensation>(`/compensation/${row.id}/sync`, {
        method: "POST",
      });
      setMessage(
        `PFMS DBT payment confirmed (${result.status}) for ${row.caseReference}${
          result.paymentReference ? ` · Ref ${result.paymentReference}` : ""
        }.`,
      );
      await refresh({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "PFMS synchronization failed.");
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      <PageHeader
        title="Compensation Monitoring & Disbursement"
        description="Land valuation assessment, statutory compensation award approval, and direct benefit transfer (DBT) reconciliation with PFMS DEMO adapter."
      />

      {/* Trust Notice */}
      <div className="trust-banner" style={{ marginBottom: "20px" }}>
        <strong>PFMS INTEGRATION · DEMO / MOCK ADAPTER</strong>
        <span>
          Payment transactions and DBT UTR numbers are simulated via the mock PFMS adapter. No real banking operations are initiated.
        </span>
      </div>

      <Alert tone="success" message={message} onDismiss={() => setMessage("")} />
      <Alert tone="error" message={error} onDismiss={() => setError("")} />

      <div className="stat-grid" style={{ marginBottom: "20px" }}>
        <Metric label="Total Assessed" value={money(totals.assessed)} iconColor="blue" />
        <Metric label="Approved Awards" value={money(totals.approved)} iconColor="purple" />
        <Metric label="Disbursed / Paid (DBT)" value={money(totals.paid)} iconColor="green" />
        <Metric label="Pending Payments" value={String(rows.filter((r) => r.status !== "PAID").length)} iconColor="amber" />
      </div>

      <section className="panel table-panel">
        <div className="table-top">
          <span>{rows.length} Compensation Records Linked to Cases <small>· STATUTORY AWARDS</small></span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Case / Parcel</th>
                <th>Assessed Valuation</th>
                <th>Approved Award</th>
                <th>Disbursed Amount</th>
                <th>PFMS Payment Ref (UTR)</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {!loaded && rows.length === 0 ? (
                <TableLoadingRow colSpan={7} label="Loading compensation records…" />
              ) : error && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 0 }}>
                    <ErrorBlock message={error} onRetry={() => refresh()} />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div style={{ maxWidth: "440px", margin: "0 auto" }}>
                      <div style={{ fontSize: "28px", marginBottom: "8px" }}>💰</div>
                      <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", margin: "0 0 6px" }}>
                        No Compensation Records Available
                      </h3>
                      <p style={{ fontSize: "12px", color: "#64748b", margin: "0", lineHeight: "1.5" }}>
                        Compensation records are generated when acquisition cases advance to the Land Valuation & Assessment stage.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link className="table-title mono" to={`/cases/${row.caseId}`}>
                        {row.caseReference}
                        <span className="table-sub">{row.parcelId} · {row.village}</span>
                      </Link>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <strong>{money(row.assessedAmount)}</strong>
                        {canUpdate() && (row.status === "PENDING" || row.status === "ASSESSED") && (
                          <button
                            className="button button-secondary button-sm"
                            style={{ padding: "2px 6px", fontSize: "10px" }}
                            onClick={() => openValuation(row)}
                          >
                            <Calculator size={11} /> {row.status === "PENDING" ? "Assess" : "Recompute"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td><strong style={{ color: row.approvedAmount > 0 ? "#7c3aed" : "#64748b" }}>{money(row.approvedAmount)}</strong></td>
                    <td><strong style={{ color: row.paidAmount > 0 ? "#16a34a" : "#64748b" }}>{money(row.paidAmount)}</strong></td>
                    <td>
                      <span className="mono" style={{ fontSize: "11px", color: row.paymentReference ? "#0f766e" : "#94a3b8" }}>
                        {row.paymentReference || "Awaiting PFMS Sync"}
                      </span>
                    </td>
                    <td><StatusBadge status={row.status} /></td>
                    <td>
                      {canUpdate() && (
                        <div style={{ display: "flex", gap: "6px" }}>
                          {row.status === "ASSESSED" && (
                            <button
                              disabled={!!busy}
                              className="button button-secondary button-sm"
                              onClick={() => handleApproveAward(row)}
                            >
                              <CheckCircle2 size={13} /> Approve Award
                            </button>
                          )}
                          {row.status === "APPROVED" && (
                            <button
                              disabled={!!busy}
                              className="button button-primary button-sm"
                              onClick={() => handlePFMSSync(row)}
                            >
                              <RefreshCw size={13} className={busy === row.id ? "spin-icon" : ""} />
                              {busy === row.id ? "Disbursing…" : "PFMS DBT Sync"}
                            </button>
                          )}
                          {row.status === "PAID" && (
                            <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <CheckCircle2 size={13} /> DBT Completed
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* VALUATION CALCULATOR MODAL */}
      <Modal
        open={!!activeValuationRow}
        title="Land Valuation & Compensation Assessment"
        onClose={() => setActiveValuationRow(null)}
        footer={
          <>
            <button className="button button-secondary" onClick={() => setActiveValuationRow(null)} disabled={!!busy}>
              Cancel
            </button>
            <button
              className="button button-primary"
              onClick={handleSaveAssessment}
              disabled={!!busy || !(calculatedTotal > 0)}
            >
              {busy ? "Saving…" : "Save Compensation Assessment"}
            </button>
          </>
        }
      >
        {activeValuationRow && (
          <>
            <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "6px", marginBottom: "16px", fontSize: "12px", color: "#334155" }}>
              Case: <strong>{activeValuationRow.caseReference}</strong> · Parcel:{" "}
              <strong>{activeValuationRow.parcelId}</strong> ({activeValuationRow.village})
            </div>

            <div className="form-row form-row-2" style={{ marginBottom: "14px" }}>
              <label className="input-label">
                BASE CIRCLE RATE (₹ / HA)
                <input
                  type="number"
                  min={1}
                  value={baseMarketRate}
                  onChange={(e) => setBaseMarketRate(Number(e.target.value))}
                />
              </label>
              <label className="input-label">
                ACQUISITION AREA (HA)
                <input
                  type="number"
                  min={0.01}
                  step="0.1"
                  value={areaInHa}
                  onChange={(e) => setAreaInHa(Number(e.target.value))}
                />
              </label>
              <label className="input-label">
                RURAL MULTIPLIER (FACTOR)
                <input
                  type="number"
                  min={0.1}
                  step="0.05"
                  value={multiplierFactor}
                  onChange={(e) => setMultiplierFactor(Number(e.target.value))}
                />
              </label>
              <label className="input-label">
                STATUTORY SOLATIUM (%)
                <input
                  type="number"
                  min={0}
                  max={200}
                  value={solatiumPercent}
                  onChange={(e) => setSolatiumPercent(Number(e.target.value))}
                />
              </label>
            </div>

            {!(calculatedTotal > 0) && (
              <Alert
                tone="warning"
                message="Enter a positive circle rate, area and multiplier to compute a valid award."
              />
            )}

            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "14px", borderRadius: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "12px", marginBottom: "4px", color: "#1e40af" }}>
                <span>Base Market Value (Rate × Area × Factor):</span>
                <strong>{money(Math.round(calculatedBase) || 0)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "12px", marginBottom: "6px", color: "#1e40af" }}>
                <span>Statutory Solatium ({solatiumPercent}% under RFCTLARR):</span>
                <strong>{money(Math.round(calculatedSolatium) || 0)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "14px", fontWeight: 700, color: "#1e3a8a", borderTop: "1px solid #93c5fd", paddingTop: "6px" }}>
                <span>Total Determined Compensation Award:</span>
                <span>{money(Math.round(calculatedTotal) || 0)}</span>
              </div>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

export function RRPage() {
  const [rows, setRows] = useState<RR[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState("");

  const refresh = async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoaded(false);
    setError("");
    try {
      setRows((await api<RR[]>("/rr")) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "R&R records could not be loaded.");
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    refresh();
    const onChange = () => refresh({ silent: true });
    window.addEventListener("nlams:data-changed", onChange);
    return () => window.removeEventListener("nlams:data-changed", onChange);
  }, []);

  async function handleDeliverBenefits(row: RR) {
    setBusy(row.id);
    try {
      await api(`/rr/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "COMPLETED",
          benefitsDelivered: row.eligibleFamilies,
        }),
      });
      setMessage(`${row.caseReference} R&R entitlement package delivered to all ${row.eligibleFamilies} eligible families.`);
      await refresh({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "R&R update failed.");
    } finally {
      setBusy("");
    }
  }

  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, r) => ({
          affected: sum.affected + r.affectedFamilies,
          displaced: sum.displaced + r.displacedFamilies,
          eligible: sum.eligible + r.eligibleFamilies,
          delivered: sum.delivered + r.benefitsDelivered,
        }),
        { affected: 0, displaced: 0, eligible: 0, delivered: 0 },
      ),
    [rows],
  );

  return (
    <>
      <PageHeader
        title="Rehabilitation & Resettlement (R&R)"
        description="Monitoring affected and displaced families, entitlement packages, and verified benefit delivery under RFCTLARR framework."
      />

      <Alert tone="success" message={message} onDismiss={() => setMessage("")} />
      <Alert tone="error" message={error} onDismiss={() => setError("")} />

      <div className="stat-grid" style={{ marginBottom: "20px" }}>
        <Metric label="Affected Families" value={String(totals.affected)} iconColor="blue" icon={<UsersRound size={19} />} />
        <Metric label="Displaced Families" value={String(totals.displaced)} iconColor="amber" icon={<UsersRound size={19} />} />
        <Metric label="Eligible for Entitlements" value={String(totals.eligible)} iconColor="purple" icon={<ShieldCheck size={19} />} />
        <Metric label="Benefits Delivered" value={`${totals.delivered} / ${totals.eligible}`} iconColor="green" icon={<CheckCircle2 size={19} />} />
      </div>

      <section className="panel table-panel">
        <div className="table-top">
          <span>{rows.length} R&R Records Linked to Acquisition Cases</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Case / Parcel</th>
                <th>Affected Families</th>
                <th>Displaced Families</th>
                <th>Eligible Families</th>
                <th>Benefit Delivery Progress</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {!loaded && rows.length === 0 ? (
                <TableLoadingRow colSpan={7} label="Loading R&R records…" />
              ) : error && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: 0 }}>
                    <ErrorBlock message={error} onRetry={() => refresh()} />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div style={{ maxWidth: "440px", margin: "0 auto" }}>
                      <div style={{ fontSize: "28px", marginBottom: "8px" }}>🏠</div>
                      <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", margin: "0 0 6px" }}>
                        No R&R Records Available
                      </h3>
                      <p style={{ fontSize: "12px", color: "#64748b", margin: "0", lineHeight: "1.5" }}>
                        R&R records are generated when acquisition cases advance to the Rehabilitation & Resettlement stage.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link className="table-title mono" to={`/cases/${row.caseId}`}>
                        {row.caseReference}
                        <span className="table-sub">{row.parcelId} · {row.village}</span>
                      </Link>
                    </td>
                    <td>{row.affectedFamilies}</td>
                    <td>{row.displacedFamilies}</td>
                    <td><strong>{row.eligibleFamilies}</strong></td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span
                          style={{
                            color: row.benefitsDelivered >= row.eligibleFamilies ? "#16a34a" : "#2563eb",
                            fontWeight: 700,
                          }}
                        >
                          {row.benefitsDelivered} / {row.eligibleFamilies}
                        </span>
                      </div>
                    </td>
                    <td><StatusBadge status={row.status} /></td>
                    <td>
                      {canUpdate() && row.status !== "COMPLETED" && (
                        <button
                          disabled={!!busy}
                          className="button button-primary button-sm"
                          onClick={() => handleDeliverBenefits(row)}
                        >
                          <UsersRound size={13} />
                          {busy === row.id ? "Updating…" : "Deliver Benefits"}
                        </button>
                      )}
                      {row.status === "COMPLETED" && (
                        <span style={{ color: "#16a34a", fontSize: "11px", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <CheckCircle2 size={13} /> Complete
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
