import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CircleDollarSign, RefreshCw, UsersRound, CheckCircle2 } from "lucide-react";
import { api, currentUser } from "../api";
import { EmptyState, PageHeader, StatusBadge } from "../components/common";

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
  ["SUPER_ADMIN", "NATIONAL_ADMIN", "DEPARTMENT_ADMIN", "PROJECT_OFFICER", "DISTRICT_OFFICER"].includes(
    currentUser()?.role || "",
  );

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat-card">
      <div className="stat-icon blue">
        <CircleDollarSign size={19} />
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

  const refresh = async () => {
    setError("");
    try {
      setRows(await api<Compensation[]>("/compensation"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Compensation records could not be loaded.");
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

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

  async function update(row: Compensation) {
    setBusy(row.id);
    try {
      await api(`/compensation/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "APPROVED",
          approvedAmount: row.assessedAmount,
        }),
      });
      setMessage(`Section 3G award for ${row.caseReference} approved (₹${row.assessedAmount.toLocaleString("en-IN")}).`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusy("");
    }
  }

  async function sync(row: Compensation) {
    setBusy(row.id);
    try {
      const result = await api<Compensation>(`/compensation/${row.id}/sync`, {
        method: "POST",
      });
      setMessage(
        `PFMS DEMO sync confirmed ${result.status} for ${row.caseReference} (Ref: ${result.paymentReference || "DEMO-PFMS"}).`,
      );
      await refresh();
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
        description="Direct benefit transfer (DBT) reconciliation with PFMS DEMO adapter for Section 3G & 3H awards."
      />

      {message && <div className="login-note" style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}>{message}</div>}
      {error && <div className="login-note" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }}>{error}</div>}

      <div className="stat-grid">
        <Metric label="Total Assessed" value={money(totals.assessed)} />
        <Metric label="Approved Awards" value={money(totals.approved)} />
        <Metric label="Disbursed / Paid" value={money(totals.paid)} />
        <Metric label="Pending Payments" value={String(rows.filter((r) => r.status !== "PAID").length)} />
      </div>

      <section className="panel table-panel">
        <div className="table-top">
          <span>{rows.length} Compensation Records Linked to Cases <small>· PFMS IS DEMO / MOCK</small></span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Case / Parcel</th>
                <th>Assessed Amount</th>
                <th>Approved Award</th>
                <th>Paid Amount</th>
                <th>PFMS Payment Ref</th>
                <th>Disbursement Status</th>
                <th>Workflow Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link className="table-title mono" to={`/cases/${row.caseId}`}>
                      {row.caseReference}
                      <span className="table-sub">{row.parcelId} · {row.village}</span>
                    </Link>
                  </td>
                  <td>{money(row.assessedAmount)}</td>
                  <td><strong style={{ color: row.approvedAmount > 0 ? "#16a34a" : "#64748b" }}>{money(row.approvedAmount)}</strong></td>
                  <td><strong style={{ color: row.paidAmount > 0 ? "#2563eb" : "#64748b" }}>{money(row.paidAmount)}</strong></td>
                  <td><span className="mono" style={{ fontSize: "11px" }}>{row.paymentReference || "Awaiting PFMS Sync"}</span></td>
                  <td><StatusBadge status={row.status} /></td>
                  <td>
                    {canUpdate() && (
                      <div style={{ display: "flex", gap: "6px" }}>
                        {row.status === "ASSESSED" && (
                          <button
                            disabled={!!busy}
                            className="button button-secondary button-sm"
                            onClick={() => update(row)}
                          >
                            <CheckCircle2 size={13} /> Approve Award
                          </button>
                        )}
                        {row.status !== "PAID" && (
                          <button
                            disabled={!!busy}
                            className="button button-primary button-sm"
                            onClick={() => sync(row)}
                          >
                            <RefreshCw size={13} className={busy === row.id ? "spin-icon" : ""} />
                            {busy === row.id ? "Syncing…" : "PFMS DEMO sync"}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export function RRPage() {
  const [rows, setRows] = useState<RR[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState("");

  const refresh = async () => {
    setError("");
    try {
      setRows(await api<RR[]>("/rr"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "R&R records could not be loaded.");
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  async function update(row: RR) {
    setBusy(row.id);
    try {
      await api(`/rr/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "COMPLETED",
          benefitsDelivered: row.eligibleFamilies,
        }),
      });
      setMessage(`${row.caseReference} R&R completion recorded; all ${row.eligibleFamilies} eligible families delivered benefits.`);
      await refresh();
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
        description="Monitoring affected and displaced families, entitlement packages, and verified benefit delivery."
      />

      {message && <div className="login-note" style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}>{message}</div>}
      {error && <div className="login-note" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }}>{error}</div>}

      <div className="stat-grid">
        <Metric label="Affected Families" value={String(totals.affected)} />
        <Metric label="Displaced Families" value={String(totals.displaced)} />
        <Metric label="Eligible Families" value={String(totals.eligible)} />
        <Metric label="Benefits Delivered" value={`${totals.delivered} / ${totals.eligible}`} />
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
                <th>Displaced</th>
                <th>Eligible Families</th>
                <th>Benefit Delivery</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
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
                    <span style={{ color: row.benefitsDelivered >= row.eligibleFamilies ? "#16a34a" : "#2563eb", fontWeight: 700 }}>
                      {row.benefitsDelivered} / {row.eligibleFamilies}
                    </span>
                  </td>
                  <td><StatusBadge status={row.status} /></td>
                  <td>
                    {canUpdate() && row.status !== "COMPLETED" && (
                      <button
                        disabled={!!busy}
                        className="button button-primary button-sm"
                        onClick={() => update(row)}
                      >
                        <UsersRound size={13} />
                        {busy === row.id ? "Updating…" : "Deliver & Complete"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
