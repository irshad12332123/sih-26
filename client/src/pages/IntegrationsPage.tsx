import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Database,
  Globe2,
  Layers,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { api } from "../api";
import { PageHeader } from "../components/common";

export function IntegrationsPage() {
  const [systems, setSystems] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string[]>([]);
  const [syncSummary, setSyncSummary] = useState<any | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = async () => {
    try {
      const [sys, maps] = await Promise.all([
        api<any[]>("/integrations"),
        api<any[]>("/integrations/mappings"),
      ]);
      setSystems(sys);
      setMappings(maps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load integrations");
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleBhoomiRashiSync = async () => {
    try {
      setSyncing(true);
      setError("");
      setMessage("");
      setSyncProgress(["Connecting to BhoomiRashi mock adapter…"]);

      await new Promise((r) => setTimeout(r, 400));
      setSyncProgress((p) => [...p, "✓ Projects fetched (42 national highway projects)"]);

      await new Promise((r) => setTimeout(r, 400));
      setSyncProgress((p) => [...p, "✓ Statutory project stages & land requirements reconciled"]);

      await new Promise((r) => setTimeout(r, 400));
      setSyncProgress((p) => [...p, "✓ 1,284 cadastral parcel references indexed"]);

      const res = await api<any>("/integrations/bhoomirashi/sync", { method: "POST" });

      setSyncSummary({
        projectsSynced: res.projectsSynced || 42,
        parcelReferences: res.parcelReferences || 1284,
        statusUpdates: res.statusUpdates || 312,
        errors: 0,
      });

      setMessage("BhoomiRashi synchronization completed successfully.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleGenericSync = async (systemKey: string) => {
    try {
      await api(`/integrations/${systemKey}/sync`, { method: "POST" });
      setMessage(`${systemKey} mock synchronization completed.`);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    }
  };

  return (
    <>
      <PageHeader
        title="Authoritative System Integrations"
        description="Connectors and adapters orchestrating external government systems of record while preserving their statutory authority."
      />

      {/* Hero Banner */}
      <div className="integration-hero">
        <div className="integration-hero-icon">
          <Globe2 size={26} />
        </div>
        <div>
          <div className="eyebrow">NATIONAL ADAPTER & MONITORING LAYER</div>
          <h2>BhoomiRashi & Authoritative Integrations</h2>
          <p>
            N-LAMS is an orchestration and monitoring layer. Authoritative systems (BhoomiRashi, State Land Records, PFMS) remain the source of record. All integrations are clearly labelled as <strong>MOCK / DEMO ADAPTERS</strong> for prototype demonstration.
          </p>
        </div>
      </div>

      {message && <div className="login-note" style={{ background: "#ecfdf5", borderColor: "#a7f3d0", color: "#065f46" }}>{message}</div>}
      {error && <div className="login-note" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }}>{error}</div>}

      {/* BhoomiRashi Hero Sync Panel */}
      <div className="panel" style={{ padding: "20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", margin: 0 }}>
                BhoomiRashi Portal Adapter
              </h3>
              <span className="connection mock" style={{ fontSize: "11px" }}>
                <i /> MOCK CONNECTED
              </span>
            </div>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0" }}>
              Synchronizes national highway corridor projects, statutory stage gazette notices (3A, 3D), and affected parcel references.
            </p>
          </div>
          <button
            className="button button-primary"
            onClick={handleBhoomiRashiSync}
            disabled={syncing}
          >
            <RefreshCw size={15} className={syncing ? "spin-icon" : ""} />
            {syncing ? "Synchronizing BhoomiRashi…" : "SYNC PROJECTS"}
          </button>
        </div>

        {/* Sync Progress / Summary */}
        {syncProgress.length > 0 && (
          <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
              SYNCHRONIZATION LOG:
            </div>
            {syncProgress.map((line, i) => (
              <div key={i} style={{ fontSize: "12px", color: "#334155", lineHeight: "1.6" }}>
                {line}
              </div>
            ))}

            {syncSummary && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "10px",
                  marginTop: "12px",
                  paddingTop: "12px",
                  borderTop: "1px solid #cbd5e1",
                }}
              >
                <div>
                  <span style={{ fontSize: "10px", color: "#64748b" }}>PROJECTS SYNCED</span>
                  <strong style={{ display: "block", fontSize: "16px", color: "#1e293b" }}>{syncSummary.projectsSynced}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#64748b" }}>PARCEL REFERENCES</span>
                  <strong style={{ display: "block", fontSize: "16px", color: "#2563eb" }}>{syncSummary.parcelReferences}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#64748b" }}>STATUS UPDATES</span>
                  <strong style={{ display: "block", fontSize: "16px", color: "#16a34a" }}>{syncSummary.statusUpdates}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#64748b" }}>ERRORS</span>
                  <strong style={{ display: "block", fontSize: "16px", color: "#059669" }}>{syncSummary.errors}</strong>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Systems Grid */}
      <div className="integration-grid" style={{ marginBottom: "24px" }}>
        {systems.map((s) => (
          <div className="panel integration-card" key={s.system}>
            <div className="integration-card-top">
              <div className="external-logo">{s.system[0]}</div>
              <span className="connection mock">
                <i />
                {s.label}
              </span>
            </div>
            <h3>{s.system}</h3>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0" }}>{s.description || s.adapter}</p>
            <div className="integration-card-footer">
              <span>
                <RefreshCw size={13} /> {s.lastSyncedAt ? new Date(s.lastSyncedAt).toLocaleTimeString() : "Synchronized"}
              </span>
              <button
                className="button button-secondary button-sm"
                onClick={() => handleGenericSync(s.system)}
              >
                <Database size={13} /> Test Adapter
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* External Mapping Inspection Table */}
      <div className="panel table-panel">
        <div className="table-top">
          <span>
            {mappings.length} External Authority Reference Mappings <small>· CROSS-SYSTEM RECONCILIATION</small>
          </span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>External System</th>
                <th>External Reference ID</th>
                <th>Local N-LAMS Entity ID</th>
                <th>Entity Type</th>
                <th>Reconciliation Status</th>
                <th>Last Synced</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.externalSystem}</strong></td>
                  <td><span className="mono" style={{ color: "#2563eb", fontWeight: 600 }}>{m.externalId}</span></td>
                  <td><span className="mono">{m.localId}</span></td>
                  <td><span style={{ fontSize: "11px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>{m.entityType}</span></td>
                  <td><span style={{ color: "#16a34a", fontSize: "11px", fontWeight: 700 }}>✓ {m.syncStatus}</span></td>
                  <td><small>{new Date(m.lastSyncedAt).toLocaleString()}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
