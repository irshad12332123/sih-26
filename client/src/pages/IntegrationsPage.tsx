import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { Alert, ErrorBlock, LoadingBlock } from "../components/ui";

export function IntegrationsPage() {
  const [systems, setSystems] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<string[]>([]);
  const [syncSummary, setSyncSummary] = useState<any | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [testingSystem, setTestingSystem] = useState("");

  const refresh = async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    try {
      const [sys, maps] = await Promise.all([
        api<any[]>("/integrations"),
        api<any[]>("/integrations/mappings"),
      ]);
      setSystems(sys || []);
      setMappings(maps || []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load integrations");
    } finally {
      setLoading(false);
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
      setSyncSummary(null);
      setSyncProgress(["Connecting to BhoomiRashi mock adapter…"]);

      const res = await api<any>("/integrations/bhoomirashi/sync", { method: "POST" });

      // Log lines are derived from the adapter response rather than asserted
      // up-front, so a failed sync never prints success ticks.
      setSyncProgress([
        "Connecting to BhoomiRashi mock adapter…",
        `✓ External project fetched: ${res.project?.externalProjectId || "BR-NH-2026-0042"} (${res.project?.name || "NH-44 Ambala Greenfield Corridor Package"})`,
        `✓ ${res.parcelReferences ?? 0} cadastral parcel references & spatial geometries reconciled`,
        "✓ External compensation, R&R entitlements, and site possession records synchronized",
        res.isNew
          ? "✓ New external project registered in the N-LAMS unified view"
          : "✓ Existing external project updated in place (idempotent re-sync)",
      ]);

      setSyncSummary({
        projectCode: res.project?.projectId || "NLAMS-EXT-00042",
        externalId: res.project?.externalProjectId || "BR-NH-2026-0042",
        parcelsCount: res.parcelReferences ?? 0,
        statusUpdates: res.statusUpdates ?? 0,
        errors: 0,
      });

      setMessage(
        res.message ||
          "BhoomiRashi synchronization completed. The external project is now visible in the N-LAMS unified view.",
      );
      await refresh({ silent: true });
    } catch (err) {
      setSyncProgress((p) => [...p, "✗ Synchronization aborted."]);
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleGenericSync = async (systemKey: string) => {
    if (testingSystem) return;
    try {
      setTestingSystem(systemKey);
      setError("");
      const res = await api<any>(`/integrations/${encodeURIComponent(systemKey)}/sync`, {
        method: "POST",
      });
      setMessage(res?.message || `${systemKey} mock synchronization completed.`);
      await refresh({ silent: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setTestingSystem("");
    }
  };

  const isBhoomiRashiSynced = mappings.some((m) => m.externalSystem === "BHOOMIRASHI");

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
            N-LAMS is an orchestration and monitoring layer. Authoritative systems (BhoomiRashi, State Land Records, PFMS) remain the source of record. N-LAMS consumes the information required to provide a unified national view without importing external users or recreating external internal workflows.
          </p>
        </div>
      </div>

      <Alert tone="success" message={message} onDismiss={() => setMessage("")} />
      <Alert tone="error" message={error} onDismiss={() => setError("")} />

      {/* Before / After Synchronization Indicator */}
      <div className="trust-banner" style={{ marginBottom: "20px" }}>
        <strong>DEMONSTRATION PRINCIPLE:</strong>
        <span>
          {isBhoomiRashiSynced
            ? "✓ POST-SYNCHRONIZATION STATE: N-LAMS has received the external BhoomiRashi project (BR-NH-2026-0042) and integrated its operational metadata."
            : "● PRE-SYNCHRONIZATION STATE: N-LAMS has no external BhoomiRashi project. Click 'SYNCHRONIZE WITH EXTERNAL SYSTEM' below to fetch external project metadata."}
        </span>
      </div>

      {/* BhoomiRashi Hero Sync Panel */}
      <div className="panel" style={{ padding: "20px", marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px", gap: "14px", flexWrap: "wrap" }}>
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
              Synchronizes national highway corridor project metadata, statutory stage progress, and affected cadastral parcel references.
            </p>
          </div>
          <button
            className="button button-primary"
            onClick={handleBhoomiRashiSync}
            disabled={syncing}
            style={{ fontWeight: 700 }}
          >
            <RefreshCw size={15} className={syncing ? "spin-icon" : ""} />
            {syncing ? "Synchronizing BhoomiRashi…" : "SYNCHRONIZE WITH EXTERNAL SYSTEM"}
          </button>
        </div>

        {/* Sync Progress / Summary */}
        {syncProgress.length > 0 && (
          <div style={{ background: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "12px" }}>
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
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "10px",
                  marginTop: "12px",
                  paddingTop: "12px",
                  borderTop: "1px solid #cbd5e1",
                }}
              >
                <div>
                  <span style={{ fontSize: "10px", color: "#64748b" }}>N-LAMS RECORD</span>
                  <strong style={{ display: "block", fontSize: "14px", color: "#1e293b" }}>{syncSummary.projectCode}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#64748b" }}>EXTERNAL ID</span>
                  <strong style={{ display: "block", fontSize: "14px", color: "#2563eb" }}>{syncSummary.externalId}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#64748b" }}>PARCELS SYNCED</span>
                  <strong style={{ display: "block", fontSize: "14px", color: "#16a34a" }}>{syncSummary.parcelsCount}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "10px", color: "#64748b" }}>INTEGRATION HEALTH</span>
                  <strong style={{ display: "block", fontSize: "14px", color: "#059669" }}>100% HEALTHY</strong>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Systems Grid */}
      {loading && systems.length === 0 && (
        <div className="panel" style={{ marginBottom: "24px" }}>
          <LoadingBlock label="Loading adapter health…" />
        </div>
      )}
      {!loading && error && systems.length === 0 && (
        <div className="panel" style={{ marginBottom: "24px" }}>
          <ErrorBlock message={error} onRetry={() => refresh()} />
        </div>
      )}

      <div className="integration-grid" style={{ marginBottom: "24px" }}>
        {systems.map((s) => (
          <div className="panel integration-card" key={s.system}>
            <div className="integration-card-top">
              <div className="external-logo">{(s.system || "?")[0]}</div>
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
                disabled={!!testingSystem}
              >
                <Database size={13} className={testingSystem === s.system ? "spin-icon" : ""} />
                {testingSystem === s.system ? "Testing…" : "Test Adapter"}
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
                <th>N-LAMS Unified Entity ID</th>
                <th>Entity Type</th>
                <th>Reconciliation Status</th>
                <th>Last Synced</th>
              </tr>
            </thead>
            <tbody>
              {mappings.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "20px", color: "#64748b" }}>
                    No external records synchronized yet. Click "SYNCHRONIZE WITH EXTERNAL SYSTEM" above to onboard BhoomiRashi projects.
                  </td>
                </tr>
              ) : (
                mappings.map((m) => (
                  <tr key={m.id}>
                    <td><strong>{m.externalSystem}</strong></td>
                    <td><span className="mono" style={{ color: "#2563eb", fontWeight: 600 }}>{m.externalId}</span></td>
                    <td><span className="mono">{m.localId}</span></td>
                    <td><span style={{ fontSize: "11px", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>{m.entityType}</span></td>
                    <td><span style={{ color: "#16a34a", fontSize: "11px", fontWeight: 700 }}>✓ {m.syncStatus}</span></td>
                    <td><small>{m.lastSyncedAt ? new Date(m.lastSyncedAt).toLocaleString() : "—"}</small></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
