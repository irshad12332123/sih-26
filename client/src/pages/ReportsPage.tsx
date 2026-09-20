import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  CircleDollarSign,
  Download,
  FileCheck2,
  Layers,
  PieChart,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { api, csvDownload } from "../api";
import { PageHeader } from "../components/common";
import { Alert, ErrorBlock, LoadingBlock, TableLoadingRow } from "../components/ui";

export function ReportsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReports = async () => {
    try {
      setLoading(true);
      setRows((await api<any[]>("/reports/summary")) || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load summary analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    const onChange = () => fetchReports();
    window.addEventListener("nlams:data-changed", onChange);
    return () => window.removeEventListener("nlams:data-changed", onChange);
  }, []);

  const totalCases = rows.reduce((s, r) => s + (r.cases || 0), 0);
  const totalParcels = rows.reduce((s, r) => s + (r.parcels || 0), 0);
  const totalAssessed = rows.reduce((s, r) => s + (r.compensationAssessed || 0), 0);
  const totalPaid = rows.reduce((s, r) => s + (r.compensationPaid || 0), 0);
  const avgProgress = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + (r.progress || 0), 0) / rows.length) : 0;

  return (
    <>
      <PageHeader
        title="National Acquisition Reports & Analytics"
        description="Consolidated statutory milestone progress, financial compensation disbursement velocity, and R&R entitlement compliance."
      />

      <Alert tone="error" message={error} onDismiss={() => setError("")} />

      {/* KPI Cards */}
      <div className="stat-grid" style={{ marginBottom: "20px" }}>
        <div className="stat-card">
          <div className="stat-icon blue"><Activity size={18} /></div>
          <div className="stat-label">Active Projects</div>
          <strong className="stat-value">{rows.length}</strong>
          <span className="stat-delta">National & State Corridors</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><Layers size={18} /></div>
          <div className="stat-label">Total Cadastral Parcels</div>
          <strong className="stat-value">{totalParcels}</strong>
          <span className="stat-delta">{totalCases} Acquisition Cases</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><CircleDollarSign size={18} /></div>
          <div className="stat-label">DBT Disbursed</div>
          <strong className="stat-value">₹{(totalPaid / 10000000).toFixed(2)} Cr</strong>
          <span className="stat-delta">of ₹{(totalAssessed / 10000000).toFixed(2)} Cr Assessed</span>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><TrendingUp size={18} /></div>
          <div className="stat-label">Average Statutory Progress</div>
          <strong className="stat-value">{avgProgress}%</strong>
          <span className="stat-delta">Across all jurisdictions</span>
        </div>
      </div>

      {/* Progress Breakdown Visual */}
      <div className="panel" style={{ padding: "20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "15px", color: "#1e293b" }}>Project Milestone Completion</h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#64748b" }}>
              Percentage of statutory stages completed (Administrative Review through Site Possession Handover)
            </p>
          </div>
          <button
            className="button button-primary button-sm"
            onClick={() => csvDownload(rows, "nlams-progress-report.csv")}
            disabled={rows.length === 0}
          >
            <Download size={14} /> Export CSV Report
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {loading && rows.length === 0 ? (
            <LoadingBlock label="Loading milestone analytics…" />
          ) : error && rows.length === 0 ? (
            <ErrorBlock message={error} onRetry={fetchReports} />
          ) : rows.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px", color: "#64748b", fontSize: "12px" }}>
              No project milestone records in baseline state.
            </div>
          ) : (
            rows.map((r) => (
              <div key={r.projectId} style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <div>
                    <strong style={{ fontSize: "13px", color: "#1e293b" }}>{r.project}</strong>
                    <span className="mono" style={{ marginLeft: "8px", fontSize: "11px", color: "#64748b" }}>({r.projectId})</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "11px", color: "#64748b" }}>
                      {r.parcels} Parcels · Disbursed: ₹{(Number(r.compensationPaid || 0) / 100000).toFixed(1)}L
                    </span>
                    <strong style={{ fontSize: "13px", color: r.progress >= 80 ? "#16a34a" : "#2563eb" }}>
                      {r.progress}%
                    </strong>
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={{ height: "8px", width: "100%", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${Math.max(5, r.progress)}%`,
                      background: r.progress >= 80 ? "linear-gradient(90deg, #10b981, #059669)" : "linear-gradient(90deg, #3b82f6, #1d4ed8)",
                      borderRadius: "4px",
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detailed Analytics Table */}
      <section className="panel table-panel">
        <div className="table-top">
          <span>Detailed National Infrastructure Projects Summary</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Project Code</th>
                <th>Acquisition Cases</th>
                <th>Cadastral Parcels</th>
                <th>Statutory Progress</th>
                <th>Compensation Assessed</th>
                <th>Compensation Paid</th>
                <th>DBT Rate</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <TableLoadingRow colSpan={8} label="Loading project analytics…" />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                    No project analytics available in clean baseline state.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const dbtRate = r.compensationAssessed > 0 ? Math.round((r.compensationPaid / r.compensationAssessed) * 100) : 0;
                  return (
                    <tr key={r.projectId}>
                      <td><strong>{r.project}</strong></td>
                      <td><span className="mono" style={{ fontSize: "11px" }}>{r.projectId}</span></td>
                      <td>{r.cases}</td>
                      <td><strong>{r.parcels}</strong></td>
                      <td>
                        <span style={{ color: r.progress >= 80 ? "#16a34a" : "#2563eb", fontWeight: 700 }}>
                          {r.progress}%
                        </span>
                      </td>
                      <td>₹{Number(r.compensationAssessed || 0).toLocaleString("en-IN")}</td>
                      <td><strong style={{ color: "#16a34a" }}>₹{Number(r.compensationPaid || 0).toLocaleString("en-IN")}</strong></td>
                      <td>
                        <span style={{ fontSize: "11px", background: "#ecfdf5", color: "#065f46", padding: "2px 6px", borderRadius: "4px", fontWeight: 700 }}>
                          {dbtRate}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
