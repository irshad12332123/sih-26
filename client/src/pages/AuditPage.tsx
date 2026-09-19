import { useEffect, useState } from "react";
import {
  Activity,
  Code,
  Eye,
  Filter,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { api } from "../api";
import { PageHeader } from "../components/common";

export function AuditPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  useEffect(() => {
    async function loadAudit() {
      try {
        setLoading(true);
        const data = await api<any[]>("/audit");
        setRows(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load audit trail");
      } finally {
        setLoading(false);
      }
    }
    loadAudit();
  }, []);

  const filteredRows = rows.filter((r) => {
    const matchesAction = actionFilter === "ALL" || r.action.includes(actionFilter);
    const matchesSearch =
      r.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.actorId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.entityId && r.entityId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.entityType && r.entityType.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesAction && matchesSearch;
  });

  return (
    <>
      <PageHeader
        title="Immutable Audit & Mutation Trail"
        description="Tamper-evident, chronological event log capturing all state changes, statutory approvals, field verifications, and financial DBT disbursements."
      />

      {/* Trust Notice */}
      <div className="trust-banner" style={{ marginBottom: "20px" }}>
        <strong>IMMUTABLE APPEND-ONLY AUDIT LEDGER</strong>
        <span>
          Every administrative action, digital approval, and adapter reconciliation is recorded with cryptographic actor attribution.
        </span>
      </div>

      {error && <div className="login-note" style={{ background: "#fef2f2", borderColor: "#fecaca", color: "#991b1b" }}>{error}</div>}

      {/* Filter Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {["ALL", "PROJECT", "STAGE", "FIELD", "COMPENSATION", "PFMS", "POSSESSION", "DEMO"].map((cat) => (
            <button
              key={cat}
              className={`button button-sm ${actionFilter === cat ? "button-primary" : "button-secondary"}`}
              onClick={() => setActionFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div style={{ position: "relative", width: "260px" }}>
          <input
            type="text"
            placeholder="Search action, actor, entity…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

      {/* Audit Table */}
      <section className="panel table-panel">
        <div className="table-top">
          <span>{filteredRows.length} Recorded Mutation Events <small>· APPEND-ONLY TRAIL</small></span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Timestamp (UTC/IST)</th>
                <th>Action Identifier</th>
                <th>Authorized Actor</th>
                <th>Entity Target</th>
                <th>Details / Payload</th>
                <th>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "#64748b" }}>
                    No audit records match the current filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div>
                        <strong>{new Date(r.createdAt).toLocaleTimeString()}</strong>
                        <div style={{ fontSize: "10px", color: "#64748b" }}>{new Date(r.createdAt).toLocaleDateString()}</div>
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: r.action.includes("APPROVED")
                            ? "#ecfdf5"
                            : r.action.includes("CREATE")
                            ? "#eff6ff"
                            : r.action.includes("SYNC")
                            ? "#f5f3ff"
                            : "#f1f5f9",
                          color: r.action.includes("APPROVED")
                            ? "#065f46"
                            : r.action.includes("CREATE")
                            ? "#1e40af"
                            : r.action.includes("SYNC")
                            ? "#6b21a8"
                            : "#334155",
                        }}
                      >
                        {r.action}
                      </span>
                    </td>
                    <td>
                      <div>
                        <strong>{r.actorId}</strong>
                      </div>
                    </td>
                    <td>
                      <div>
                        <span className="mono" style={{ fontSize: "11px", fontWeight: 600 }}>{r.entityType}</span>
                        <div className="mono" style={{ fontSize: "10px", color: "#64748b" }}>{r.entityId}</div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "11px", color: "#475569" }}>
                        {r.payload?.remarks || r.payload?.reason || r.payload?.name || "Statutory mutation recorded"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="button button-secondary button-sm"
                        onClick={() => setSelectedEvent(r)}
                        style={{ fontSize: "11px" }}
                      >
                        <Code size={13} /> JSON
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* PAYLOAD INSPECTION MODAL */}
      {selectedEvent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "560px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              border: "1px solid #cbd5e1",
            }}
          >
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "15px", color: "#1e293b" }}>Audit Event Payload</h3>
                <span style={{ fontSize: "11px", color: "#64748b" }}>{selectedEvent.action} · {selectedEvent.id}</span>
              </div>
              <button onClick={() => setSelectedEvent(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "20px" }}>
              <pre
                style={{
                  background: "#0f172a",
                  color: "#38bdf8",
                  padding: "16px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  overflowX: "auto",
                  maxHeight: "360px",
                }}
              >
                {JSON.stringify(selectedEvent, null, 2)}
              </pre>
            </div>

            <div style={{ padding: "12px 20px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end" }}>
              <button className="button button-secondary button-sm" onClick={() => setSelectedEvent(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
